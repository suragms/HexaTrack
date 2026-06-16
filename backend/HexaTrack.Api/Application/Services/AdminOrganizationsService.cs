using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using HexaTrack.Api.Infrastructure.Repositories;
using HexaTrack.Api.Application.Security;

namespace HexaTrack.Api.Application.Services;

public interface IAdminOrganizationsService
{
    Task<Organization> CreateOrganizationAsync(CreateOrganizationRequest request, CancellationToken ct = default);
    Task<Organization> UpdateOrganizationAsync(Guid id, UpdateOrganizationRequest request, CancellationToken ct = default);
    Task SuspendOrganizationAsync(Guid id, SuspendOrganizationRequest request, CancellationToken ct = default);
    Task ActivateOrganizationAsync(Guid id, CancellationToken ct = default);
    Task DeleteOrganizationAsync(Guid id, CancellationToken ct = default);
    Task<Branch> CreateBranchAsync(CreateBranchRequest request, CancellationToken ct = default);
    Task<Branch?> GetBranchAsync(Guid id, CancellationToken ct = default);
    Task<Branch> UpdateBranchAsync(Guid id, UpdateBranchRequest request, CancellationToken ct = default);
    Task DeleteBranchAsync(Guid id, CancellationToken ct = default);
    Task<User> AddOwnerAsync(AddOwnerRequest request, CancellationToken ct = default);
    Task<User> AddStaffAsync(AddStaffRequest request, CancellationToken ct = default);
    Task RemoveStaffAsync(Guid userId, CancellationToken ct = default);
    Task ReassignStaffBranchAsync(Guid userId, ReassignStaffBranchRequest request, CancellationToken ct = default);
    Task<AdminOrganizationListResult> ListAsync(string? query, int page, int pageSize, CancellationToken ct = default);
    Task<AdminOrganizationAnalyticsOverview> GetAnalyticsAsync(CancellationToken ct = default);
    Task<List<Organization>> GetAllLightAsync(CancellationToken ct = default);
    Task<List<Branch>> GetAllBranchesLightAsync(Guid? organizationId, CancellationToken ct = default);
    Task<AdminOrganizationDetailsDto?> GetDetailsAsync(Guid id, CancellationToken ct = default);
    Task<OrgFinancialSummaryDto?> GetOrgFinancialsAsync(Guid id, int days, CancellationToken ct = default);
}

