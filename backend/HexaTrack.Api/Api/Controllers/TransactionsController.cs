using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Services;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/transactions")]
public sealed class TransactionsController(ITransactionService transactionService) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyCollection<TransactionDto>> List([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken cancellationToken)
        => transactionService.ListAsync(from, to, cancellationToken);

    [HttpGet("search")]
    public Task<PagedResult<TransactionDto>> Search([FromQuery] TransactionSearchRequest request, CancellationToken cancellationToken)
        => transactionService.SearchAsync(request, cancellationToken);

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(CreateTransactionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await transactionService.CreateAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public Task<TransactionDto> Update(Guid id, UpdateTransactionRequest request, CancellationToken cancellationToken)
        => transactionService.UpdateAsync(id, request, cancellationToken);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await transactionService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDelete(BulkDeleteTransactionsRequest request, CancellationToken cancellationToken)
    {
        await transactionService.BulkDeleteAsync(request, cancellationToken);
        return NoContent();
    }
}

