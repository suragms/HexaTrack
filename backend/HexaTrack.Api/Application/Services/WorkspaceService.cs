using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using HexaTrack.Api.Infrastructure.Repositories;

namespace HexaTrack.Api.Application.Services;

public interface IWorkspaceService
{
    Task<IReadOnlyCollection<WorkspaceDto>> ListAsync(CancellationToken cancellationToken);
    Task<WorkspaceDto> CreateAsync(CreateWorkspaceRequest request, CancellationToken cancellationToken);
    Task<WorkspaceDto> UpdateAsync(Guid id, UpdateWorkspaceRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class WorkspaceService(HexaTrackDbContext db, ICurrentUser currentUser, IUnitOfWork unitOfWork) : IWorkspaceService
{
    public async Task<IReadOnlyCollection<WorkspaceDto>> ListAsync(CancellationToken cancellationToken)
    {
        Guid uid = currentUser.UserId;
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == uid, cancellationToken);
        if (user == null) return Array.Empty<WorkspaceDto>();

        if (!user.IsSuperAdmin)
        {
            await EnsureWorkspaceMembershipAsync(user, cancellationToken);
        }

        IQueryable<Workspace> query = db.Workspaces.AsNoTracking();

        if (!user.IsSuperAdmin)
        {
            query = query.Where(w => w.OwnerUserId == uid || w.Members.Any(m => m.UserId == uid));
        }

        return await query
            .OrderByDescending(w => user.BranchId.HasValue && db.Branches.Any(b => b.Id == user.BranchId.Value && b.WorkspaceId == w.Id))
            .ThenByDescending(w => user.OrganizationRole == "Owner" && w.Mode == WorkspaceMode.Organization)
            .ThenByDescending(w => w.IsDefault)
            .ThenBy(w => w.Name)
            .Select(w => new WorkspaceDto(w.Id, w.Name, w.Type, w.Currency, w.IsDefault))
            .ToListAsync(cancellationToken);
    }

    private async Task EnsureWorkspaceMembershipAsync(User user, CancellationToken cancellationToken)
    {
        if (user.BranchId.HasValue)
        {
            Branch? branch = await db.Branches.SingleOrDefaultAsync(b => b.Id == user.BranchId.Value, cancellationToken);
            if (branch?.WorkspaceId is Guid branchWorkspaceId)
            {
                WorkspaceRole role = user.Mode == UserMode.BranchManager ? WorkspaceRole.Owner : WorkspaceRole.Member;
                await EnsureMemberAsync(branchWorkspaceId, user.Id, role, cancellationToken);
                await EnsureStarterFinanceDataAsync(branchWorkspaceId, user.Id, user.OrganizationId, user.BranchId, branch.Currency ?? "USD", cancellationToken);
                EnsureDefaultFeatureFlags(branchWorkspaceId);
                await db.SaveChangesAsync(cancellationToken);
                return;
            }

            if (branch is not null)
            {
                var branchWorkspace = new Workspace
                {
                    OwnerUserId = user.Id,
                    Name = $"{branch.Name} Workspace",
                    Type = WorkspaceType.Business,
                    Mode = WorkspaceMode.Branch,
                    OrganizationId = branch.OrganizationId,
                    Currency = branch.Currency ?? "USD",
                    IsDefault = false,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                };
                db.Workspaces.Add(branchWorkspace);
                branch.WorkspaceId = branchWorkspace.Id;
                db.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = branchWorkspace.Id, UserId = user.Id, Role = user.Mode == UserMode.BranchManager ? WorkspaceRole.Owner : WorkspaceRole.Member });
                await EnsureStarterFinanceDataAsync(branchWorkspace.Id, user.Id, branchWorkspace.OrganizationId, user.BranchId, branchWorkspace.Currency, cancellationToken);
                EnsureDefaultFeatureFlags(branchWorkspace.Id);
                await db.SaveChangesAsync(cancellationToken);
                return;
            }
        }

