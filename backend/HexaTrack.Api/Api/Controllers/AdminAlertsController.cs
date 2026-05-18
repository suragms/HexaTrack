using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HexaTrack.Api.Application.Services;
using HexaTrack.Api.Domain.Entities;
using System.Security.Claims;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[EnableRateLimiting("admin")]
[Authorize(Policy = "SuperAdmin")]
[Route("api/admin/alerts")]
public sealed class AdminAlertsController(IAdminAlertsService alerts) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<AdminAlert>> GetActive(CancellationToken cancellationToken)
        => alerts.GetActiveAlertsAsync(cancellationToken);

    [HttpGet("history")]
    public Task<IReadOnlyList<AdminAlert>> GetHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
        => alerts.GetAlertHistoryAsync(page, pageSize, cancellationToken);

    [HttpPost("{id:guid}/resolve")]
    public async Task<IActionResult> Resolve(Guid id, CancellationToken cancellationToken)
    {
        var resolvedBy = User.FindFirstValue(ClaimTypes.Email) ?? "SuperAdmin";
        await alerts.ResolveAlertAsync(id, resolvedBy, cancellationToken);
        return NoContent();
    }
}
