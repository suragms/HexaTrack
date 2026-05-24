using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.Common;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using HexaTrack.Api.Api;
using HexaTrack.Api.Api.Middleware;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Application.Services;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Application.Validators;
using HexaTrack.Api.Infrastructure;
using HexaTrack.Api.Infrastructure.Repositories;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

string postgresConnection = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");
string redisConnection = builder.Configuration.GetConnectionString("Redis")
    ?? throw new InvalidOperationException("ConnectionStrings:Redis is required.");

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<GoogleAuthOptions>(builder.Configuration.GetSection(GoogleAuthOptions.SectionName));
builder.Services.Configure<SuperAdminOptions>(builder.Configuration.GetSection(SuperAdminOptions.SectionName));
builder.Services.Configure<LoginThrottleOptions>(builder.Configuration.GetSection(LoginThrottleOptions.SectionName));
builder.Services.AddSingleton<ILoginThrottle, RedisLoginThrottle>();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

JwtOptions jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration is required.");

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddValidatorsFromAssemblyContaining<CreateOrganizationRequestValidator>();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.AddCors(options =>
{
    options.AddPolicy("HexaTrackFrontend", policy =>
    {
        string[] allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()
            ?? ["http://localhost:3000", "http://127.0.0.1:3000"];

        policy
            // Dev ergonomics: Next.js dev server may jump ports (3000/3002/3003...).
            // Allow any localhost/loopback origin in Development, and otherwise fall back
            // to the configured allowlist.
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin)) return false;
                if (!Uri.TryCreate(origin, UriKind.Absolute, out Uri? uri)) return false;

                if (builder.Environment.IsDevelopment() &&
                    (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host == "127.0.0.1"))
                {
                    return true;
                }

                if (uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContextPool<HexaTrackDbContext>(options =>
{
    options.UseNpgsql(postgresConnection, npgsql => npgsql.EnableRetryOnFailure());
    options.ConfigureWarnings(warnings =>
        warnings.Ignore(CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning));
});

builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
{
    // In dev we want the API to start even if Redis is temporarily down.
    // The multiplexer will keep retrying in the background.
    ConfigurationOptions options = ConfigurationOptions.Parse(redisConnection, ignoreUnknown: true);
    options.AbortOnConnectFail = false;
    options.ConnectRetry = Math.Max(options.ConnectRetry, 3);
    options.ConnectTimeout = Math.Max(options.ConnectTimeout, 5000);
    return ConnectionMultiplexer.Connect(options);
});

builder.Services.AddHangfire(configuration => configuration
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(postgresConnection)));
builder.Services.AddHangfireServer();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role,
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                string? sub = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!Guid.TryParse(sub, out Guid userId))
                {
                    context.Fail("Invalid token subject.");
                    return;
                }

                HexaTrackDbContext db = context.HttpContext.RequestServices.GetRequiredService<HexaTrackDbContext>();
                var row = await db.Users.AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.IsLocked, u.IsSuperAdmin })
                    .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

                if (row is null)
                {
                    context.Fail("User no longer exists.");
                    return;
                }

                if (row.IsLocked)
                {
                    context.Fail("Account locked.");
                    return;
                }

                bool jwtSuper = context.Principal?.IsInRole("SuperAdmin") ?? false;
                if (jwtSuper && !row.IsSuperAdmin)
                {
                    context.Fail("Super admin privileges were revoked. Sign in again.");
                }
            },
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdmin", policy =>
        policy.RequireAssertion(ctx =>
        {
            if (!ctx.User.IsInRole("SuperAdmin"))
            {
                return false;
            }

            Claim? c = ctx.User.FindFirst(HexaTrackClaims.IsSuperAdmin);
            if (c is null)
            {
                return true;
            }

            return string.Equals(c.Value, "true", StringComparison.OrdinalIgnoreCase);
        }));
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (ctx, _) =>
    {
        if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out TimeSpan retry))
        {
            ctx.HttpContext.Response.Headers.RetryAfter = ((int)retry.TotalSeconds).ToString();
        }

        ctx.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { error = "Too many requests. Slow down." });
    };

    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            ClientIpResolver.Resolve(httpContext) ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 45,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    options.AddPolicy("admin", httpContext =>
    {
        string partition = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? ClientIpResolver.Resolve(httpContext)
            ?? httpContext.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(
            partition,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
    });
});

builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped(typeof(IUserScopedRepository<>), typeof(UserScopedRepository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<ICurrentWorkspace, CurrentWorkspace>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IWorkspaceService, WorkspaceService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IRecurringTransactionService, RecurringTransactionService>();
builder.Services.AddScoped<IGroupExpenseService, GroupExpenseService>();
builder.Services.AddScoped<IReportsService, ReportsService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<IAdminAuditService, AdminAuditService>();
builder.Services.AddScoped<IAdminAlertsService, AdminAlertsService>();
builder.Services.AddScoped<IAdminUsersService, AdminUsersService>();
builder.Services.AddSingleton<IFeatureFlagChangeNotifier, FeatureFlagChangeNotifier>();
builder.Services.AddScoped<IAdminFeatureFlagsService, AdminFeatureFlagsService>();
builder.Services.AddScoped<IAdminGlobalSettingsService, AdminGlobalSettingsService>();
builder.Services.AddScoped<IAdminWorkspacesService, AdminWorkspacesService>();
builder.Services.AddScoped<IAdminOrganizationsService, AdminOrganizationsService>();
builder.Services.AddScoped<IAdminRoutesService, AdminRoutesService>();
builder.Services.AddScoped<IOwnerService, OwnerService>();
builder.Services.AddScoped<IAdminAnalyticsService, AdminAnalyticsService>();
builder.Services.AddScoped<IAdminAiUsageService, AdminAiUsageService>();
builder.Services.AddScoped<IAdminPricingService, AdminPricingService>();
builder.Services.AddScoped<IWorkspaceInviteService, WorkspaceInviteService>();

builder.Services.AddHostedService<SuperAdminBootstrapHostedService>();

var app = builder.Build();

app.UseForwardedHeaders();

// Automatically migrate database on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<HexaTrackDbContext>();
        if (context.Database.IsRelational())
        {
            await context.Database.MigrateAsync();
            
            // Ensure expected platform feature flags exist; values remain editable in Super Admin.
            var defaultFlags = new Dictionary<string, string>
            {
                ["EnableOrganizations"] = "true",
                ["EnableBranches"] = "true",
                ["EnableAI"] = "false",
                ["EnableAnalytics"] = "true",
                ["EnableBudgets"] = "true",
                ["EnableRecurringTransactions"] = "true",
                ["EnableInvoices"] = "false",
                ["EnablePayroll"] = "false",
                ["EnableInventory"] = "false",
                ["EnableAdvancedReports"] = "false",
                ["EnableNotifications"] = "true",
                ["EnablePWA"] = "true",
                ["EnableOfflineMode"] = "true",
                ["Income"] = "true",
                ["Expenses"] = "true",
                ["Reports"] = "true",
            };

            foreach (var (key, value) in defaultFlags)
            {
                bool exists = await context.Set<HexaTrack.Api.Domain.Entities.GlobalFeatureFlag>()
                    .AnyAsync(f => f.Key == key);
                if (!exists)
                {
                    context.Set<HexaTrack.Api.Domain.Entities.GlobalFeatureFlag>().Add(
                        new HexaTrack.Api.Domain.Entities.GlobalFeatureFlag
                        {
                            Key = key,
                            Value = value,
                            UpdatedAt = DateTimeOffset.UtcNow,
                        });
                }
            }

            await context.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during database initialization.");
    }
}

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHangfireDashboard("/jobs");
}

// app.UseHttpsRedirection();
app.UseCors("HexaTrackFrontend");
app.UseAuthentication();
app.UseMiddleware<WorkspaceContextMiddleware>();
app.UseAuthorization();
app.UseRateLimiter();
app.MapGet("/health", () => Results.Ok(new {
    status = "ok",
    time = DateTimeOffset.UtcNow
}));
app.MapGet("/api/health", async (HexaTrackDbContext db) =>
{
    try
    {
        bool canConnect = await db.Database.CanConnectAsync();
        if (!canConnect)
        {
            return Results.Json(new { status = "unhealthy", database = "disconnected", timestamp = DateTimeOffset.UtcNow }, statusCode: 503);
        }
        return Results.Ok(new { status = "healthy", database = "connected", timestamp = DateTimeOffset.UtcNow });
    }
    catch (Exception ex)
    {
        return Results.Json(new { status = "unhealthy", error = ex.Message, timestamp = DateTimeOffset.UtcNow }, statusCode: 503);
    }
});
app.MapControllers();

IRecurringJobManager recurringJobManager = app.Services.GetRequiredService<IRecurringJobManager>();
recurringJobManager.AddOrUpdate(
    "HexaTrack-recurring-transactions",
    Job.FromExpression<IRecurringTransactionService>(service => service.ProcessDueAsync(CancellationToken.None)),
    Cron.Hourly(),
    new RecurringJobOptions());

app.Run();

