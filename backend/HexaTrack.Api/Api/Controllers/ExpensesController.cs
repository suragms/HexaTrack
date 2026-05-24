using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Services;
using HexaTrack.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/expenses")]
public sealed class ExpensesController(ITransactionService transactions) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await transactions.CreateAsync(request with { Type = TransactionType.Expense }, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
