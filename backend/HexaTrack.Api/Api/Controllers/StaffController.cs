using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Services;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexaTrack.Api.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/staff")]
public sealed class StaffController(ICurrentUser currentUser, IOwnerService ownerService, HexaTrackDbContext db) : ControllerBase
{
    [HttpPost("assign-branch")]
    public async Task<IActionResult> AssignBranch([FromBody] StaffAssignBranchRequest request, CancellationToken ct)
    {
        Guid? orgId = currentUser.OrganizationId;
        if (!orgId.HasValue) return BadRequest("No assigned organization.");
        if (!await CanManageStaffAsync(ct)) return Forbid();

        var result = await ownerService.ReassignStaffAsync(orgId.Value, request.UserId, new StaffReassignRequest(request.BranchId, null), ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/reassign")]
    public async Task<IActionResult> Reassign(Guid id, [FromBody] StaffReassignRequest request, CancellationToken ct)
    {
        Guid? orgId = currentUser.OrganizationId;
        if (!orgId.HasValue) return BadRequest("No assigned organization.");
        if (!await CanManageStaffAsync(ct)) return Forbid();

        var result = await ownerService.ReassignStaffAsync(orgId.Value, id, request, ct);
        return Ok(result);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct)
    {
        StaffScope scope = await GetStaffScopeAsync(ct);
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateOnly monthStart = new(today.Year, today.Month, 1);

        var accounts = await db.Accounts
            .AsNoTracking()
            .Where(account => account.WorkspaceId == scope.WorkspaceId && !account.IsArchived)
            .OrderBy(account => account.Type)
            .ThenBy(account => account.Name)
            .Select(account => new AccountDto(account.Id, account.Name, account.Type, account.Currency, account.Balance))
            .ToListAsync(ct);

        var categories = await db.Categories
            .AsNoTracking()
            .Where(category => category.WorkspaceId == scope.WorkspaceId && !category.IsArchived)
            .OrderBy(category => category.Type)
            .ThenBy(category => category.Name)
            .Select(category => new CategoryDto(category.Id, category.ParentCategoryId, category.Name, category.Type, category.Color, category.Icon))
            .ToListAsync(ct);

        var recent = await BranchTransactions(scope.WorkspaceId)
            .OrderByDescending(transaction => transaction.OccurredOn)
            .ThenByDescending(transaction => transaction.CreatedAt)
            .Take(8)
            .Select(transaction => ToTransactionDto(transaction))
            .ToListAsync(ct);

        decimal income = await db.Transactions
            .AsNoTracking()
            .Where(transaction => transaction.WorkspaceId == scope.WorkspaceId && transaction.Type == TransactionType.Income && transaction.OccurredOn >= monthStart && transaction.OccurredOn <= today)
            .SumAsync(transaction => transaction.Amount, ct);
        decimal expense = await db.Transactions
            .AsNoTracking()
            .Where(transaction => transaction.WorkspaceId == scope.WorkspaceId && transaction.Type == TransactionType.Expense && transaction.OccurredOn >= monthStart && transaction.OccurredOn <= today)
            .SumAsync(transaction => transaction.Amount, ct);

        return Ok(new
        {
            scope.BranchId,
            scope.BranchName,
            scope.Department,
            workspaceId = scope.WorkspaceId,
            accounts,
            categories,
            recentTransactions = recent,
            summary = new
            {
                income,
                expense,
                net = income - expense,
                totalBalance = accounts.Sum(account => account.Balance)
            },
            tasks = StaffTasks(scope.BranchName),
            notifications = StaffNotifications(scope.BranchName, accounts),
            recurringReminders = await db.RecurringTransactions
                .AsNoTracking()
                .Where(item => item.WorkspaceId == scope.WorkspaceId && item.IsActive)
                .OrderBy(item => item.NextRunOn)
                .Take(5)
                .Select(item => new { item.Id, item.Type, item.Amount, item.Currency, item.Note, item.NextRunOn })
                .ToListAsync(ct)
        });
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> Tasks(CancellationToken ct)
    {
        StaffScope scope = await GetStaffScopeAsync(ct);
        return Ok(StaffTasks(scope.BranchName));
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> Transactions(
        [FromQuery] string? query,
        [FromQuery] TransactionType? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        StaffScope scope = await GetStaffScopeAsync(ct);
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        IQueryable<Transaction> txQuery = BranchTransactions(scope.WorkspaceId)
            .Include(transaction => transaction.Account)
            .Include(transaction => transaction.Category);

        if (type.HasValue)
        {
            txQuery = txQuery.Where(transaction => transaction.Type == type.Value);
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            string term = query.Trim().ToLowerInvariant();
            txQuery = txQuery.Where(transaction =>
                (transaction.Merchant != null && transaction.Merchant.ToLower().Contains(term)) ||
                (transaction.Note != null && transaction.Note.ToLower().Contains(term)) ||
                (transaction.Account != null && transaction.Account.Name.ToLower().Contains(term)) ||
                (transaction.Category != null && transaction.Category.Name.ToLower().Contains(term)));
        }

        int totalCount = await txQuery.CountAsync(ct);
        var items = await txQuery
            .OrderByDescending(transaction => transaction.OccurredOn)
            .ThenByDescending(transaction => transaction.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(transaction => ToTransactionDto(transaction))
            .ToListAsync(ct);

        return Ok(new PagedResult<TransactionDto>(items, page, pageSize, totalCount));
    }

    [HttpPost("transactions")]
    public Task<TransactionDto> CreateTransaction([FromBody] CreateTransactionRequest request, CancellationToken ct)
        => CreateBranchTransactionAsync(request, request.Type, ct);

    [HttpPost("income")]
    public Task<TransactionDto> CreateIncome([FromBody] CreateTransactionRequest request, CancellationToken ct)
        => CreateBranchTransactionAsync(request, TransactionType.Income, ct);

    [HttpPost("expenses")]
    public Task<TransactionDto> CreateExpense([FromBody] CreateTransactionRequest request, CancellationToken ct)
        => CreateBranchTransactionAsync(request, TransactionType.Expense, ct);

    private async Task<TransactionDto> CreateBranchTransactionAsync(CreateTransactionRequest request, TransactionType type, CancellationToken ct)
    {
        StaffScope scope = await GetStaffScopeAsync(ct);
        if (request.Amount <= 0) throw new InvalidOperationException("Amount must be greater than zero.");

        var branch = await db.Branches
            .AsNoTracking()
            .Where(b => b.Id == scope.BranchId)
            .Select(b => new { b.OrganizationId })
            .SingleOrDefaultAsync(ct);
        Guid? orgId = branch?.OrganizationId;

        await using var dbTransaction = await db.Database.BeginTransactionAsync(ct);
        Account account = await db.Accounts
            .SingleOrDefaultAsync(item => item.Id == request.AccountId && item.WorkspaceId == scope.WorkspaceId && !item.IsArchived, ct)
            ?? throw new KeyNotFoundException("Branch account not found.");

        Category category = await db.Categories
            .SingleOrDefaultAsync(item => item.Id == request.CategoryId && item.WorkspaceId == scope.WorkspaceId && item.Type == type && !item.IsArchived, ct)
            ?? throw new InvalidOperationException("Category is invalid for this staff transaction.");

        string? idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim();
        if (idempotencyKey is not null)
        {
            Transaction? existing = await db.Transactions
                .AsNoTracking()
                .SingleOrDefaultAsync(item => item.UserId == currentUser.UserId && item.IdempotencyKey == idempotencyKey, ct);
            if (existing is not null)
            {
                return ToTransactionDto(existing);
            }
        }

        account.Balance += type == TransactionType.Income ? request.Amount : -request.Amount;
        var transaction = new Transaction
        {
            WorkspaceId = scope.WorkspaceId,
            OrganizationId = orgId,
            BranchId = scope.BranchId,
            UserId = currentUser.UserId,
            AccountId = account.Id,
            CategoryId = category.Id,
            Type = type,
            Amount = request.Amount,
            Currency = request.Currency.Trim().ToUpperInvariant(),
            Merchant = request.Merchant,
            Note = request.Note,
            OccurredOn = request.OccurredOn,
            IdempotencyKey = idempotencyKey
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync(ct);
        await dbTransaction.CommitAsync(ct);

        return ToTransactionDto(transaction);
    }

    private async Task<bool> CanManageStaffAsync(CancellationToken ct)
    {
        var user = await db.Users
            .AsNoTracking()
            .Where(item => item.Id == currentUser.UserId)
            .Select(item => new { item.IsSuperAdmin, item.OrganizationRole })
            .SingleOrDefaultAsync(ct);

        return user is not null && (user.IsSuperAdmin || user.OrganizationRole == "Owner");
    }

    private async Task<StaffScope> GetStaffScopeAsync(CancellationToken ct)
    {
        var row = await db.Users
            .AsNoTracking()
            .Where(user => user.Id == currentUser.UserId && user.OrganizationRole == "Staff")
            .Select(user => new
            {
                user.BranchId,
                user.Department,
                BranchName = user.Branch != null ? user.Branch.Name : null,
                WorkspaceId = user.Branch != null ? user.Branch.WorkspaceId : null
            })
            .SingleOrDefaultAsync(ct)
            ?? throw new UnauthorizedAccessException("Staff role is required.");

        if (!row.BranchId.HasValue || !row.WorkspaceId.HasValue)
        {
            throw new InvalidOperationException("Staff account is not assigned to an active branch workspace.");
        }

        return new StaffScope(row.BranchId.Value, row.BranchName ?? "Assigned Branch", row.Department, row.WorkspaceId.Value);
    }

    private IQueryable<Transaction> BranchTransactions(Guid workspaceId)
        => db.Transactions.AsNoTracking().Where(transaction => transaction.WorkspaceId == workspaceId);

    private static TransactionDto ToTransactionDto(Transaction transaction)
        => new(
            transaction.Id,
            transaction.AccountId,
            transaction.CategoryId,
            transaction.Type,
            transaction.Amount,
            transaction.Currency,
            transaction.Merchant,
            transaction.Note,
            transaction.OccurredOn,
            []);

    private static object[] StaffTasks(string branchName)
        =>
        [
            new { id = "approval-review", title = "Review pending branch entries", branchName, status = "Pending", due = DateOnly.FromDateTime(DateTime.UtcNow) },
            new { id = "receipt-check", title = "Attach receipts for cash expenses", branchName, status = "Open", due = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)) },
            new { id = "recurring-audit", title = "Verify recurring reminders", branchName, status = "Open", due = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)) }
        ];

    private static object[] StaffNotifications(string branchName, IReadOnlyCollection<AccountDto> accounts)
        =>
        [
            new { id = "branch-session", title = "Branch session active", message = $"{branchName} finance workspace is ready.", severity = "Info" },
            new { id = "account-count", title = "Accounts available", message = $"{accounts.Count} branch accounts are available for posting.", severity = "Info" }
        ];

    private sealed record StaffScope(Guid BranchId, string BranchName, string? Department, Guid WorkspaceId);
}
