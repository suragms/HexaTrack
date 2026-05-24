using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HexaTrack.Api.Application.Services;
using HexaTrack.Api.Domain.Entities;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[Authorize(Policy = "SuperAdmin")]
[Route("api/admin/pricing")]
[EnableRateLimiting("admin")]
public sealed class AdminPricingController(IAdminPricingService pricingService) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<PricingConfiguration>> List(CancellationToken cancellationToken)
        => pricingService.ListAsync(cancellationToken);

    [HttpPost]
    public Task<PricingConfiguration> Upsert([FromBody] UpsertPricingRequest request, CancellationToken cancellationToken)
        => pricingService.UpsertAsync(
            request.Id, request.PlanName, request.MonthlyPrice, request.YearlyPrice,
            request.Currency, request.TrialDays, request.MaxUsers, request.MaxBranches,
            request.MaxTransactionsPerMonth, request.IsActive, cancellationToken);

    [HttpPut("{id:guid}")]
    public Task<PricingConfiguration> Update(Guid id, [FromBody] UpdatePricingRequest request, CancellationToken cancellationToken)
        => pricingService.UpsertAsync(
            id, request.PlanName, request.MonthlyPrice, request.YearlyPrice,
            request.Currency, request.TrialDays, request.MaxUsers, request.MaxBranches,
            request.MaxTransactionsPerMonth, request.IsActive, cancellationToken);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await pricingService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}

public sealed record UpsertPricingRequest(
    Guid? Id,
    string PlanName,
    decimal MonthlyPrice,
    decimal YearlyPrice,
    string Currency,
    int TrialDays,
    int MaxUsers,
    int MaxBranches,
    int MaxTransactionsPerMonth,
    bool IsActive);

public sealed record UpdatePricingRequest(
    string PlanName,
    decimal MonthlyPrice,
    decimal YearlyPrice,
    string Currency,
    int TrialDays,
    int MaxUsers,
    int MaxBranches,
    int MaxTransactionsPerMonth,
    bool IsActive);
