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
[Route("api/admin/users")]
public sealed class AdminUsersController(ICurrentUser currentUser, IAdminUsersService users) : ControllerBase
{
    [HttpGet]
    public Task<AdminUserListResult> List(
        [FromQuery] string? q,
        [FromQuery] bool? organizationUsersOnly,
        [FromQuery] bool? individualUsersOnly,
        [FromQuery] bool? lockedOnly,
        [FromQuery] bool? superAdminOnly,
        [FromQuery] bool? branchUsersOnly,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
        => users.ListAsync(new AdminUserListFilter(q, organizationUsersOnly, individualUsersOnly, lockedOnly, superAdminOnly, branchUsersOnly), page, pageSize, cancellationToken);

    [HttpGet("individual")]
    public Task<AdminUserListResult> Individual(
        [FromQuery] string? query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
        => users.ListAsync(new AdminUserListFilter(query, null, true, null, null), page, pageSize, cancellationToken);

    [HttpPost]
    public Task<AdminCreateUserResponse> Create([FromBody] AdminCreateUserRequest body, CancellationToken cancellationToken)
        => users.CreateAsync(body, currentUser.UserId, cancellationToken);

    [HttpPut("{id:guid}")]
    public Task Update(Guid id, [FromBody] AdminUpdateUserRequest body, CancellationToken cancellationToken)
        => users.UpdateAsync(id, body, currentUser.UserId, cancellationToken);

    [HttpPut("{id:guid}/superadmin")]
    public Task SetSuperAdmin(Guid id, [FromBody] SetSuperAdminRequest body, CancellationToken cancellationToken)
        => users.SetSuperAdminAsync(id, body.IsSuperAdmin, currentUser.UserId, cancellationToken);

    [HttpDelete("{id:guid}")]
    public Task Delete(Guid id, CancellationToken cancellationToken)
        => users.DeleteAsync(id, currentUser.UserId, cancellationToken);

    [HttpPut("{id:guid}/locked")]
    public Task SetLocked(Guid id, [FromBody] SetUserLockedRequest body, CancellationToken cancellationToken)
        => users.SetLockedAsync(id, body.Locked, currentUser.UserId, cancellationToken);

    [HttpPut("{id:guid}/subscription")]
    public Task SetSubscription(Guid id, [FromBody] SetUserSubscriptionRequest body, CancellationToken cancellationToken)
        => users.SetSubscriptionPlanAsync(id, body.Plan, currentUser.UserId, cancellationToken);

    [HttpPut("{id:guid}/reset-password")]
    public Task ResetPassword(Guid id, [FromBody] ResetPasswordRequest body, CancellationToken cancellationToken)
        => users.ResetPasswordAsync(id, body.Password, currentUser.UserId, cancellationToken);
}
