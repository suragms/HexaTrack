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
[Route("api/admin/feature-flags")]
public sealed class AdminFeatureFlagsController(ICurrentUser currentUser, IAdminFeatureFlagsService flags) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<FeatureFlagDto>> List(CancellationToken cancellationToken)
        => flags.ListAsync(cancellationToken);

    [HttpPut("{key}")]
    public Task Upsert(string key, [FromBody] UpsertFeatureFlagRequest body, CancellationToken cancellationToken)
        => flags.UpsertAsync(key, body.Value, currentUser.UserId, cancellationToken);

    [HttpGet("organizations/{organizationId:guid}")]
    public Task<IReadOnlyList<OrganizationFeatureToggleDto>> GetOrgToggles(Guid organizationId, CancellationToken cancellationToken)
        => flags.GetOrgTogglesAsync(organizationId, cancellationToken);

    [HttpPut("organizations/{organizationId:guid}/{key}")]
    public Task UpsertOrgToggle(Guid organizationId, string key, [FromBody] UpsertToggleRequest body, CancellationToken cancellationToken)
        => flags.UpsertOrgToggleAsync(organizationId, key, body.IsEnabled, currentUser.UserId, cancellationToken);

    [HttpGet("workspaces/{workspaceId:guid}")]
    public Task<IReadOnlyList<WorkspaceFeatureToggleDto>> GetWorkspaceToggles(Guid workspaceId, CancellationToken cancellationToken)
        => flags.GetWorkspaceTogglesAsync(workspaceId, cancellationToken);

    [HttpPut("workspaces/{workspaceId:guid}/{key}")]
    public Task UpsertWorkspaceToggle(Guid workspaceId, string key, [FromBody] UpsertToggleRequest body, CancellationToken cancellationToken)
        => flags.UpsertWorkspaceToggleAsync(workspaceId, key, body.IsEnabled, currentUser.UserId, cancellationToken);

    [HttpGet("branches/{branchId:guid}")]
    public Task<IReadOnlyList<BranchFeatureToggleDto>> GetBranchToggles(Guid branchId, CancellationToken cancellationToken)
        => flags.GetBranchTogglesAsync(branchId, cancellationToken);

    [HttpPut("branches/{branchId:guid}/{key}")]
    public Task UpsertBranchToggle(Guid branchId, string key, [FromBody] UpsertToggleRequest body, CancellationToken cancellationToken)
        => flags.UpsertBranchToggleAsync(branchId, key, body.IsEnabled, currentUser.UserId, cancellationToken);

    [HttpGet("users/{userId:guid}")]
    public Task<IReadOnlyList<UserFeatureToggleDto>> GetUserToggles(Guid userId, CancellationToken cancellationToken)
        => flags.GetUserTogglesAsync(userId, cancellationToken);

    [HttpPut("users/{userId:guid}/{key}")]
    public Task UpsertUserToggle(Guid userId, string key, [FromBody] UpsertToggleRequest body, CancellationToken cancellationToken)
        => flags.UpsertUserToggleAsync(userId, key, body.IsEnabled, currentUser.UserId, cancellationToken);
}
