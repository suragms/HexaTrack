using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure.Repositories;
using HexaTrack.Api.Infrastructure;

namespace HexaTrack.Api.Application.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken);
    Task<AuthMeResponse> GetMeAsync(Guid userId, CancellationToken cancellationToken);
    Task<AuthResponse> AcceptWorkspaceInviteAsync(InviteAcceptRequest request, CancellationToken cancellationToken);
}

public sealed class AuthService(
    IUserScopedRepository<User> users,
    IUserScopedRepository<Account> accounts,
    IUserScopedRepository<Category> categories,
    HexaTrackDbContext dbContext,
    IUnitOfWork unitOfWork,
    IOptions<JwtOptions> jwtOptions,
    IOptions<GoogleAuthOptions> googleOptions,
    IAdminAuditService adminAudit,
    IHttpContextAccessor httpContextAccessor,
    ILogger<AuthService> logger) : IAuthService
{
    public Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            string email = request.Email.Trim().ToLowerInvariant();
            if (await users.Query().AnyAsync(x => x.Email == email, ct))
            {
                throw new InvalidOperationException("Email is already registered.");
            }

            var user = new User
            {
                Email = email,
                DisplayName = request.DisplayName.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
            };

            await users.AddAsync(user, ct);
            await SeedStarterWorkspaceAsync(user.Id, ct);
            return CreateAuthResponse(user);
        }, cancellationToken);

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        string email = request.Email.Trim().ToLowerInvariant();
        User user = await users.Query().SingleOrDefaultAsync(x => x.Email == email, cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (user.IsLocked)
        {
            throw new UnauthorizedAccessException("Account locked.");
        }

        if (user.PasswordHash is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid credentials.");
        }

        AuthResponse response = CreateAuthResponse(user);
        string? ip = ClientIpResolver.Resolve(httpContextAccessor.HttpContext);
        logger.LogInformation(
            "Auth session issued provider=password userId={UserId} superAdmin={SuperAdmin} ip={ClientIp}",
            user.Id,
            user.IsSuperAdmin,
            ip ?? "unknown");
        if (user.IsSuperAdmin)
        {
            await adminAudit.LogAsync(user.Id, "admin.login", null, null, null, cancellationToken);
        }

        return response;
    }

    public async Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        GoogleJsonWebSignature.Payload payload = await GoogleJsonWebSignature.ValidateAsync(
            request.IdToken,
            new GoogleJsonWebSignature.ValidationSettings { Audience = [googleOptions.Value.ClientId] });

        string email = payload.Email.Trim().ToLowerInvariant();

        return await unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            User? user = await users.Query().SingleOrDefaultAsync(x => x.Email == email || x.GoogleSubject == payload.Subject, ct);
            if (user is not null && user.IsLocked)
            {
                throw new UnauthorizedAccessException("Account locked.");
            }

            if (user is null)
            {
                user = new User
                {
                    Email = email,
                    DisplayName = payload.Name ?? email,
                    GoogleSubject = payload.Subject
                };
                await users.AddAsync(user, ct);
                await SeedStarterWorkspaceAsync(user.Id, ct);
            }
            else if (user.GoogleSubject is null)
            {
                user.GoogleSubject = payload.Subject;
                users.Update(user);
            }

            AuthResponse response = CreateAuthResponse(user);
            string? ip = ClientIpResolver.Resolve(httpContextAccessor.HttpContext);
            logger.LogInformation(
                "Auth session issued provider=google userId={UserId} superAdmin={SuperAdmin} ip={ClientIp}",
                user.Id,
                user.IsSuperAdmin,
                ip ?? "unknown");
            if (user.IsSuperAdmin)
            {
                await adminAudit.LogAsync(user.Id, "admin.login", null, null, null, ct);
            }

            return response;
        }, cancellationToken);
    }

    private async Task SeedStarterWorkspaceAsync(Guid userId, CancellationToken cancellationToken)
    {
        var workspace = new Workspace
        {
            OwnerUserId = userId,
            Name = "Personal",
            Type = WorkspaceType.Personal,
            Currency = "USD",
            IsDefault = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Workspaces.Add(workspace);
        dbContext.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = userId,
            Role = WorkspaceRole.Owner
        });

        Guid workspaceId = workspace.Id;

        // Seeding default feature flags for the new workspace
        string[] defaultFlags = ["Income", "Expenses", "Categories", "Analytics", "Notifications", "PWA"];
        foreach (string flag in defaultFlags)
        {
            dbContext.WorkspaceFeatureToggles.Add(new WorkspaceFeatureToggle
            {
                WorkspaceId = workspaceId,
                FeatureKey = flag,
                IsEnabled = true,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        }

        Account[] starterAccounts =
        [
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Primary Bank", Type = AccountType.Bank, Currency = "USD", Balance = 0 },
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Everyday Wallet", Type = AccountType.Wallet, Currency = "USD", Balance = 0 },
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Cash", Type = AccountType.Cash, Currency = "USD", Balance = 0 },
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Credit Card", Type = AccountType.Credit, Currency = "USD", Balance = 0 }
        ];

        var salary = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Salary", Type = TransactionType.Income, Color = "#10b981", Icon = "Briefcase" };
        var freelance = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Freelance", Type = TransactionType.Income, Color = "#06b6d4", Icon = "Laptop" };
        var business = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Business", Type = TransactionType.Income, Color = "#3b82f6", Icon = "Store" };
        var investments = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Investments", Type = TransactionType.Income, Color = "#f59e0b", Icon = "TrendingUp" };
        var bonus = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Bonus", Type = TransactionType.Income, Color = "#a855f7", Icon = "Gift" };

        var food = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Food", Type = TransactionType.Expense, Color = "#f97316", Icon = "Utensils" };
        var transport = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Transport", Type = TransactionType.Expense, Color = "#2563eb", Icon = "Bus" };
        var bills = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Bills", Type = TransactionType.Expense, Color = "#ef4444", Icon = "Zap" };
        var shopping = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Shopping", Type = TransactionType.Expense, Color = "#ec4899", Icon = "ShoppingBag" };
        var entertainment = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, Name = "Entertainment", Type = TransactionType.Expense, Color = "#8b5cf6", Icon = "Film" };

        dbContext.Categories.AddRange([salary, freelance, business, investments, bonus, food, transport, bills, shopping, entertainment]);

        var restaurant = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = food.Id, Name = "Restaurant", Type = TransactionType.Expense, Color = "#f97316", Icon = "Utensils" };
        var cafe = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = food.Id, Name = "Cafe", Type = TransactionType.Expense, Color = "#f97316", Icon = "Coffee" };
        var groceries = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = food.Id, Name = "Groceries", Type = TransactionType.Expense, Color = "#f97316", Icon = "ShoppingCart" };

        var fuel = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = transport.Id, Name = "Fuel", Type = TransactionType.Expense, Color = "#2563eb", Icon = "Fuel" };
        var taxi = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = transport.Id, Name = "Taxi", Type = TransactionType.Expense, Color = "#2563eb", Icon = "Car" };
        var bus = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = transport.Id, Name = "Bus", Type = TransactionType.Expense, Color = "#2563eb", Icon = "Bus" };

        var electricity = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = bills.Id, Name = "Electricity", Type = TransactionType.Expense, Color = "#ef4444", Icon = "Zap" };
        var internet = new Category { Id = Guid.NewGuid(), WorkspaceId = workspaceId, UserId = userId, ParentCategoryId = bills.Id, Name = "Internet", Type = TransactionType.Expense, Color = "#ef4444", Icon = "Wifi" };

        dbContext.Categories.AddRange([restaurant, cafe, groceries, fuel, taxi, bus, electricity, internet]);

        foreach (Account account in starterAccounts)
        {
            await accounts.AddAsync(account, cancellationToken);
        }
    }

    public async Task<AuthMeResponse> GetMeAsync(Guid userId, CancellationToken cancellationToken)
    {
        User? user = await users.Query()
            .AsNoTracking()
            .Include(x => x.Branch)
            .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            throw new UnauthorizedAccessException("Session is no longer valid.");
        }

        if (user.IsLocked)
        {
            throw new UnauthorizedAccessException("Account locked.");
        }

        return new AuthMeResponse(new UserDto(user.Id, user.Email, user.DisplayName, user.Mode.ToString(), user.OrganizationId, user.BranchId, user.OrganizationRole, user.Branch?.Name, user.Department), user.IsSuperAdmin);
    }

    public Task<AuthResponse> AcceptWorkspaceInviteAsync(InviteAcceptRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            string hash = InviteTokenHasher.Hash(request.Token.Trim());
            WorkspaceInvite? inv = await dbContext.WorkspaceInvites
                .FirstOrDefaultAsync(x => x.TokenHash == hash && x.AcceptedAt == null, ct)
                ?? throw new InvalidOperationException("Invalid or expired invite.");

            if (inv.ExpiresAt < DateTimeOffset.UtcNow)
            {
                throw new InvalidOperationException("Invite expired.");
            }

            string email = inv.Email.Trim().ToLowerInvariant();
            if (await users.Query().AnyAsync(x => x.Email == email, ct))
            {
                throw new InvalidOperationException("An account already exists for this email. Sign in to accept the invite from your account.");
            }

            var user = new User
            {
                Email = email,
                DisplayName = email.Split('@')[0],
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            };
            await users.AddAsync(user, ct);

            dbContext.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = inv.WorkspaceId,
                UserId = user.Id,
                Role = inv.Role,
            });

            inv.AcceptedAt = DateTimeOffset.UtcNow;

            return CreateAuthResponse(user);
        }, cancellationToken);

    private AuthResponse CreateAuthResponse(User user)
    {
        JwtOptions options = jwtOptions.Value;
        DateTimeOffset expiresAt = DateTimeOffset.UtcNow.AddMinutes(options.ExpiresMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(HexaTrackClaims.IsSuperAdmin, user.IsSuperAdmin ? "true" : "false"),
        };
        if (user.IsSuperAdmin)
        {
            claims.Add(new Claim(ClaimTypes.Role, "SuperAdmin"));
        }
        if (user.OrganizationId.HasValue)
        {
            claims.Add(new Claim(HexaTrackClaims.OrganizationId, user.OrganizationId.Value.ToString()));
        }
        if (user.BranchId.HasValue)
        {
            claims.Add(new Claim(HexaTrackClaims.BranchId, user.BranchId.Value.ToString()));
        }
        claims.Add(new Claim(HexaTrackClaims.UserMode, user.Mode.ToString()));

        // Resolve primary or default accessible workspace to embed inside the JWT claims
        var defaultWorkspace = dbContext.Workspaces.AsNoTracking()
            .Where(w => w.OwnerUserId == user.Id || w.Members.Any(m => m.UserId == user.Id) || (user.OrganizationId != null && w.OrganizationId == user.OrganizationId))
            .OrderByDescending(w => w.IsDefault)
            .FirstOrDefault();

        if (defaultWorkspace != null)
        {
            claims.Add(new Claim(HexaTrackClaims.WorkspaceId, defaultWorkspace.Id.ToString()));
        }

        string userRole = user.IsSuperAdmin ? "SuperAdmin" : (user.OrganizationRole ?? "Individual");
        claims.Add(new Claim(HexaTrackClaims.Role, userRole));

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, new UserDto(user.Id, user.Email, user.DisplayName, user.Mode.ToString(), user.OrganizationId, user.BranchId, user.OrganizationRole, user.Branch?.Name, user.Department));
    }
}

