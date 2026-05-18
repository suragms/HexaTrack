using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Services;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[EnableRateLimiting("admin")]
[Authorize(Policy = "SuperAdmin")]
[Route("api/admin/audit")]
public sealed class AdminAuditController(IAdminAuditService audit) : ControllerBase
{
    [HttpGet]
    public Task<AdminAuditListResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? q = null,
        [FromQuery] string? actionKeyword = null,
        [FromQuery] string? targetType = null,
        CancellationToken cancellationToken = default)
        => audit.ListAsync(page, pageSize, q, actionKeyword, targetType, cancellationToken);

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? q = null,
        [FromQuery] string? actionKeyword = null,
        [FromQuery] string? targetType = null,
        CancellationToken cancellationToken = default)
    {
        var csvBytes = await audit.ExportCsvAsync(q, actionKeyword, targetType, cancellationToken);
        return File(csvBytes, "text/csv", $"audit-log-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.csv");
    }
}
