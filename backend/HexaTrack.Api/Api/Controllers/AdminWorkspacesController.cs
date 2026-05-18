using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Application.Services;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[EnableRateLimiting("admin")]
[Authorize(Policy = "SuperAdmin")]
[Route("api/admin/workspaces")]
public sealed class AdminWorkspacesController(IAdminWorkspacesService workspaces, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public Task<AdminWorkspaceListResult> List(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
        => workspaces.ListAsync(q, page, pageSize, cancellationToken);

    [HttpPost]
    public Task<AdminWorkspaceListItemDto> Create([FromBody] AdminCreateWorkspaceRequest body, CancellationToken cancellationToken)
        => workspaces.CreateAsync(body, currentUser.UserId, cancellationToken);

    [HttpPost("{id:guid}/repair-access")]
    public Task RepairAccess(Guid id, CancellationToken cancellationToken)
        => workspaces.RepairOwnerAccessAsync(id, currentUser.UserId, cancellationToken);

    [HttpPost("{id:guid}/members")]
    public Task AssignUser(Guid id, [FromBody] AdminWorkspaceMemberRequest body, CancellationToken cancellationToken)
        => workspaces.AssignUserAsync(id, body, currentUser.UserId, cancellationToken);

    [HttpPut("{id:guid}/members/{userId:guid}/role")]
    public Task ChangeRole(Guid id, Guid userId, [FromBody] AdminWorkspaceRoleRequest body, CancellationToken cancellationToken)
        => workspaces.ChangeRoleAsync(id, userId, body.Role, currentUser.UserId, cancellationToken);

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public Task RemoveUser(Guid id, Guid userId, CancellationToken cancellationToken)
        => workspaces.RemoveUserAsync(id, userId, currentUser.UserId, cancellationToken);
}
