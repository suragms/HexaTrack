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
}
