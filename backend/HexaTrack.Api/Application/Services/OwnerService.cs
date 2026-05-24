using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexaTrack.Api.Application.Services;

public sealed class OwnerService(HexaTrackDbContext db) : IOwnerService
{
    public async Task<OrganizationOverviewDto> GetOverviewAsync(Guid organizationId, CancellationToken ct)
    {
        var org = await db.Organizations
            .AsNoTracking()
            .Where(o => o.Id == organizationId)
            .Select(o => new { o.Name })
            .FirstOrDefaultAsync(ct) 
            ?? throw new KeyNotFoundException("Organization not found");

        int branchCount = await db.Branches.CountAsync(b => b.OrganizationId == organizationId, ct);
        int staffCount = await db.Users.CountAsync(u => u.OrganizationId == organizationId && u.OrganizationRole == "Staff", ct);

        // Aggregate transaction volumes across linked workspaces of these branches
        var branchWorkspaceIds = await db.Branches
            .Where(b => b.OrganizationId == organizationId && b.WorkspaceId != null)
            .Select(b => new { b.Id, b.Name, b.WorkspaceId })
            .ToListAsync(ct);

        decimal totalFlow = 0;
        var velocity = new List<BranchStatDto>();

        foreach (var bw in branchWorkspaceIds)
        {
            // Total volume is sum of abs transaction amounts in this branch's workspace
            decimal volume = await db.Transactions
                .AsNoTracking()
                .Where(t => t.WorkspaceId == bw.WorkspaceId)
                .SumAsync(t => Math.Abs(t.Amount), ct);
            
            totalFlow += volume;
            velocity.Add(new BranchStatDto(bw.Name, volume, 0)); // Pct calculated later
        }

        // Normalize percentages
        if (totalFlow > 0)
        {
            velocity = velocity
                .Select(v => v with { Percentage = (double)(v.Volume / totalFlow) * 100 })
                .OrderByDescending(v => v.Volume)
                .ToList();
        }

        return new OrganizationOverviewDto(org.Name, branchCount, staffCount, totalFlow, velocity);
    }

    public async Task<List<Branch>> GetBranchesAsync(Guid organizationId, CancellationToken ct)
    {
        return await db.Branches
            .AsNoTracking()
            .Where(b => b.OrganizationId == organizationId)
            .OrderBy(b => b.Name)
            .ToListAsync(ct);
    }

    public async Task<List<AdminUserListItemDto>> GetStaffAsync(Guid organizationId, Guid? branchId, string? query, CancellationToken ct)
    {
        var staffQuery = db.Users
            .AsNoTracking()
            .Where(u => u.OrganizationId == organizationId && u.OrganizationRole == "Staff");

        if (branchId.HasValue)
        {
            staffQuery = staffQuery.Where(u => u.BranchId == branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            string term = query.Trim().ToLowerInvariant();
            staffQuery = staffQuery.Where(u =>
                u.DisplayName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.Department != null && u.Department.ToLower().Contains(term)) ||
                (u.Branch != null && u.Branch.Name.ToLower().Contains(term)));
        }

        return await staffQuery
            .OrderBy(u => u.DisplayName)
            .Select(u => new AdminUserListItemDto(
                u.Id,
                u.Email,
                u.DisplayName,
                u.CreatedAt,
                u.IsSuperAdmin,
                u.IsLocked,
                null,
                u.OrganizationRole,
                u.Department,
                u.Organization != null ? u.Organization.Name : null,
                u.BranchId,
                u.Branch != null ? u.Branch.Name : null,
                u.OrganizationId))
            .ToListAsync(ct);
    }

    public async Task<AdminUserListItemDto> CreateStaffAsync(Guid organizationId, CreateOwnerStaffRequest request, CancellationToken ct)
    {
        // 1. Verify branch authority & existence within the organization
        var branchValid = await db.Branches.AnyAsync(b => b.Id == request.BranchId && b.OrganizationId == organizationId, ct);
        if (!branchValid) throw new UnauthorizedAccessException("Selected branch does not belong to your organization matrix.");

        // 2. Ensure account integrity collision prevention
        var existing = await db.Users.AnyAsync(u => u.Email.ToLower() == request.Email.Trim().ToLower(), ct);
        if (existing) throw new InvalidOperationException("A user vector with this email identity is already registered in our persistence layer.");

        // 3. Build secure entity graph
        var staff = new User
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            DisplayName = request.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            OrganizationId = organizationId,
            BranchId = request.BranchId,
            OrganizationRole = "Staff",
            Department = request.Department.Trim()
        };

        db.Users.Add(staff);

        // Fetch target branch to link workspace membership
        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId, ct);
        if (branch != null && branch.WorkspaceId.HasValue)
        {
            db.WorkspaceMembers.Add(new WorkspaceMember
            {
                WorkspaceId = branch.WorkspaceId.Value,
                UserId = staff.Id,
                Role = WorkspaceRole.Member
            });
        }

        await db.SaveChangesAsync(ct);
        string branchName = branch?.Name ?? "Assigned Branch";

        return new AdminUserListItemDto(
            staff.Id,
            staff.Email,
            staff.DisplayName,
            staff.CreatedAt,
            staff.IsSuperAdmin,
            staff.IsLocked,
            null,
            staff.OrganizationRole,
            staff.Department,
            null,
            staff.BranchId,
            branchName,
            staff.OrganizationId);
    }

    public Task<List<AdminUserListItemDto>> GetBranchStaffAsync(Guid organizationId, Guid branchId, CancellationToken ct)
        => GetStaffAsync(organizationId, branchId, null, ct);

    public async Task<AdminUserListItemDto> ReassignStaffAsync(Guid organizationId, Guid userId, StaffReassignRequest request, CancellationToken ct)
    {
        User staff = await db.Users
            .SingleOrDefaultAsync(u => u.Id == userId && u.OrganizationId == organizationId && u.OrganizationRole == "Staff", ct)
            ?? throw new KeyNotFoundException("Staff member not found.");

        string? branchName = null;
        if (request.BranchId.HasValue)
        {
            branchName = await db.Branches
                .Where(b => b.Id == request.BranchId.Value && b.OrganizationId == organizationId)
                .Select(b => b.Name)
                .SingleOrDefaultAsync(ct)
                ?? throw new InvalidOperationException("Selected branch does not belong to your organization.");
        }

        staff.BranchId = request.BranchId;

        if (request.BranchId.HasValue)
        {
            var targetBranch = await db.Branches.FirstOrDefaultAsync(b => b.Id == request.BranchId.Value, ct);
            if (targetBranch != null && targetBranch.WorkspaceId.HasValue)
            {
                bool exists = await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == targetBranch.WorkspaceId.Value && m.UserId == userId, ct);
                if (!exists)
                {
                    db.WorkspaceMembers.Add(new WorkspaceMember
                    {
                        WorkspaceId = targetBranch.WorkspaceId.Value,
                        UserId = userId,
                        Role = WorkspaceRole.Member
                    });
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Department))
        {
            staff.Department = request.Department.Trim();
        }
        staff.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return new AdminUserListItemDto(
            staff.Id,
            staff.Email,
            staff.DisplayName,
            staff.CreatedAt,
            staff.IsSuperAdmin,
            staff.IsLocked,
            null,
            staff.OrganizationRole,
            staff.Department,
            null,
            staff.BranchId,
            branchName,
            staff.OrganizationId);
    }
}