        if (user.OrganizationId.HasValue)
        {
            Workspace? orgWorkspace = await db.Workspaces
                .OrderByDescending(w => w.IsDefault)
                .FirstOrDefaultAsync(w => w.OrganizationId == user.OrganizationId.Value && w.Mode == WorkspaceMode.Organization, cancellationToken);

            if (orgWorkspace is null)
            {
                Organization? org = await db.Organizations.AsNoTracking()
                    .SingleOrDefaultAsync(o => o.Id == user.OrganizationId.Value, cancellationToken);
                orgWorkspace = new Workspace
                {
                    OwnerUserId = user.Id,
                    Name = org is null ? "Organization Workspace" : $"{org.Name} Workspace",
                    Type = WorkspaceType.Business,
                    Mode = WorkspaceMode.Organization,
                    OrganizationId = user.OrganizationId,
                    Currency = org?.BaseCurrency ?? "USD",
                    IsDefault = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                };
                db.Workspaces.Add(orgWorkspace);
            }

            await EnsureMemberAsync(orgWorkspace.Id, user.Id, user.OrganizationRole == "Owner" ? WorkspaceRole.Owner : WorkspaceRole.Member, cancellationToken);
            await EnsureStarterFinanceDataAsync(orgWorkspace.Id, user.Id, user.OrganizationId, null, orgWorkspace.Currency, cancellationToken);
            EnsureDefaultFeatureFlags(orgWorkspace.Id);
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        Workspace? personalWorkspace = await db.Workspaces
            .OrderByDescending(w => w.IsDefault)
            .FirstOrDefaultAsync(w => w.OwnerUserId == user.Id, cancellationToken);

        if (personalWorkspace is not null)
        {
            await EnsureMemberAsync(personalWorkspace.Id, user.Id, WorkspaceRole.Owner, cancellationToken);
            await EnsureStarterFinanceDataAsync(personalWorkspace.Id, user.Id, null, null, personalWorkspace.Currency, cancellationToken);
            EnsureDefaultFeatureFlags(personalWorkspace.Id);
            await db.SaveChangesAsync(cancellationToken);
            return;
        }

        var workspace = new Workspace
        {
            OwnerUserId = user.Id,
            Name = "Personal",
            Type = WorkspaceType.Personal,
            Mode = WorkspaceMode.Individual,
            Currency = "USD",
            IsDefault = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Workspaces.Add(workspace);
        db.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspace.Id, UserId = user.Id, Role = WorkspaceRole.Owner });
        await EnsureStarterFinanceDataAsync(workspace.Id, user.Id, null, null, workspace.Currency, cancellationToken);
        EnsureDefaultFeatureFlags(workspace.Id);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureMemberAsync(Guid workspaceId, Guid userId, WorkspaceRole role, CancellationToken cancellationToken)
    {
        WorkspaceMember? member = await db.WorkspaceMembers
            .SingleOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId, cancellationToken);
        if (member is null)
        {
            db.WorkspaceMembers.Add(new WorkspaceMember { WorkspaceId = workspaceId, UserId = userId, Role = role });
        }
        else if (role == WorkspaceRole.Owner && member.Role != WorkspaceRole.Owner)
        {
            member.Role = WorkspaceRole.Owner;
        }
    }

    private async Task EnsureStarterFinanceDataAsync(Guid workspaceId, Guid userId, Guid? organizationId, Guid? branchId, string currency, CancellationToken cancellationToken)
    {
        if (organizationId.HasValue)
        {
            await db.Accounts
                .Where(a => a.WorkspaceId == workspaceId && a.OrganizationId == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(a => a.OrganizationId, organizationId)
                    .SetProperty(a => a.BranchId, branchId), cancellationToken);

            await db.Categories
                .Where(c => c.WorkspaceId == workspaceId && c.OrganizationId == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.OrganizationId, organizationId)
                    .SetProperty(c => c.BranchId, branchId), cancellationToken);
        }

        bool hasAccounts = await db.Accounts.AnyAsync(a => a.WorkspaceId == workspaceId, cancellationToken);
        if (!hasAccounts)
        {
            db.Accounts.AddRange(
                new Account { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Primary Bank", Type = AccountType.Bank, Currency = currency, Balance = 0 },
                new Account { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Everyday Wallet", Type = AccountType.Wallet, Currency = currency, Balance = 0 },
                new Account { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Cash", Type = AccountType.Cash, Currency = currency, Balance = 0 },
                new Account { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Credit Card", Type = AccountType.Credit, Currency = currency, Balance = 0 });
        }

        bool hasCategories = await db.Categories.AnyAsync(c => c.WorkspaceId == workspaceId, cancellationToken);
        if (!hasCategories)
        {
            db.Categories.AddRange(
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Salary", Type = TransactionType.Income, Color = "#10b981", Icon = "Briefcase" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Interest", Type = TransactionType.Income, Color = "#14b8a6", Icon = "TrendingUp" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Food", Type = TransactionType.Expense, Color = "#f97316", Icon = "Utensils" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Transport", Type = TransactionType.Expense, Color = "#2563eb", Icon = "Bus" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Home", Type = TransactionType.Expense, Color = "#14b8a6", Icon = "Home" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Subscriptions", Type = TransactionType.Expense, Color = "#8b5cf6", Icon = "RefreshCw" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Health", Type = TransactionType.Expense, Color = "#ef4444", Icon = "HeartPulse" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Shopping", Type = TransactionType.Expense, Color = "#ec4899", Icon = "ShoppingBag" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Travel", Type = TransactionType.Expense, Color = "#0ea5e9", Icon = "Plane" },
                new Category { WorkspaceId = workspaceId, UserId = userId, OrganizationId = organizationId, BranchId = branchId, Name = "Utilities", Type = TransactionType.Expense, Color = "#64748b", Icon = "Zap" });
        }
    }

    private void EnsureDefaultFeatureFlags(Guid workspaceId)
    {
        string[] defaultFlags = ["Income", "Expenses", "Categories", "Analytics", "Notifications", "PWA"];
        foreach (string flag in defaultFlags)
        {
            bool exists = db.WorkspaceFeatureToggles.Any(f => f.WorkspaceId == workspaceId && f.FeatureKey == flag);
            if (!exists)
            {
                db.WorkspaceFeatureToggles.Add(new WorkspaceFeatureToggle
                {
                    WorkspaceId = workspaceId,
                    FeatureKey = flag,
                    IsEnabled = true,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
        }
    }

    public Task<WorkspaceDto> CreateAsync(CreateWorkspaceRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(ct =>
        {
            Guid uid = currentUser.UserId;
            string currency = request.Currency.Trim().ToUpperInvariant();
            var workspace = new Workspace
            {
                OwnerUserId = uid,
                Name = request.Name.Trim(),
                Type = request.Type,
                Currency = currency,
                IsDefault = false,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            db.Workspaces.Add(workspace);
            db.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = workspace.Id,
                UserId = uid,
                Role = WorkspaceRole.Owner
            });

            return Task.FromResult(new WorkspaceDto(workspace.Id, workspace.Name, workspace.Type, workspace.Currency, workspace.IsDefault));
        }, cancellationToken);

    public Task<WorkspaceDto> UpdateAsync(Guid id, UpdateWorkspaceRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            Workspace workspace = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == id && w.OwnerUserId == currentUser.UserId, ct)
                ?? throw new KeyNotFoundException("Workspace not found.");

            workspace.Name = request.Name.Trim();
            workspace.Currency = request.Currency.Trim().ToUpperInvariant();
            workspace.UpdatedAt = DateTimeOffset.UtcNow;

            return new WorkspaceDto(workspace.Id, workspace.Name, workspace.Type, workspace.Currency, workspace.IsDefault);
        }, cancellationToken);

    public Task DeleteAsync(Guid id, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            Workspace workspace = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == id && w.OwnerUserId == currentUser.UserId, ct)
                ?? throw new KeyNotFoundException("Workspace not found.");

            if (workspace.IsDefault)
            {
                throw new InvalidOperationException("Cannot delete the default workspace.");
            }

            int ownedCount = await db.Workspaces.CountAsync(w => w.OwnerUserId == currentUser.UserId, ct);
            if (ownedCount <= 1)
            {
                throw new InvalidOperationException("Cannot delete your only workspace.");
            }

            bool hasData =
                await db.Accounts.AnyAsync(a => a.WorkspaceId == id, ct) ||
                await db.Categories.AnyAsync(c => c.WorkspaceId == id, ct) ||
                await db.Transactions.AnyAsync(t => t.WorkspaceId == id, ct) ||
                await db.RecurringTransactions.AnyAsync(r => r.WorkspaceId == id, ct) ||
                await db.Tags.AnyAsync(t => t.WorkspaceId == id, ct);

            if (hasData)
            {
                throw new InvalidOperationException("Remove workspace data before deleting this workspace.");
            }

            db.Workspaces.Remove(workspace);
        }, cancellationToken);
}
