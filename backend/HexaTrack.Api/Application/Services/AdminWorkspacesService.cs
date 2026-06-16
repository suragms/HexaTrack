using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;

namespace HexaTrack.Api.Application.Services;

public interface IAdminWorkspacesService
{
    Task<AdminWorkspaceListResult> ListAsync(string? query, int page, int pageSize, CancellationToken cancellationToken);
    Task<AdminWorkspaceListItemDto> CreateAsync(AdminCreateWorkspaceRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task RepairOwnerAccessAsync(Guid workspaceId, Guid actorUserId, CancellationToken cancellationToken);
    Task AssignUserAsync(Guid workspaceId, AdminWorkspaceMemberRequest request, Guid actorUserId, CancellationToken cancellationToken);
    Task ChangeRoleAsync(Guid workspaceId, Guid userId, WorkspaceRole role, Guid actorUserId, CancellationToken cancellationToken);
    Task RemoveUserAsync(Guid workspaceId, Guid userId, Guid actorUserId, CancellationToken cancellationToken);
    Task DeleteWorkspaceAsync(Guid workspaceId, Guid actorUserId, CancellationToken cancellationToken);
    Task ReassignUserWorkspaceAsync(Guid userId, Guid sourceWorkspaceId, Guid targetWorkspaceId, Guid actorUserId, CancellationToken ct);
}

public sealed class AdminWorkspacesService(HexaTrackDbContext db, IAdminAuditService audit) : IAdminWorkspacesService
{
    public async Task<AdminWorkspaceListResult> ListAsync(string? query, int page, int pageSize, CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        IQueryable<Workspace> baseQuery = db.Workspaces.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query))
        {
            string term = query.Trim().ToLowerInvariant();
            baseQuery = baseQuery.Where(w =>
                w.Name.ToLower().Contains(term)
                || db.Users.Any(u => u.Id == w.OwnerUserId && u.Email.ToLower().Contains(term)));
        }

        int total = await baseQuery.CountAsync(cancellationToken);

