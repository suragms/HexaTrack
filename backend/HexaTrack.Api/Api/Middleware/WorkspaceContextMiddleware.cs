using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;

namespace HexaTrack.Api.Api.Middleware;

public sealed class WorkspaceContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, HexaTrackDbContext db)
    {
        if (HttpMethods.IsOptions(context.Request.Method))
        {
            await next(context);
            return;
        }

        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        if (!RequiresWorkspaceHeader(context.Request))
        {
            await next(context);
            return;
        }

        Guid? requestedWorkspaceId = null;
        if (context.Request.Headers.TryGetValue("X-Workspace-Id", out Microsoft.Extensions.Primitives.StringValues headerValues))
        {
            string headerVal = headerValues.ToString();
            if (Guid.TryParse(headerVal, out Guid parsedWorkspaceId))
            {
                requestedWorkspaceId = parsedWorkspaceId;
            }
            else
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { error = "Invalid workspace ID format. Expected a valid UUID." });
                return;
            }
        }

        string? userIdStr = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out Guid userId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid authentication context." });
            return;
        }

        // 1. Fetch user to verify status
        var user = await db.Set<User>()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, context.RequestAborted);

        if (user == null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid authentication context." });
            return;
        }

        Guid workspaceId = requestedWorkspaceId ?? await ResolveDefaultWorkspaceIdAsync(db, user, context.RequestAborted);
        if (workspaceId == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { error = "No workspace is available for this account." });
            return;
        }

        // Super Admin always allowed access
        bool allowed = user.IsSuperAdmin;

        if (!allowed)
        {
            // Explicit WorkspaceMember check
            bool isExplicitMember = await db.Set<WorkspaceMember>()
                .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId, context.RequestAborted);

            if (isExplicitMember)
            {
                allowed = true;
            }
        }

        if (!allowed)
        {
            allowed = await db.Set<Workspace>()
                .AsNoTracking()
                .AnyAsync(w => w.Id == workspaceId && w.OwnerUserId == userId, context.RequestAborted);
        }

        if (!allowed && user.BranchId.HasValue)
        {
            Guid? branchWorkspaceId = await db.Set<Branch>().AsNoTracking()
                .Where(b => b.Id == user.BranchId.Value)
                .Select(b => b.WorkspaceId)
                .FirstOrDefaultAsync(context.RequestAborted);

            if (branchWorkspaceId.HasValue && branchWorkspaceId.Value == workspaceId)
            {
                allowed = true;
            }
        }

        // Organization Owners may access any workspace belonging to their organization
        if (!allowed && user.OrganizationRole == "Owner" && user.OrganizationId.HasValue)
        {
            bool workspaceBelongsToOrg = await db.Set<Workspace>()
                .AsNoTracking()
                .AnyAsync(
                    w => w.Id == workspaceId && w.OrganizationId == user.OrganizationId.Value,
                    context.RequestAborted);

            if (!workspaceBelongsToOrg)
            {
                // Also accept branch workspaces whose branch belongs to this organization
                workspaceBelongsToOrg = await db.Set<Branch>()
                    .AsNoTracking()
                    .AnyAsync(
                        b => b.WorkspaceId.HasValue && b.WorkspaceId.Value == workspaceId && b.OrganizationId == user.OrganizationId.Value,
                        context.RequestAborted);
            }

            if (workspaceBelongsToOrg)
            {
                allowed = true;
            }
        }

        if (!allowed)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "You do not have access to this workspace." });
            return;
        }

        CurrentWorkspace.SetWorkspace(context, workspaceId);
        await next(context);
    }

    private static async Task<Guid> ResolveDefaultWorkspaceIdAsync(HexaTrackDbContext db, User user, CancellationToken cancellationToken)
    {
        if (user.BranchId.HasValue)
        {
            Guid? branchWorkspaceId = await db.Set<Branch>().AsNoTracking()
                .Where(b => b.Id == user.BranchId.Value)
                .Select(b => b.WorkspaceId)
                .FirstOrDefaultAsync(cancellationToken);

            if (branchWorkspaceId.HasValue)
            {
                return branchWorkspaceId.Value;
            }
        }

        if (user.OrganizationId.HasValue && user.OrganizationRole == "Owner")
        {
            Guid? organizationWorkspaceId = await db.Set<Workspace>().AsNoTracking()
                .Where(w => w.OrganizationId == user.OrganizationId.Value && w.Mode == HexaTrack.Api.Domain.WorkspaceMode.Organization)
                .OrderByDescending(w => w.IsDefault)
                .Select(w => (Guid?)w.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (organizationWorkspaceId.HasValue)
            {
                return organizationWorkspaceId.Value;
            }
        }

        Guid? workspaceId = await db.Set<WorkspaceMember>().AsNoTracking()
            .Where(m => m.UserId == user.Id)
            .OrderByDescending(m => m.Workspace!.IsDefault)
            .Select(m => (Guid?)m.WorkspaceId)
            .FirstOrDefaultAsync(cancellationToken);

        if (workspaceId.HasValue)
        {
            return workspaceId.Value;
        }

        workspaceId = await db.Set<Workspace>().AsNoTracking()
            .Where(w => w.OwnerUserId == user.Id)
            .OrderByDescending(w => w.IsDefault)
            .Select(w => (Guid?)w.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return workspaceId ?? Guid.Empty;
    }

    private static bool RequiresWorkspaceHeader(HttpRequest request)
    {
        PathString path = request.Path;
        string method = request.Method;

        if (path.StartsWithSegments("/api/admin"))
        {
            return false;
        }

        if (path.StartsWithSegments("/api/auth"))
        {
            return false;
        }

        if (path.StartsWithSegments("/api/workspaces"))
        {
            string p = path.Value?.TrimEnd('/') ?? "";
            bool isRoot = p.Equals("/api/workspaces", StringComparison.OrdinalIgnoreCase);
            if (isRoot && (method.Equals("GET", StringComparison.OrdinalIgnoreCase) ||
                           method.Equals("POST", StringComparison.OrdinalIgnoreCase)))
            {
                return false;
            }

            string suffix = p.Length > "/api/workspaces".Length
                ? p["/api/workspaces".Length..].TrimStart('/')
                : "";
            string firstSegment = suffix.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault() ?? "";
            if (Guid.TryParse(firstSegment, out _) &&
                (method.Equals("PUT", StringComparison.OrdinalIgnoreCase) ||
                 method.Equals("DELETE", StringComparison.OrdinalIgnoreCase)))
            {
                return false;
            }
        }

        if (path.StartsWithSegments("/api/subscription") ||
            path.StartsWithSegments("/api/backup") ||
            path.StartsWithSegments("/api/groups") ||
            path.StartsWithSegments("/api/owner") ||
            path.StartsWithSegments("/api/staff"))
        {
            return false;
        }

        return true;
    }
}
