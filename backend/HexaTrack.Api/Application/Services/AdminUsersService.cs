using System.Net.Mail;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using HexaTrack.Api.Infrastructure.Repositories;

namespace HexaTrack.Api.Application.Services;

public interface IAdminUsersService
{
    Task<AdminUserListResult> ListAsync(AdminUserListFilter filter, int page, int pageSize, CancellationToken cancellationToken);
    Task<AdminCreateUserResponse> CreateAsync(AdminCreateUserRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task SetSuperAdminAsync(Guid targetUserId, bool isSuperAdmin, Guid actorUserId, CancellationToken cancellationToken);
    Task DeleteAsync(Guid targetUserId, Guid actorUserId, CancellationToken cancellationToken);
    Task SetLockedAsync(Guid targetUserId, bool locked, Guid actorUserId, CancellationToken cancellationToken);
    Task SetSubscriptionPlanAsync(Guid targetUserId, SubscriptionPlan plan, Guid actorUserId, CancellationToken cancellationToken);
    Task ResetPasswordAsync(Guid targetUserId, string newPassword, Guid actorUserId, CancellationToken cancellationToken);
}

public sealed class AdminUsersService(HexaTrackDbContext db, IAdminAuditService audit, IUnitOfWork unitOfWork) : IAdminUsersService
{
    public async Task<AdminUserListResult> ListAsync(AdminUserListFilter filter, int page, int pageSize, CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        IQueryable<User> q = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            string term = filter.Query.Trim().ToLowerInvariant();
            q = q.Where(x =>
                x.Email.ToLower().Contains(term) ||
                x.DisplayName.ToLower().Contains(term) ||
                (x.Department != null && x.Department.ToLower().Contains(term)) ||
                (x.Branch != null && x.Branch.Name.ToLower().Contains(term)));
        }

        if (filter.OrganizationUsersOnly == true)
        {
            q = q.Where(x => x.OrganizationId != null);
        }

        if (filter.IndividualUsersOnly == true)
        {
            q = q.Where(x => x.OrganizationId == null && !x.IsSuperAdmin);
        }

        if (filter.LockedOnly == true)
        {
            q = q.Where(x => x.IsLocked);
        }

        if (filter.SuperAdminOnly == true)
        {
            q = q.Where(x => x.IsSuperAdmin);
        }

        int total = await q.CountAsync(cancellationToken);
        var pageUsers = q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize);