        List<AdminWorkspaceListItemDto> items = await (
            from w in baseQuery
            join u in db.Users.AsNoTracking() on w.OwnerUserId equals u.Id
            orderby w.CreatedAt descending
            select new AdminWorkspaceListItemDto(
                w.Id,
                w.Name,
                w.Type,
                w.OwnerUserId,
                u.Email,
                w.CreatedAt,
                db.WorkspaceMembers.Count(m => m.WorkspaceId == w.Id),
                db.UserSubscriptions
                    .Where(s => s.UserId == u.Id)
                    .Select(s => (SubscriptionPlan?)s.Plan)
                    .FirstOrDefault()))
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new AdminWorkspaceListResult(items, page, pageSize, total);
    }

    public async Task<AdminWorkspaceListItemDto> CreateAsync(AdminCreateWorkspaceRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120)
        {
            throw new InvalidOperationException("Workspace name is required and must be 120 characters or fewer.");
        }

        string currency = request.Currency.Trim().ToUpperInvariant();
        if (currency.Length != 3)
        {
            throw new InvalidOperationException("Currency must be a three-letter ISO code.");
        }

        User owner = await db.Users.SingleOrDefaultAsync(u => u.Id == request.OwnerUserId, cancellationToken)
            ?? throw new KeyNotFoundException("Owner user not found.");

        if (request.OrganizationId.HasValue)
        {
            bool orgExists = await db.Organizations.AnyAsync(o => o.Id == request.OrganizationId.Value, cancellationToken);
            if (!orgExists)
            {
                throw new KeyNotFoundException("Organization not found.");
            }
        }

        var workspace = new Workspace
        {
            OwnerUserId = owner.Id,
            Name = request.Name.Trim(),
            Type = request.Type,
            Mode = request.Mode,
            Currency = currency,
            OrganizationId = request.OrganizationId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Workspaces.Add(workspace);
        db.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId = owner.Id,
            Role = WorkspaceRole.Owner,
        });

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "workspace.create", "Workspace", workspace.Id,
            JsonSerializer.Serialize(new { owner.Email, workspace.Name, workspace.Type, workspace.Mode, workspace.OrganizationId }), cancellationToken);

        return new AdminWorkspaceListItemDto(workspace.Id, workspace.Name, workspace.Type, owner.Id, owner.Email, workspace.CreatedAt, 1, null);
    }

    public async Task RepairOwnerAccessAsync(Guid workspaceId, Guid actorUserId, CancellationToken cancellationToken)
    {
        Workspace workspace = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == workspaceId, cancellationToken)
            ?? throw new KeyNotFoundException("Workspace not found.");

        WorkspaceMember? member = await db.WorkspaceMembers
            .SingleOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == workspace.OwnerUserId, cancellationToken);

        if (member is null)
        {
            db.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = workspace.Id,
                UserId = workspace.OwnerUserId,
                Role = WorkspaceRole.Owner,
            });
        }
        else
        {
            member.Role = WorkspaceRole.Owner;
        }

        workspace.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "workspace.repair_owner_access", "Workspace", workspace.Id, null, cancellationToken);
    }

    public async Task AssignUserAsync(Guid workspaceId, AdminWorkspaceMemberRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        bool workspaceExists = await db.Workspaces.AnyAsync(w => w.Id == workspaceId, cancellationToken);
        if (!workspaceExists)
        {
            throw new KeyNotFoundException("Workspace not found.");
        }

        bool userExists = await db.Users.AnyAsync(u => u.Id == request.UserId, cancellationToken);
        if (!userExists)
        {
            throw new KeyNotFoundException("User not found.");
        }

        WorkspaceMember? member = await db.WorkspaceMembers
            .SingleOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == request.UserId, cancellationToken);

        if (member is null)
        {
            db.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = workspaceId,
                UserId = request.UserId,
                Role = request.Role,
            });
        }
        else
        {
            member.Role = request.Role;
        }

        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "workspace.user_assign", "Workspace", workspaceId,
            JsonSerializer.Serialize(new { request.UserId, role = request.Role.ToString() }), cancellationToken);
    }

    public async Task ChangeRoleAsync(Guid workspaceId, Guid userId, WorkspaceRole role, Guid actorUserId, CancellationToken cancellationToken)
    {
        WorkspaceMember member = await db.WorkspaceMembers
            .SingleOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Workspace membership not found.");

        member.Role = role;
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "workspace.role_change", "Workspace", workspaceId,
            JsonSerializer.Serialize(new { userId, role = role.ToString() }), cancellationToken);
    }

    public async Task RemoveUserAsync(Guid workspaceId, Guid userId, Guid actorUserId, CancellationToken cancellationToken)
    {
        Workspace workspace = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == workspaceId, cancellationToken)
            ?? throw new KeyNotFoundException("Workspace not found.");

        if (workspace.OwnerUserId == userId)
        {
            throw new InvalidOperationException("Cannot remove the workspace owner. Reassign ownership before removing this user.");
        }

        WorkspaceMember member = await db.WorkspaceMembers
            .SingleOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Workspace membership not found.");

        db.WorkspaceMembers.Remove(member);
        await db.SaveChangesAsync(cancellationToken);
        await audit.LogAsync(actorUserId, "workspace.user_remove", "Workspace", workspaceId,
            JsonSerializer.Serialize(new { userId }), cancellationToken);
    }

    public async Task DeleteWorkspaceAsync(Guid workspaceId, Guid actorUserId, CancellationToken cancellationToken)
    {
        Workspace workspace = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == workspaceId, cancellationToken)
            ?? throw new KeyNotFoundException("Workspace not found.");

        // 1. Set WorkspaceId to null for any referencing Branches
        var branches = await db.Branches.Where(b => b.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        foreach (var branch in branches)
        {
            branch.WorkspaceId = null;
        }

        // 2. Remove workspace feature toggles
        var toggles = await db.WorkspaceFeatureToggles.Where(t => t.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.WorkspaceFeatureToggles.RemoveRange(toggles);

        // 3. Remove workspace invites
        var invites = await db.WorkspaceInvites.Where(i => i.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.WorkspaceInvites.RemoveRange(invites);

        // 4. Remove transactions
        var transactions = await db.Transactions.Where(t => t.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.Transactions.RemoveRange(transactions);

        // 5. Remove recurring transactions
        var recurring = await db.RecurringTransactions.Where(r => r.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.RecurringTransactions.RemoveRange(recurring);

        // 6. Remove tags
        var tags = await db.Tags.Where(t => t.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.Tags.RemoveRange(tags);

        // 7. Remove categories
        var categories = await db.Categories.Where(c => c.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.Categories.RemoveRange(categories);

        // 8. Remove accounts
        var accounts = await db.Accounts.Where(a => a.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.Accounts.RemoveRange(accounts);

        // 9. Remove members
        var members = await db.WorkspaceMembers.Where(m => m.WorkspaceId == workspaceId).ToListAsync(cancellationToken);
        db.WorkspaceMembers.RemoveRange(members);

        // 10. Remove workspace itself
        db.Workspaces.Remove(workspace);

        await db.SaveChangesAsync(cancellationToken);

        // Log audit
        await audit.LogAsync(actorUserId, "workspace.delete", "Workspace", workspaceId,
            JsonSerializer.Serialize(new { workspace.Name, workspace.Type, workspace.OwnerUserId }), cancellationToken);
    }

    public async Task ReassignUserWorkspaceAsync(Guid userId, Guid sourceWorkspaceId, Guid targetWorkspaceId, Guid actorUserId, CancellationToken ct)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("User not found.");

        var sourceWorkspace = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == sourceWorkspaceId, ct)
            ?? throw new KeyNotFoundException("Source workspace not found.");

        var targetWorkspace = await db.Workspaces.SingleOrDefaultAsync(w => w.Id == targetWorkspaceId, ct)
            ?? throw new KeyNotFoundException("Target workspace not found.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        // 1. Update workspace membership role mappings.
        var sourceMembership = await db.WorkspaceMembers
            .SingleOrDefaultAsync(m => m.WorkspaceId == sourceWorkspaceId && m.UserId == userId, ct);

        WorkspaceRole resolvedRole = WorkspaceRole.Member;
        if (sourceMembership != null)
        {
            resolvedRole = sourceMembership.Role;
            db.WorkspaceMembers.Remove(sourceMembership);
        }

        var targetMembership = await db.WorkspaceMembers
            .SingleOrDefaultAsync(m => m.WorkspaceId == targetWorkspaceId && m.UserId == userId, ct);

        if (targetMembership == null)
        {
            db.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = targetWorkspaceId,
                UserId = userId,
                Role = resolvedRole
            });
        }

        // 2. Load all user transactions in sourceWorkspaceId.
        var userTransactions = await db.Transactions
            .Where(t => t.WorkspaceId == sourceWorkspaceId && t.UserId == userId)
            .ToListAsync(ct);

        // 3. Remap accounts.
        var sourceAccountIds = userTransactions.Select(t => t.AccountId).Distinct().ToList();
        var sourceAccounts = await db.Accounts
            .Where(a => sourceAccountIds.Contains(a.Id) && a.WorkspaceId == sourceWorkspaceId)
            .ToListAsync(ct);

        var targetAccounts = await db.Accounts
            .Where(a => a.WorkspaceId == targetWorkspaceId)
            .ToListAsync(ct);

        var accountMapping = new Dictionary<Guid, Guid>();

        Guid? targetOrgId = targetWorkspace.OrganizationId;
        Guid? targetBranchId = null;
        if (targetWorkspace.Mode == WorkspaceMode.Branch)
        {
            var branchInfo = await db.Branches
                .Where(b => b.WorkspaceId == targetWorkspaceId)
                .Select(b => new { b.Id, b.OrganizationId })
                .FirstOrDefaultAsync(ct);
            if (branchInfo != null)
            {
                targetOrgId = branchInfo.OrganizationId;
                targetBranchId = branchInfo.Id;
            }
        }

        foreach (var srcAcc in sourceAccounts)
        {
            var match = targetAccounts.FirstOrDefault(tAcc =>
                string.Equals(tAcc.Name, srcAcc.Name, StringComparison.OrdinalIgnoreCase) &&
                tAcc.Type == srcAcc.Type &&
                string.Equals(tAcc.Currency, srcAcc.Currency, StringComparison.OrdinalIgnoreCase));

            if (match != null)
            {
                accountMapping[srcAcc.Id] = match.Id;
            }
            else
            {
                var newAcc = new Account
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = targetWorkspaceId,
                    OrganizationId = targetOrgId,
                    BranchId = targetBranchId,
                    UserId = userId,
                    Name = srcAcc.Name,
                    Type = srcAcc.Type,
                    Currency = srcAcc.Currency,
                    Balance = 0,
                    IsArchived = srcAcc.IsArchived,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                db.Accounts.Add(newAcc);
                targetAccounts.Add(newAcc);
                accountMapping[srcAcc.Id] = newAcc.Id;
            }
        }

        // 4. Remap categories recursively.
        var sourceCategories = await db.Categories
            .Where(c => c.WorkspaceId == sourceWorkspaceId)
            .ToListAsync(ct);

        var targetCategories = await db.Categories
            .Where(c => c.WorkspaceId == targetWorkspaceId)
            .ToListAsync(ct);

        var categoryMapping = new Dictionary<Guid, Guid>();

        Guid GetOrMapCategory(Guid srcCatId)
        {
            if (categoryMapping.TryGetValue(srcCatId, out Guid targetId))
            {
                return targetId;
            }

            var srcCat = sourceCategories.FirstOrDefault(c => c.Id == srcCatId);
            if (srcCat == null)
            {
                return srcCatId;
            }

            Guid? targetParentId = null;
            if (srcCat.ParentCategoryId.HasValue)
            {
                targetParentId = GetOrMapCategory(srcCat.ParentCategoryId.Value);
            }

            var match = targetCategories.FirstOrDefault(tCat =>
                string.Equals(tCat.Name, srcCat.Name, StringComparison.OrdinalIgnoreCase) &&
                tCat.Type == srcCat.Type &&
                tCat.ParentCategoryId == targetParentId);

            if (match != null)
            {
                categoryMapping[srcCatId] = match.Id;
                return match.Id;
            }
            else
            {
                var newCat = new Category
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = targetWorkspaceId,
                    UserId = userId,
                    OrganizationId = targetOrgId,
                    BranchId = targetBranchId,
                    Name = srcCat.Name,
                    Type = srcCat.Type,
                    Icon = srcCat.Icon,
                    Color = srcCat.Color,
                    ParentCategoryId = targetParentId,
                    IsArchived = srcCat.IsArchived
                };
                db.Categories.Add(newCat);
                targetCategories.Add(newCat);
                categoryMapping[srcCatId] = newCat.Id;
                return newCat.Id;
            }
        }

        foreach (var t in userTransactions)
        {
            GetOrMapCategory(t.CategoryId);
        }

        // 5. Remap transaction tags.
        var transactionIds = userTransactions.Select(t => t.Id).ToList();
        var sourceTxTags = await db.TransactionTags
            .Include(tt => tt.Tag)
            .Where(tt => transactionIds.Contains(tt.TransactionId))
            .ToListAsync(ct);

        var targetTags = await db.Tags
            .Where(t => t.WorkspaceId == targetWorkspaceId)
            .ToListAsync(ct);

        var tagMapping = new Dictionary<Guid, Guid>();

        foreach (var srcTxTag in sourceTxTags)
        {
            var srcTag = srcTxTag.Tag;
            if (srcTag == null) continue;

            if (!tagMapping.ContainsKey(srcTag.Id))
            {
                var match = targetTags.FirstOrDefault(tTag =>
                    string.Equals(tTag.Name, srcTag.Name, StringComparison.OrdinalIgnoreCase));

                if (match != null)
                {
                    tagMapping[srcTag.Id] = match.Id;
                }
                else
                {
                    var newTag = new Tag
                    {
                        Id = Guid.NewGuid(),
                        WorkspaceId = targetWorkspaceId,
                        UserId = userId,
                        Name = srcTag.Name
                    };
                    db.Tags.Add(newTag);
                    targetTags.Add(newTag);
                    tagMapping[srcTag.Id] = newTag.Id;
                }
            }
        }

        foreach (var tt in sourceTxTags)
        {
            if (tagMapping.TryGetValue(tt.TagId, out Guid targetTagId))
            {
                tt.TagId = targetTagId;
            }
        }

        // 6. Revert and apply balance effects.
        foreach (var t in userTransactions)
        {
            decimal effect = t.Type == TransactionType.Income ? t.Amount : -t.Amount;

            var srcAcc = sourceAccounts.FirstOrDefault(a => a.Id == t.AccountId);
            if (srcAcc != null)
            {
                srcAcc.Balance -= effect;
            }

            var targetAccountId = accountMapping[t.AccountId];
            var tgtAcc = targetAccounts.FirstOrDefault(a => a.Id == targetAccountId);
            if (tgtAcc != null)
            {
                tgtAcc.Balance += effect;
            }

            t.WorkspaceId = targetWorkspaceId;
            t.OrganizationId = targetOrgId;
            t.BranchId = targetBranchId;
            t.AccountId = targetAccountId;
            t.CategoryId = categoryMapping[t.CategoryId];
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        await audit.LogAsync(actorUserId, "workspace.reassign_user", "User", userId,
            JsonSerializer.Serialize(new { userId, sourceWorkspaceId, targetWorkspaceId, transactionCount = userTransactions.Count }), ct);
    }
}
