using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using HexaTrack.Api.Infrastructure.Repositories;
using DomainTransaction = HexaTrack.Api.Domain.Entities.Transaction;

namespace HexaTrack.Api.Application.Services;

public interface ITransactionService
{
    Task<IReadOnlyCollection<TransactionDto>> ListAsync(DateOnly? from, DateOnly? to, CancellationToken cancellationToken);
    Task<PagedResult<TransactionDto>> SearchAsync(TransactionSearchRequest request, CancellationToken cancellationToken);
    Task<TransactionDto> CreateAsync(CreateTransactionRequest request, CancellationToken cancellationToken);
    Task<TransactionDto> UpdateAsync(Guid transactionId, UpdateTransactionRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid transactionId, CancellationToken cancellationToken);
    Task BulkDeleteAsync(BulkDeleteTransactionsRequest request, CancellationToken cancellationToken);
}

public sealed class TransactionService(
    HexaTrackDbContext db,
    ICurrentUser currentUser,
    ICurrentWorkspace currentWorkspace,
    IAdminAuditService audit,
    IUnitOfWork unitOfWork) : ITransactionService
{
    public async Task<IReadOnlyCollection<TransactionDto>> ListAsync(DateOnly? from, DateOnly? to, CancellationToken cancellationToken)
    {
        if (from is null || to is null)
        {
            throw new InvalidOperationException("Use GET /api/transactions/search with date range. Direct list requires from + to.");
        }

        int daySpan = to.Value.DayNumber - from.Value.DayNumber;
        if (daySpan < 0)
        {
            throw new InvalidOperationException("The end date must be on or after the start date.");
        }

        if (daySpan > 92)
        {
            throw new InvalidOperationException("Date range cannot exceed 92 days for list endpoint.");
        }

        IQueryable<DomainTransaction> query = db.Transactions.AsNoTracking().InWorkspace(currentWorkspace.WorkspaceId)
            .Include(x => x.TransactionTags).ThenInclude(x => x.Tag)
            .OrderByDescending(x => x.OccurredOn).ThenByDescending(x => x.CreatedAt);

        query = query.Where(x => x.OccurredOn >= from.Value && x.OccurredOn <= to.Value);

        return await query.Select(x => new TransactionDto(
            x.Id,
            x.AccountId,
            x.CategoryId,
            x.Type,
            x.Amount,
            x.Currency,
            x.Merchant,
            x.Note,
            x.OccurredOn,
            x.TransactionTags.Select(tt => new TagDto(tt.TagId, tt.Tag!.Name)).ToList()))
            .ToListAsync(cancellationToken);
    }

    public async Task<PagedResult<TransactionDto>> SearchAsync(TransactionSearchRequest request, CancellationToken cancellationToken)
    {
        int page = Math.Max(request.Page, 1);
        int pageSize = Math.Clamp(request.PageSize, 1, 100);
        IQueryable<DomainTransaction> query = db.Transactions.AsNoTracking().InWorkspace(currentWorkspace.WorkspaceId)
            .Include(x => x.Account)
            .Include(x => x.Category)
            .Include(x => x.TransactionTags).ThenInclude(x => x.Tag);

        if (request.From.HasValue)
        {
            query = query.Where(x => x.OccurredOn >= request.From.Value);
        }

        if (request.To.HasValue)
        {
            query = query.Where(x => x.OccurredOn <= request.To.Value);
        }

        if (request.AccountId.HasValue)
        {
            query = query.Where(x => x.AccountId == request.AccountId.Value);
        }

        if (request.CategoryId.HasValue)
        {
            query = query.Where(x => x.CategoryId == request.CategoryId.Value);
        }

        if (request.TagId.HasValue)
        {
            query = query.Where(x => x.TransactionTags.Any(tt => tt.TagId == request.TagId.Value));
        }

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            string term = request.Query.Trim().ToLowerInvariant();
            query = query.Where(x =>
                (x.Merchant != null && x.Merchant.ToLower().Contains(term)) ||
                (x.Note != null && x.Note.ToLower().Contains(term)) ||
                (x.Category != null && x.Category.Name.ToLower().Contains(term)) ||
                (x.Account != null && x.Account.Name.ToLower().Contains(term)));
        }

        if (request.TransfersOnly)
        {
            // Transfer = 3; legacy DB rows may still use 4 (former TransferIn).
            query = query.Where(x => x.Type == TransactionType.Transfer || (int)x.Type == 4);
        }
        else if (request.Type.HasValue)
        {
            query = query.Where(x => x.Type == request.Type.Value);
        }

        int totalCount = await query.CountAsync(cancellationToken);
        List<TransactionDto> items = await query
            .OrderByDescending(x => x.OccurredOn)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new TransactionDto(
                x.Id,
                x.AccountId,
                x.CategoryId,
                x.Type,
                x.Amount,
                x.Currency,
                x.Merchant,
                x.Note,
                x.OccurredOn,
                x.TransactionTags.Select(tt => new TagDto(tt.TagId, tt.Tag!.Name)).ToList()))
            .ToListAsync(cancellationToken);

        return new PagedResult<TransactionDto>(items, page, pageSize, totalCount);
    }

    public Task<TransactionDto> CreateAsync(CreateTransactionRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            if (request.Amount <= 0)
            {
                throw new InvalidOperationException("Amount must be greater than zero.");
            }

            // Use repository so multi-tenant scoping and access rules are strictly applied
            Account? account = null;
            if (request.AccountId != Guid.Empty)
            {
                account = await db.Accounts
                    .InWorkspace(currentWorkspace.WorkspaceId)
                    .SingleOrDefaultAsync(x => x.Id == request.AccountId && !x.IsArchived, ct);
            }

            if (account is null)
            {
                account = await db.Accounts
                    .InWorkspace(currentWorkspace.WorkspaceId)
                    .FirstOrDefaultAsync(x => !x.IsArchived, ct);

                if (account is null)
                {
                    account = new Account
                    {
                        Id = Guid.NewGuid(),
                        WorkspaceId = currentWorkspace.WorkspaceId,
                        OrganizationId = currentUser.OrganizationId,
                        BranchId = currentUser.BranchId,
                        UserId = currentUser.UserId,
                        Name = "System Vault",
                        Type = AccountType.Cash,
                        Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant(),
                        Balance = 0,
                        IsArchived = false,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    db.Accounts.Add(account);
                    await db.SaveChangesAsync(ct);
                }
            }

            string? idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim();
            if (idempotencyKey is not null)
            {
                DomainTransaction? existing = await db.Transactions.InWorkspace(currentWorkspace.WorkspaceId)
                    .Include(x => x.TransactionTags).ThenInclude(x => x.Tag)
                    .SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, ct);

                if (existing is not null)
                {
                    return new TransactionDto(existing.Id, existing.AccountId, existing.CategoryId, existing.Type, existing.Amount, existing.Currency, existing.Merchant, existing.Note, existing.OccurredOn, existing.TransactionTags.Select(tt => new TagDto(tt.TagId, tt.Tag!.Name)).ToList());
                }
            }

            // Use repository so multi-tenant scoping and access rules are strictly applied
            Category? categoryRow = await db.Categories
                .InWorkspace(currentWorkspace.WorkspaceId)
                .SingleOrDefaultAsync(x => x.Id == request.CategoryId && x.Type == request.Type && !x.IsArchived, ct);
            if (categoryRow is null)
            {
                throw new InvalidOperationException("Category is invalid for this transaction type.");
            }

            bool categoryHasSubcategories = await db.Categories
                .InWorkspace(currentWorkspace.WorkspaceId)
                .AnyAsync(x => x.ParentCategoryId == request.CategoryId && !x.IsArchived, ct);
            if (categoryHasSubcategories)
            {
                throw new InvalidOperationException("Choose a subcategory for this category.");
            }

            account.Balance += request.Type == TransactionType.Income ? request.Amount : -request.Amount;

            var transaction = new DomainTransaction
            {
                WorkspaceId = currentWorkspace.WorkspaceId,
                OrganizationId = currentUser.OrganizationId,
                BranchId = currentUser.BranchId,
                UserId = currentUser.UserId,
                AccountId = account.Id,
                CategoryId = request.CategoryId,
                Type = request.Type,
                Amount = request.Amount,
                Currency = request.Currency.Trim().ToUpperInvariant(),
                Merchant = request.Merchant,
                Note = request.Note,
                IdempotencyKey = idempotencyKey,
                OccurredOn = request.OccurredOn
            };

            if (request.TagIds is { Count: > 0 })
            {
                List<Guid> validTagIds = await db.Tags.InWorkspace(currentWorkspace.WorkspaceId)
                    .Where(x => request.TagIds.Contains(x.Id))
                    .Select(x => x.Id)
                    .ToListAsync(ct);

                transaction.TransactionTags = validTagIds.Distinct()
                    .Select(tagId => new TransactionTag { TransactionId = transaction.Id, TagId = tagId })
                    .ToList();
            }

            await db.Transactions.AddAsync(transaction, ct);
            await audit.LogAsync(currentUser.UserId, "transaction.create", "Transaction", transaction.Id, null, ct);

            return new TransactionDto(transaction.Id, transaction.AccountId, transaction.CategoryId, transaction.Type, transaction.Amount, transaction.Currency, transaction.Merchant, transaction.Note, transaction.OccurredOn, []);
        }, cancellationToken);

    public Task<TransactionDto> UpdateAsync(Guid transactionId, UpdateTransactionRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            DomainTransaction transaction = await db.Transactions.InWorkspace(currentWorkspace.WorkspaceId)
                .Include(x => x.TransactionTags).ThenInclude(x => x.Tag)
                .SingleOrDefaultAsync(x => x.Id == transactionId, ct)
                ?? throw new KeyNotFoundException("Transaction not found.");

            decimal newAmount = request.Amount ?? transaction.Amount;
            if (newAmount <= 0)
            {
                throw new InvalidOperationException("Amount must be greater than zero.");
            }

            Guid newCategoryId = request.CategoryId ?? transaction.CategoryId;
            if (newCategoryId != transaction.CategoryId)
            {
                Category? categoryRow = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
                    .SingleOrDefaultAsync(x => x.Id == newCategoryId && x.Type == transaction.Type && !x.IsArchived, ct);
                if (categoryRow is null)
                {
                    throw new InvalidOperationException("Category is invalid for this transaction type.");
                }

                bool categoryHasSubcategories = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
                    .AnyAsync(x => x.ParentCategoryId == newCategoryId && !x.IsArchived, ct);
                if (categoryHasSubcategories)
                {
                    throw new InvalidOperationException("Choose a subcategory for this category.");
                }
            }

            decimal oldEffect = BalanceEffect(transaction.Type, transaction.Amount);
            decimal newEffect = BalanceEffect(transaction.Type, newAmount);
            decimal delta = newEffect - oldEffect;
            if (delta != 0)
            {
                int updated = await db.Accounts.InWorkspace(currentWorkspace.WorkspaceId)
                    .Where(a => a.Id == transaction.AccountId)
                    .ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance + delta), ct);
                if (updated == 0)
                {
                    throw new KeyNotFoundException("Account not found.");
                }
            }

            transaction.CategoryId = newCategoryId;
            transaction.Amount = newAmount;
            transaction.Merchant = request.Merchant;
            transaction.Note = request.Note;
            transaction.OccurredOn = request.OccurredOn ?? transaction.OccurredOn;

            if (request.TagIds is not null)
            {
                await db.TransactionTags
                    .Where(tt => tt.TransactionId == transaction.Id)
                    .ExecuteDeleteAsync(ct);

                List<Guid> validTagIds = await db.Tags.InWorkspace(currentWorkspace.WorkspaceId)
                    .Where(x => request.TagIds.Contains(x.Id))
                    .Select(x => x.Id)
                    .ToListAsync(ct);

                transaction.TransactionTags = validTagIds.Distinct()
                    .Select(tagId => new TransactionTag { TransactionId = transaction.Id, TagId = tagId })
                    .ToList();
            }

            await audit.LogAsync(currentUser.UserId, "transaction.update", "Transaction", transaction.Id, null, ct);
            return ToDto(transaction);
        }, cancellationToken);

    public Task DeleteAsync(Guid transactionId, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            DomainTransaction transaction = await db.Transactions.InWorkspace(currentWorkspace.WorkspaceId)
                .SingleOrDefaultAsync(x => x.Id == transactionId, ct)
                ?? throw new KeyNotFoundException("Transaction not found.");

            decimal reversal = -BalanceEffect(transaction.Type, transaction.Amount);
            if (reversal != 0)
            {
                int updated = await db.Accounts.InWorkspace(currentWorkspace.WorkspaceId)
                    .Where(a => a.Id == transaction.AccountId)
                    .ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance + reversal), ct);
                if (updated == 0)
                {
                    throw new KeyNotFoundException("Account not found.");
                }
            }

            transaction.DeletedAt = DateTimeOffset.UtcNow;
            await audit.LogAsync(currentUser.UserId, "transaction.delete", "Transaction", transaction.Id, null, ct);
        }, cancellationToken);

    public Task BulkDeleteAsync(BulkDeleteTransactionsRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            if (request.TransactionIds.Count is < 1 or > 100)
            {
                throw new InvalidOperationException("Bulk delete supports 1 to 100 transactions.");
            }

            Guid[] ids = request.TransactionIds.Distinct().ToArray();
            List<DomainTransaction> rows = await db.Transactions.InWorkspace(currentWorkspace.WorkspaceId)
                .Where(t => ids.Contains(t.Id))
                .ToListAsync(ct);

            if (rows.Count != ids.Length)
            {
                throw new InvalidOperationException("One or more transactions do not belong to the current workspace.");
            }

            foreach (DomainTransaction transaction in rows)
            {
                decimal reversal = -BalanceEffect(transaction.Type, transaction.Amount);
                if (reversal != 0)
                {
                    await db.Accounts.InWorkspace(currentWorkspace.WorkspaceId)
                        .Where(a => a.Id == transaction.AccountId)
                        .ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance + reversal), ct);
                }
                transaction.DeletedAt = DateTimeOffset.UtcNow;
            }
        }, cancellationToken);

    private static decimal BalanceEffect(TransactionType type, decimal amount)
        => type == TransactionType.Income ? amount : -amount;

    private static TransactionDto ToDto(DomainTransaction transaction)
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
            transaction.TransactionTags.Select(tt => new TagDto(tt.TagId, tt.Tag!.Name)).ToList());
}