        List<AdminUserListItemDto> items = await (
            from u in pageUsers
            join s in db.UserSubscriptions.Where(s => s.IsActive)
                on u.Id equals s.UserId into subs
            from sub in subs.DefaultIfEmpty()
            join o in db.Organizations
                on u.OrganizationId equals o.Id into orgs
            from org in orgs.DefaultIfEmpty()
            join b in db.Branches
                on u.BranchId equals b.Id into branches
            from branch in branches.DefaultIfEmpty()
            select new AdminUserListItemDto(
                u.Id,
                u.Email,
                u.DisplayName,
                u.CreatedAt,
                u.IsSuperAdmin,
                u.IsLocked,
                sub != null ? (SubscriptionPlan?)sub.Plan : null,
                u.OrganizationRole,
                u.Department,
                org != null ? org.Name : null,
                u.BranchId,
                branch != null ? branch.Name : null))
            .ToListAsync(cancellationToken);
        return new AdminUserListResult(items, page, pageSize, total);
    }

    public Task<AdminCreateUserResponse> CreateAsync(AdminCreateUserRequest request, Guid actorUserId, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            // Derive UserMode from request properties
            HexaTrack.Api.Domain.UserMode mode;
            if (request.IsSuperAdmin)
                mode = HexaTrack.Api.Domain.UserMode.SuperAdmin;
            else if (request.OrganizationId.HasValue && request.OrganizationRole?.Equals("Owner", StringComparison.OrdinalIgnoreCase) == true)
                mode = HexaTrack.Api.Domain.UserMode.OrganizationOwner;
            else if (request.OrganizationId.HasValue && request.BranchId.HasValue)
                mode = HexaTrack.Api.Domain.UserMode.BranchManager;
            else if (request.OrganizationId.HasValue)
                mode = HexaTrack.Api.Domain.UserMode.OrganizationStaff;
            else
                mode = HexaTrack.Api.Domain.UserMode.Individual;

            string fullName = (request.FullName ?? "Individual User").Trim();
            string workspaceName = request.WorkspaceName?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(workspaceName))
            {
                workspaceName = mode == HexaTrack.Api.Domain.UserMode.Individual
                    ? $"{fullName} Personal Workspace"
                    : $"{fullName}'s Ledger";
            }

            var validatedRequest = request with { WorkspaceName = workspaceName, FullName = fullName };
            ValidateAdminCreateRequest(validatedRequest);

            string email = validatedRequest.Email.Trim().ToLowerInvariant();

            if (await db.Users.AnyAsync(x => x.Email == email, ct))
            {
                throw new InvalidOperationException("Email is already registered.");
            }

            string currency = validatedRequest.Currency.Trim().ToUpperInvariant();
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(validatedRequest.Password);

            var user = new User
            {
                Email = email,
                DisplayName = fullName,
                PasswordHash = passwordHash,
                IsSuperAdmin = validatedRequest.IsSuperAdmin,
                Mode = mode,
                OrganizationId = mode == HexaTrack.Api.Domain.UserMode.Individual || mode == HexaTrack.Api.Domain.UserMode.SuperAdmin ? null : validatedRequest.OrganizationId,
                BranchId = mode == HexaTrack.Api.Domain.UserMode.Individual || mode == HexaTrack.Api.Domain.UserMode.SuperAdmin ? null : validatedRequest.BranchId,
                OrganizationRole = mode == HexaTrack.Api.Domain.UserMode.Individual || mode == HexaTrack.Api.Domain.UserMode.SuperAdmin ? null : validatedRequest.OrganizationRole,
                Department = mode == HexaTrack.Api.Domain.UserMode.Individual || mode == HexaTrack.Api.Domain.UserMode.SuperAdmin ? null : validatedRequest.Department,
            };

            db.Users.Add(user);
            WorkspaceRole membershipRole = validatedRequest.InitialWorkspaceRole ?? WorkspaceRole.Owner;
            AddStarterWorkspaceWithSeed(db, user.Id, workspaceName, validatedRequest.WorkspaceType, currency, membershipRole);
            await db.SaveChangesAsync(ct);

            string meta = JsonSerializer.Serialize(new
            {
                email = user.Email,
                workspace = workspaceName,
                isSuperAdmin = user.IsSuperAdmin,
                userMode = mode.ToString(),
                currency,
                workspaceRole = membershipRole.ToString(),
            });
            await audit.LogAsync(actorUserId, "user.create", "User", user.Id, meta, ct);

            return new AdminCreateUserResponse(user.Id, user.Email, user.DisplayName, user.IsSuperAdmin, validatedRequest.Password);
        }, cancellationToken);

    public async Task SetSuperAdminAsync(Guid targetUserId, bool isSuperAdmin, Guid actorUserId, CancellationToken cancellationToken)
    {
        User? user = await db.Users.SingleOrDefaultAsync(x => x.Id == targetUserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (targetUserId == actorUserId && user.IsSuperAdmin && !isSuperAdmin)
        {
            string denied = JsonSerializer.Serialize(new { email = user.Email, reason = "cannot_demote_self" });
            await audit.LogAsync(actorUserId, "user.superadmin.denied", "User", targetUserId, denied, cancellationToken);
            throw new InvalidOperationException("Cannot remove your own super-admin role.");
        }

        if (user.IsSuperAdmin == isSuperAdmin)
        {
            return;
        }

        if (!isSuperAdmin && user.IsSuperAdmin)
        {
            bool anotherExists = await db.Users.AnyAsync(x => x.IsSuperAdmin && x.Id != targetUserId, cancellationToken);
            if (!anotherExists)
            {
                string denied = JsonSerializer.Serialize(new { email = user.Email, reason = "last_super_admin" });
                await audit.LogAsync(actorUserId, "user.superadmin.denied", "User", targetUserId, denied, cancellationToken);
                throw new InvalidOperationException("Cannot remove the last super admin.");
            }
        }

        user.IsSuperAdmin = isSuperAdmin;
        await db.SaveChangesAsync(cancellationToken);

        string meta = JsonSerializer.Serialize(new { email = user.Email, isSuperAdmin });
        string action = isSuperAdmin ? "superadmin.promote" : "superadmin.demote";
        await audit.LogAsync(actorUserId, action, "User", targetUserId, meta, cancellationToken);
    }

    public async Task DeleteAsync(Guid targetUserId, Guid actorUserId, CancellationToken cancellationToken)
    {
        if (targetUserId == actorUserId)
        {
            string denied = JsonSerializer.Serialize(new { reason = "cannot_delete_self" });
            await audit.LogAsync(actorUserId, "user.delete.denied", "User", targetUserId, denied, cancellationToken);
            throw new InvalidOperationException("Cannot delete your own account.");
        }

        User? user = await db.Users.SingleOrDefaultAsync(x => x.Id == targetUserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (user.IsSuperAdmin)
        {
            string denied = JsonSerializer.Serialize(new { email = user.Email, reason = "cannot_delete_superadmin" });
            await audit.LogAsync(actorUserId, "user.delete.denied", "User", targetUserId, denied, cancellationToken);
            throw new InvalidOperationException("Cannot delete a super-admin account.");
        }

        if (await db.Workspaces.AnyAsync(w => w.OwnerUserId == targetUserId, cancellationToken))
        {
            string denied = JsonSerializer.Serialize(new { email = user.Email, reason = "owns_workspaces" });
            await audit.LogAsync(actorUserId, "user.delete.denied", "User", targetUserId, denied, cancellationToken);
            throw new InvalidOperationException("Cannot delete a user who owns workspaces. Transfer or delete those workspaces first.");
        }

        if (await db.ExpenseGroups.AnyAsync(g => g.OwnerUserId == targetUserId, cancellationToken))
        {
            string denied = JsonSerializer.Serialize(new { email = user.Email, reason = "owns_expense_groups" });
            await audit.LogAsync(actorUserId, "user.delete.denied", "User", targetUserId, denied, cancellationToken);
            throw new InvalidOperationException("Cannot delete a user who owns expense groups.");
        }

        string email = user.Email;
        user.DeletedAt = DateTimeOffset.UtcNow;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        user.IsLocked = true;
        await db.SaveChangesAsync(cancellationToken);

        string meta = JsonSerializer.Serialize(new { email });
        await audit.LogAsync(actorUserId, "user.delete", "User", targetUserId, meta, cancellationToken);
    }

    public async Task SetLockedAsync(Guid targetUserId, bool locked, Guid actorUserId, CancellationToken cancellationToken)
    {
        User? user = await db.Users.SingleOrDefaultAsync(x => x.Id == targetUserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");
        if (user.IsSuperAdmin && locked)
        {
            throw new InvalidOperationException("Cannot lock a super-admin account.");
        }

        user.IsLocked = locked;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, locked ? "user.lock" : "user.unlock", "User", targetUserId, null, cancellationToken);
    }

    public async Task ResetPasswordAsync(Guid targetUserId, string newPassword, Guid actorUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
        {
            throw new InvalidOperationException("Password must be at least 8 characters.");
        }

        User? user = await db.Users.SingleOrDefaultAsync(x => x.Id == targetUserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        string meta = JsonSerializer.Serialize(new { email = user.Email });
        await audit.LogAsync(actorUserId, "user.password_reset", "User", targetUserId, meta, cancellationToken);
    }

    public async Task SetSubscriptionPlanAsync(Guid targetUserId, SubscriptionPlan plan, Guid actorUserId, CancellationToken cancellationToken)
    {
        User? user = await db.Users.SingleOrDefaultAsync(x => x.Id == targetUserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        UserSubscription? subscription = await db.UserSubscriptions.SingleOrDefaultAsync(x => x.UserId == targetUserId, cancellationToken);
        if (subscription is null)
        {
            subscription = new UserSubscription
            {
                UserId = targetUserId,
                Plan = plan,
                IsActive = true,
                CurrentPeriodEndsAt = DateTimeOffset.UtcNow.AddYears(10),
            };
            db.UserSubscriptions.Add(subscription);
        }
        else
        {
            subscription.Plan = plan;
            subscription.IsActive = true;
        }

        await db.SaveChangesAsync(cancellationToken);

        string meta = JsonSerializer.Serialize(new { plan = plan.ToString(), email = user.Email });
        await audit.LogAsync(actorUserId, "subscription.change", "User", targetUserId, meta, cancellationToken);
    }

    private static void ValidateAdminCreateRequest(AdminCreateUserRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new InvalidOperationException("Email is required.");
        }

        string rawEmail = request.Email.Trim();
        if (rawEmail.Length > 320)
        {
            throw new InvalidOperationException("Email is too long.");
        }

        try
        {
            _ = new MailAddress(rawEmail);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("Invalid email address.");
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            throw new InvalidOperationException("Password must be at least 8 characters.");
        }

        string ws = request.WorkspaceName?.Trim() ?? "";
        if (ws.Length == 0)
        {
            throw new InvalidOperationException("Workspace name is required.");
        }

        if (ws.Length > 120)
        {
            throw new InvalidOperationException("Workspace name is too long.");
        }

        string cur = request.Currency?.Trim().ToUpperInvariant() ?? "";
        string[] allowed = ["USD", "INR", "EUR", "AED"];
        if (cur.Length != 3 || Array.IndexOf(allowed, cur) < 0)
        {
            throw new InvalidOperationException("Currency must be USD, INR, EUR, or AED.");
        }
    }

    /// <summary>Adds default workspace, owner membership, starter accounts and categories. Caller must call <c>SaveChangesAsync</c>.</summary>
    private static void AddStarterWorkspaceWithSeed(
        HexaTrackDbContext dbContext,
        Guid userId,
        string workspaceName,
        WorkspaceType workspaceType,
        string currency,
        WorkspaceRole membershipRole)
    {
        var workspace = new Workspace
        {
            OwnerUserId = userId,
            Name = workspaceName,
            Type = workspaceType,
            Currency = currency,
            IsDefault = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Workspaces.Add(workspace);

        dbContext.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = userId,
            Role = membershipRole,
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
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Primary Bank", Type = AccountType.Bank, Currency = currency, Balance = 0 },
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Everyday Wallet", Type = AccountType.Wallet, Currency = currency, Balance = 0 },
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Cash", Type = AccountType.Cash, Currency = currency, Balance = 0 },
            new() { WorkspaceId = workspaceId, UserId = userId, Name = "Credit Card", Type = AccountType.Credit, Currency = currency, Balance = 0 }
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

        dbContext.Accounts.AddRange(starterAccounts);
    }

    private async Task RemoveUserRelatedDataAsync(Guid userId, CancellationToken cancellationToken)
    {
        await db.TransactionTags.Where(tt => db.Transactions.Any(t => t.Id == tt.TransactionId && t.UserId == userId)).ExecuteDeleteAsync(cancellationToken);
        await db.Transactions.Where(t => t.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.RecurringTransactions.Where(t => t.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.AccountTransfers.Where(t => t.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Accounts.Where(a => a.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Categories.Where(c => c.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Tags.Where(t => t.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.WorkspaceMembers.Where(m => m.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.WorkspaceInvites.Where(i => i.InvitedByUserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.UserSubscriptions.Where(s => s.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.AiUsageDaily.Where(a => a.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.BackupJobs.Where(b => b.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