public sealed class AdminOrganizationsService(
    HexaTrackDbContext db,
    IUnitOfWork unitOfWork,
    IAdminAuditService audit,
    ICurrentUser currentUser) : IAdminOrganizationsService
{
    public async Task<Organization> CreateOrganizationAsync(CreateOrganizationRequest request, CancellationToken ct = default)
        => await unitOfWork.ExecuteInTransactionAsync(async transactionCt =>
    {
        string currency = NormalizeCurrency(request.Currency);
        var org = new Organization
        {
            Name = request.Name.Trim(),
            Slug = !string.IsNullOrWhiteSpace(request.Slug) 
                ? request.Slug.Trim().ToLowerInvariant() 
                : Guid.NewGuid().ToString("N")[..8],
            Plan = request.Plan ?? OrgPlan.Free,
            BaseCurrency = currency,
            MaxBranches = request.MaxBranches > 0 ? request.MaxBranches : 1,
            MaxStaff = request.MaxStaff > 0 ? request.MaxStaff : 5,
            IsActive = true,
            IsSuspended = false,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        db.Organizations.Add(org);

        // Provision default owner user record automatically as requested
        string ownerEmail = request.OwnerEmail.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == ownerEmail, transactionCt);
        bool createdUser = false;
        if (user != null)
        {
            user.OrganizationId = org.Id;
            user.OrganizationRole = "Owner";
            user.BranchId = null;
        }
        else
        {
            user = new User
            {
                Email = ownerEmail,
                DisplayName = request.OwnerName.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.OwnerPassword), // Provided explicit initial pass
                OrganizationId = org.Id,
                OrganizationRole = "Owner"
            };
            db.Users.Add(user);
            createdUser = true;
        }

        if (createdUser || !await db.Workspaces.AnyAsync(w => w.OwnerUserId == user.Id && w.IsDefault, transactionCt))
        {
            AddStarterWorkspaceWithSeed(db, user.Id, $"{user.DisplayName} Workspace", WorkspaceType.Business, currency, WorkspaceRole.Owner);
        }

        return org;
    }, ct);

    public async Task<Organization> UpdateOrganizationAsync(Guid id, UpdateOrganizationRequest request, CancellationToken ct = default)
    {
        Organization org = await db.Organizations.SingleOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Organization not found.");

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            org.Name = request.Name.Trim();
        }

        if (request.Plan.HasValue)
        {
            org.Plan = request.Plan.Value;
        }

        if (request.MaxBranches.HasValue)
        {
            org.MaxBranches = Math.Max(1, request.MaxBranches.Value);
        }

        if (request.MaxStaff.HasValue)
        {
            org.MaxStaff = Math.Max(1, request.MaxStaff.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.BaseCurrency))
        {
            org.BaseCurrency = NormalizeCurrency(request.BaseCurrency);
        }

        org.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return org;
    }

    public async Task SuspendOrganizationAsync(Guid id, SuspendOrganizationRequest request, CancellationToken ct = default)
    {
        Organization org = await db.Organizations.SingleOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Organization not found.");

        DateTimeOffset now = DateTimeOffset.UtcNow;
        org.IsSuspended = true;
        org.SuspendedAt = now;
        org.SuspendReason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();
        org.UpdatedAt = now;

        await db.Users
            .Where(u => u.OrganizationId == id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.IsLocked, true)
                .SetProperty(u => u.UpdatedAt, now), ct);

        await db.SaveChangesAsync(ct);
    }

    public async Task ActivateOrganizationAsync(Guid id, CancellationToken ct = default)
    {
        Organization org = await db.Organizations.SingleOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Organization not found.");

        DateTimeOffset now = DateTimeOffset.UtcNow;
        org.IsActive = true;
        org.IsSuspended = false;
        org.SuspendedAt = null;
        org.SuspendReason = null;
        org.UpdatedAt = now;

        await db.Users
            .Where(u => u.OrganizationId == id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.IsLocked, false)
                .SetProperty(u => u.UpdatedAt, now), ct);

        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteOrganizationAsync(Guid id, CancellationToken ct = default)
    {
        Organization org = await db.Organizations.SingleOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new KeyNotFoundException("Organization not found.");

        DateTimeOffset now = DateTimeOffset.UtcNow;
        org.DeletedAt = now;
        org.IsActive = false;
        org.IsSuspended = true;
        org.SuspendedAt = now;
        org.UpdatedAt = now;

        await db.Users
            .Where(u => u.OrganizationId == id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.DeletedAt, now)
                .SetProperty(u => u.IsLocked, true)
                .SetProperty(u => u.UpdatedAt, now), ct);

        await db.SaveChangesAsync(ct);
    }

    public async Task<Branch> CreateBranchAsync(CreateBranchRequest request, CancellationToken ct = default)
    {
        Organization org = await db.Organizations.SingleOrDefaultAsync(o => o.Id == request.OrganizationId, ct)
            ?? throw new InvalidOperationException("Organization not found.");

        // Find the organization's first owner to bind as the initial technical owner of the workspace
        var ownerId = await db.Users
            .Where(u => u.OrganizationId == request.OrganizationId && u.OrganizationRole == "Owner")
            .Select(u => u.Id)
            .FirstOrDefaultAsync(ct);

        string currency = NormalizeCurrency(request.Currency ?? org.BaseCurrency);

        // Provision a high-integrity bounded workspace node
        var ws = new Workspace
        {
            Name = $"{request.Name} Ledger",
            Currency = currency,
            Type = WorkspaceType.Business,
            OwnerUserId = ownerId == Guid.Empty 
                ? throw new InvalidOperationException("Unable to create branch workspace: target organization has no active owner defined.") 
                : ownerId
        };
        db.Workspaces.Add(ws);
        db.WorkspaceMembers.Add(new WorkspaceMember
        {
            WorkspaceId = ws.Id,
            UserId = ownerId,
            Role = WorkspaceRole.Owner,
        });

        var branch = new Branch
        {
            OrganizationId = request.OrganizationId,
            Name = request.Name.Trim(),
            Code = request.Code,
            Currency = currency,
            Timezone = request.Timezone,
            Address = request.Address,
            Phone = request.Phone,
            WorkspaceId = ws.Id
        };

        db.Branches.Add(branch);
        await db.SaveChangesAsync(ct);
        return branch;
    }

    public async Task<Branch?> GetBranchAsync(Guid id, CancellationToken ct = default)
        => await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task<Branch> UpdateBranchAsync(Guid id, UpdateBranchRequest request, CancellationToken ct = default)
    {
        Branch branch = await db.Branches.SingleOrDefaultAsync(b => b.Id == id, ct)
            ?? throw new KeyNotFoundException("Branch not found.");

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            branch.Name = request.Name.Trim();
        }

        if (request.Code is not null)
        {
            branch.Code = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim();
        }

        if (request.Currency is not null)
        {
            branch.Currency = string.IsNullOrWhiteSpace(request.Currency) ? null : NormalizeCurrency(request.Currency);
        }

        if (request.Timezone is not null)
        {
            branch.Timezone = string.IsNullOrWhiteSpace(request.Timezone) ? null : request.Timezone.Trim();
        }

        if (request.Address is not null)
        {
            branch.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        }

        if (request.Phone is not null)
        {
            branch.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        }

        await db.SaveChangesAsync(ct);
        return branch;
    }

    public async Task DeleteBranchAsync(Guid id, CancellationToken ct = default)
    {
        Branch branch = await db.Branches.SingleOrDefaultAsync(b => b.Id == id, ct)
            ?? throw new KeyNotFoundException("Branch not found.");

        await db.Users
            .Where(u => u.BranchId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.BranchId, (Guid?)null), ct);

        branch.WorkspaceId = null;
        db.Branches.Remove(branch);
        await db.SaveChangesAsync(ct);
    }

    public async Task<User> AddOwnerAsync(AddOwnerRequest request, CancellationToken ct = default)
    {
        Organization org = await db.Organizations.SingleOrDefaultAsync(o => o.Id == request.OrganizationId, ct)
            ?? throw new InvalidOperationException("Organization not found.");

        string email = request.Email.Trim().ToLowerInvariant();
        string currency = NormalizeCurrency(org.BaseCurrency);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        bool createdUser = false;
        if (user == null)
        {
            user = new User
            {
                Email = email,
                DisplayName = request.FullName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                OrganizationId = request.OrganizationId,
                OrganizationRole = "Owner"
            };
            db.Users.Add(user);
            createdUser = true;
        }
        else
        {
            user.OrganizationId = request.OrganizationId;
            user.BranchId = null;
            user.OrganizationRole = "Owner";
        }

        if (createdUser || !await db.Workspaces.AnyAsync(w => w.OwnerUserId == user.Id && w.IsDefault, ct))
        {
            AddStarterWorkspaceWithSeed(db, user.Id, $"{user.DisplayName} Workspace", WorkspaceType.Business, currency, WorkspaceRole.Owner);
        }
        
        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task RemoveStaffAsync(Guid userId, CancellationToken ct = default)
    {
        User user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.OrganizationRole == "Staff", ct)
            ?? throw new KeyNotFoundException("Staff user not found.");

        user.OrganizationId = null;
        user.BranchId = null;
        user.OrganizationRole = null;
        user.Department = null;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task ReassignStaffBranchAsync(Guid userId, ReassignStaffBranchRequest request, CancellationToken ct = default)
    {
        User user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.OrganizationRole == "Staff", ct)
            ?? throw new KeyNotFoundException("Staff user not found.");

        if (!user.OrganizationId.HasValue)
        {
            throw new InvalidOperationException("Staff user is not assigned to an organization.");
        }

        Organization organization = await db.Organizations.SingleOrDefaultAsync(o => o.Id == user.OrganizationId.Value, ct)
            ?? throw new InvalidOperationException("Organization not found.");

        if (request.BranchId.HasValue)
        {
            bool branchBelongsToOrg = await db.Branches
                .AnyAsync(b => b.Id == request.BranchId.Value && b.OrganizationId == user.OrganizationId.Value, ct);
            if (!branchBelongsToOrg)
            {
                throw new InvalidOperationException("The specified branch does not belong to the staff member's organization.");
            }
        }

        Guid? oldBranchId = user.BranchId;

        // Perform reassignment
        user.BranchId = request.BranchId;

        // Update user Mode and PermissionOverrides based on new BranchId
        if (request.BranchId.HasValue)
        {
            user.Mode = UserMode.BranchManager;
            user.PermissionOverrides = organization.OwnerPermissions;
        }
        else
        {
            user.Mode = UserMode.OrganizationStaff;
            user.PermissionOverrides = organization.StaffPermissions;
        }

        user.UpdatedAt = DateTimeOffset.UtcNow;

        // Clean up old branch workspace member relationship if it exists
        if (oldBranchId.HasValue)
        {
            var oldBranch = await db.Branches.AsNoTracking().SingleOrDefaultAsync(b => b.Id == oldBranchId.Value, ct);
            if (oldBranch?.WorkspaceId != null)
            {
                var memberToRemove = await db.WorkspaceMembers
                    .FirstOrDefaultAsync(wm => wm.WorkspaceId == oldBranch.WorkspaceId.Value && wm.UserId == userId, ct);
                if (memberToRemove != null)
                {
                    db.WorkspaceMembers.Remove(memberToRemove);
                }
            }
        }

        // Add to new branch workspace if it has a workspace
        if (request.BranchId.HasValue)
        {
            var newBranch = await db.Branches.AsNoTracking().SingleOrDefaultAsync(b => b.Id == request.BranchId.Value, ct);
            if (newBranch?.WorkspaceId != null)
            {
                var existingMember = await db.WorkspaceMembers
                    .FirstOrDefaultAsync(wm => wm.WorkspaceId == newBranch.WorkspaceId.Value && wm.UserId == userId, ct);
                if (existingMember == null)
                {
                    db.WorkspaceMembers.Add(new WorkspaceMember
                    {
                        WorkspaceId = newBranch.WorkspaceId.Value,
                        UserId = userId,
                        Role = WorkspaceRole.Owner // Branch Manager gets Owner of their branch workspace
                    });
                }
                else
                {
                    existingMember.Role = WorkspaceRole.Owner;
                }
            }
        }
        else
        {
            // Joining the HQ Workspace as WorkspaceRole.Member
            var hqWorkspace = await db.Workspaces
                .FirstOrDefaultAsync(w => w.OrganizationId == user.OrganizationId.Value && w.Mode == WorkspaceMode.Organization, ct);
            if (hqWorkspace != null)
            {
                var existingMember = await db.WorkspaceMembers
                    .FirstOrDefaultAsync(wm => wm.WorkspaceId == hqWorkspace.Id && wm.UserId == userId, ct);
                if (existingMember == null)
                {
                    db.WorkspaceMembers.Add(new WorkspaceMember
                    {
                        WorkspaceId = hqWorkspace.Id,
                        UserId = userId,
                        Role = WorkspaceRole.Member
                    });
                }
                else
                {
                    existingMember.Role = WorkspaceRole.Member;
                }
            }
        }

        await db.SaveChangesAsync(ct);
        await audit.LogAsync(currentUser.UserId, "staff.reassign_branch", "User", userId,
            System.Text.Json.JsonSerializer.Serialize(new { email = user.Email, oldBranchId, newBranchId = request.BranchId }), ct);
    }

    public async Task<User> AddStaffAsync(AddStaffRequest request, CancellationToken ct = default)
    {
        Organization org = await db.Organizations.SingleOrDefaultAsync(o => o.Id == request.OrganizationId, ct)
            ?? throw new InvalidOperationException("Organization not found.");

        if (request.BranchId.HasValue)
        {
            bool branchBelongsToOrg = await db.Branches
                .AnyAsync(b => b.Id == request.BranchId.Value && b.OrganizationId == request.OrganizationId, ct);
            if (!branchBelongsToOrg)
            {
                throw new InvalidOperationException("The specified branch does not belong to the given organization.");
            }
        }

        string email = request.Email.Trim().ToLowerInvariant();
        string currency = NormalizeCurrency(org.BaseCurrency);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        bool createdUser = false;
        if (user == null)
        {
            user = new User
            {
                Email = email,
                DisplayName = request.FullName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                OrganizationId = request.OrganizationId,
                BranchId = request.BranchId,
                OrganizationRole = "Staff",
                Department = request.Department
            };
            db.Users.Add(user);
            createdUser = true;
        }
        else
        {
            user.OrganizationId = request.OrganizationId;
            user.BranchId = request.BranchId;
            user.OrganizationRole = "Staff";
            user.Department = request.Department;
        }

        if (createdUser || !await db.Workspaces.AnyAsync(w => w.OwnerUserId == user.Id && w.IsDefault, ct))
        {
            AddStarterWorkspaceWithSeed(db, user.Id, $"{user.DisplayName} Workspace", WorkspaceType.Business, currency, WorkspaceRole.Owner);
        }

        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<AdminOrganizationListResult> ListAsync(string? query, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        IQueryable<Organization> q = db.Organizations.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var t = query.Trim().ToLowerInvariant();
            q = q.Where(x => x.Name.ToLower().Contains(t) || (x.Slug != null && x.Slug.ToLower().Contains(t)));
        }

        int total = await q.CountAsync(ct);
        var orgs = await q.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var ids = orgs.Select(o => o.Id).ToList();
        var branchMap = await db.Branches.Where(b => ids.Contains(b.OrganizationId)).GroupBy(b => b.OrganizationId).Select(g => new { g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        var ownerCounts = await db.Users
            .Where(u => u.OrganizationId.HasValue && ids.Contains(u.OrganizationId.Value) && u.OrganizationRole == "Owner")
            .GroupBy(u => u.OrganizationId!.Value)
            .Select(g => new { OrgId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.OrgId, x => x.Count, ct);
        var staffCounts = await db.Users
            .Where(u => u.OrganizationId.HasValue && ids.Contains(u.OrganizationId.Value) && u.OrganizationRole == "Staff")
            .GroupBy(u => u.OrganizationId!.Value)
            .Select(g => new { OrgId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.OrgId, x => x.Count, ct);

        var listItems = orgs.Select(o => new OrganizationListItemDto(
            o.Id,
            o.Name,
            o.Slug,
            o.Plan.ToString(),
            GetStatus(o),
            o.CreatedAt,
            branchMap.GetValueOrDefault(o.Id, 0),
            ownerCounts.GetValueOrDefault(o.Id, 0),
            staffCounts.GetValueOrDefault(o.Id, 0),
            CalculateEstimateMrr(o.Plan)
        )).ToList();

        return new AdminOrganizationListResult(listItems, page, pageSize, total);
    }

    public async Task<AdminOrganizationAnalyticsOverview> GetAnalyticsAsync(CancellationToken ct = default)
    {
        int totalOrgs = await db.Organizations.CountAsync(ct);
        int branches = await db.Branches.CountAsync(ct);
        int owners = await db.Users.CountAsync(u => u.OrganizationRole == "Owner", ct);
        int staff = await db.Users.CountAsync(u => u.OrganizationRole == "Staff", ct);

        var orgPlans = await db.Organizations.Select(o => o.Plan).ToListAsync(ct);
        decimal totalMrr = orgPlans.Sum(CalculateEstimateMrr);

        return new AdminOrganizationAnalyticsOverview(totalOrgs, owners, staff, branches, totalMrr);
    }

    public async Task<List<Organization>> GetAllLightAsync(CancellationToken ct = default)
    {
        return await db.Organizations
            .AsNoTracking()
            .OrderBy(o => o.Name)
            .Select(o => new Organization { Id = o.Id, Name = o.Name })
            .ToListAsync(ct);
    }

    public async Task<List<Branch>> GetAllBranchesLightAsync(Guid? organizationId, CancellationToken ct = default)
    {
        var q = db.Branches.AsNoTracking();
        if (organizationId.HasValue)
        {
            q = q.Where(b => b.OrganizationId == organizationId.Value);
        }
        return await q
            .OrderBy(b => b.Name)
            .Select(b => new Branch { Id = b.Id, Name = b.Name, OrganizationId = b.OrganizationId })
            .ToListAsync(ct);
    }

    public async Task<AdminOrganizationDetailsDto?> GetDetailsAsync(Guid id, CancellationToken ct = default)
    {
        var org = await db.Organizations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (org == null) return null;

        var branches = await db.Branches.AsNoTracking().Where(x => x.OrganizationId == id).ToListAsync(ct);
        var branchNames = branches.ToDictionary(x => x.Id, x => x.Name);
        var users = await db.Users.AsNoTracking().Where(x => x.OrganizationId == id).ToListAsync(ct);

        var owners = users.Where(u => u.OrganizationRole == "Owner").Select(u => new UserLightDto(u.Id, u.Email, u.DisplayName, u.Department, u.IsLocked, u.BranchId, u.BranchId.HasValue ? branchNames.GetValueOrDefault(u.BranchId.Value) : null)).ToList();
        var staff = users.Where(u => u.OrganizationRole == "Staff").Select(u => new UserLightDto(u.Id, u.Email, u.DisplayName, u.Department, u.IsLocked, u.BranchId, u.BranchId.HasValue ? branchNames.GetValueOrDefault(u.BranchId.Value) : null)).ToList();

        var branchDtos = branches.Select(b => new BranchDetailsDto(
            b.Id,
            b.Name,
            b.Code,
            users.Count(u => u.BranchId == b.Id),
            b.Currency,
            b.Timezone,
            b.WorkspaceId)).ToList();

        var info = new OrganizationListItemDto(
            org.Id,
            org.Name,
            org.Slug,
            org.Plan.ToString(),
            GetStatus(org),
            org.CreatedAt,
            branches.Count,
            owners.Count,
            staff.Count,
            CalculateEstimateMrr(org.Plan));

        return new AdminOrganizationDetailsDto(info, org.MaxBranches, org.MaxStaff, org.BaseCurrency ?? "USD", branchDtos, owners, staff);
    }

    public async Task<OrgFinancialSummaryDto?> GetOrgFinancialsAsync(Guid id, int days, CancellationToken ct = default)
    {
        days = Math.Clamp(days, 1, 365);
        DateOnly start = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-days + 1));

        Organization? org = await db.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (org is null)
        {
            return null;
        }

        var branches = await db.Branches.AsNoTracking()
            .Where(b => b.OrganizationId == id)
            .OrderBy(b => b.Name)
            .Select(b => new { b.Id, b.Name, b.WorkspaceId })
            .ToListAsync(ct);

        List<Guid> workspaceIds = branches.Where(b => b.WorkspaceId.HasValue).Select(b => b.WorkspaceId!.Value).ToList();
        var txGroups = await db.Transactions.AsNoTracking()
            .Where(t => workspaceIds.Contains(t.WorkspaceId) && t.OccurredOn >= start)
            .GroupBy(t => new { t.WorkspaceId, t.Type })
            .Select(g => new { g.Key.WorkspaceId, g.Key.Type, Total = g.Sum(t => t.Amount), Count = g.Count() })
            .ToListAsync(ct);

        List<BranchFinancialSummaryDto> branchDtos = branches.Select(branch =>
        {
            decimal income = branch.WorkspaceId.HasValue
                ? txGroups.Where(g => g.WorkspaceId == branch.WorkspaceId.Value && g.Type == TransactionType.Income).Sum(g => g.Total)
                : 0m;
            decimal expense = branch.WorkspaceId.HasValue
                ? txGroups.Where(g => g.WorkspaceId == branch.WorkspaceId.Value && g.Type == TransactionType.Expense).Sum(g => g.Total)
                : 0m;
            int count = branch.WorkspaceId.HasValue
                ? txGroups.Where(g => g.WorkspaceId == branch.WorkspaceId.Value).Sum(g => g.Count)
                : 0;

            return new BranchFinancialSummaryDto(branch.Id, branch.Name, branch.WorkspaceId, income, expense, income - expense, count);
        }).ToList();

        return new OrgFinancialSummaryDto(
            org.Id,
            org.Name,
            branchDtos.Sum(b => b.TotalIncome),
            branchDtos.Sum(b => b.TotalExpense),
            branchDtos.Sum(b => b.NetBalance),
            branchDtos.Sum(b => b.TransactionCount),
            branchDtos);
    }

    private static decimal CalculateEstimateMrr(OrgPlan plan)
    {
        return plan switch
        {
            OrgPlan.Basic => 99m,
            OrgPlan.Growth => 299m,
            OrgPlan.Pro => 599m,
            OrgPlan.ProMax => 1200m,
            OrgPlan.Enterprise => 4500m,
            _ => 0m
        };
    }

    private static string GetStatus(Organization organization)
        => organization.IsSuspended ? "Suspended" : organization.IsActive ? "Active" : "Inactive";

    private static string NormalizeCurrency(string? currency)
        => string.IsNullOrWhiteSpace(currency) ? "USD" : currency.Trim().ToUpperInvariant();

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

        dbContext.Accounts.AddRange(
            new Account { WorkspaceId = workspaceId, UserId = userId, Name = "Primary Bank", Type = AccountType.Bank, Currency = currency, Balance = 0 },
            new Account { WorkspaceId = workspaceId, UserId = userId, Name = "Everyday Wallet", Type = AccountType.Wallet, Currency = currency, Balance = 0 },
            new Account { WorkspaceId = workspaceId, UserId = userId, Name = "Cash", Type = AccountType.Cash, Currency = currency, Balance = 0 },
            new Account { WorkspaceId = workspaceId, UserId = userId, Name = "Credit Card", Type = AccountType.Credit, Currency = currency, Balance = 0 });

        dbContext.Categories.AddRange(
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Salary", Type = TransactionType.Income, Color = "#10b981", Icon = "Briefcase" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Interest", Type = TransactionType.Income, Color = "#14b8a6", Icon = "TrendingUp" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Food", Type = TransactionType.Expense, Color = "#f97316", Icon = "Utensils" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Transport", Type = TransactionType.Expense, Color = "#2563eb", Icon = "Bus" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Home", Type = TransactionType.Expense, Color = "#14b8a6", Icon = "Home" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Subscriptions", Type = TransactionType.Expense, Color = "#8b5cf6", Icon = "RefreshCw" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Health", Type = TransactionType.Expense, Color = "#ef4444", Icon = "HeartPulse" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Shopping", Type = TransactionType.Expense, Color = "#ec4899", Icon = "ShoppingBag" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Travel", Type = TransactionType.Expense, Color = "#0ea5e9", Icon = "Plane" },
            new Category { WorkspaceId = workspaceId, UserId = userId, Name = "Utilities", Type = TransactionType.Expense, Color = "#64748b", Icon = "Zap" });
    }
}
