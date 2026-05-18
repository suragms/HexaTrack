using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Application.Dtos;
using HexaTrack.Api.Domain;
using HexaTrack.Api.Application.Security;
using HexaTrack.Api.Domain.Entities;
using HexaTrack.Api.Infrastructure;
using HexaTrack.Api.Infrastructure.Repositories;

namespace HexaTrack.Api.Application.Services;

public interface ICategoryService
{
    Task<IReadOnlyCollection<CategoryDto>> ListAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CategoryDto>> ListAvailableAsync(Guid? branchId, TransactionType? type, CancellationToken cancellationToken);
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryDto> UpdateAsync(Guid categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task ArchiveAsync(Guid categoryId, CancellationToken cancellationToken);
    Task UnarchiveAsync(Guid categoryId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<CategoryDto>> ListSubcategoriesAsync(Guid parentCategoryId, CancellationToken cancellationToken);
    Task<CategoryDto> CreateSubcategoryAsync(Guid parentCategoryId, CreateSubcategoryRequest request, CancellationToken cancellationToken);
    Task DeleteSubcategoryAsync(Guid parentCategoryId, Guid subcategoryId, CancellationToken cancellationToken);
}

public sealed class CategoryService(
    HexaTrackDbContext db,
    IUserScopedRepository<Category> categories,
    ICurrentUser currentUser,
    ICurrentWorkspace currentWorkspace,
    IUnitOfWork unitOfWork) : ICategoryService
{
    public async Task<IReadOnlyCollection<CategoryDto>> ListAsync(CancellationToken cancellationToken)
        => await db.Categories.AsNoTracking()
            .InWorkspace(currentWorkspace.WorkspaceId)
            .Where(x => !x.IsArchived)
            .OrderBy(x => x.Type).ThenBy(x => x.ParentCategoryId).ThenBy(x => x.Name)
            .Select(x => new CategoryDto(x.Id, x.ParentCategoryId, x.Name, x.Type, x.Color, x.Icon))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyCollection<CategoryDto>> ListAvailableAsync(Guid? branchId, TransactionType? type, CancellationToken cancellationToken)
    {
        Guid workspaceId;

        if (branchId.HasValue)
        {
            var branch = await db.Branches.AsNoTracking()
                .SingleOrDefaultAsync(b => b.Id == branchId.Value, cancellationToken);
            if (branch == null) return Array.Empty<CategoryDto>();
            if (!branch.WorkspaceId.HasValue) return Array.Empty<CategoryDto>();
            
            workspaceId = branch.WorkspaceId.Value;

            if (currentUser.OrganizationId.HasValue && branch.OrganizationId != currentUser.OrganizationId.Value)
            {
                throw new UnauthorizedAccessException("You do not have access to this branch context.");
            }
        }
        else
        {
            workspaceId = currentWorkspace.WorkspaceId;
        }

        var q = db.Categories.AsNoTracking()
            .InWorkspace(workspaceId)
            .Where(x => !x.IsArchived);

        if (type.HasValue)
        {
            q = q.Where(x => x.Type == type.Value);
        }

        return await q.OrderBy(x => x.Type)
            .ThenBy(x => x.ParentCategoryId)
            .ThenBy(x => x.Name)
            .Select(x => new CategoryDto(x.Id, x.ParentCategoryId, x.Name, x.Type, x.Color, x.Icon))
            .ToListAsync(cancellationToken);
    }

    public Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            if (request.ParentCategoryId.HasValue)
            {
                bool parentExists = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId).AnyAsync(x => x.Id == request.ParentCategoryId.Value && x.ParentCategoryId == null, ct);
                if (!parentExists)
                {
                    throw new InvalidOperationException("Parent category does not exist.");
                }
            }

            var category = new Category
            {
                WorkspaceId = currentWorkspace.WorkspaceId,
                UserId = currentUser.UserId,
                OrganizationId = currentUser.OrganizationId,
                BranchId = currentUser.BranchId,
                Name = request.Name.Trim(),
                Type = request.Type,
                ParentCategoryId = request.ParentCategoryId,
                Color = request.Color,
                Icon = request.Icon
            };

            await categories.AddAsync(category, ct);
            return new CategoryDto(category.Id, category.ParentCategoryId, category.Name, category.Type, category.Color, category.Icon);
        }, cancellationToken);

    public Task<CategoryDto> UpdateAsync(Guid categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            Category category = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
                .SingleOrDefaultAsync(x => x.Id == categoryId && !x.IsArchived, ct)
                ?? throw new KeyNotFoundException("Category not found.");

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                category.Name = request.Name.Trim();
            }

            if (request.Color is not null)
            {
                category.Color = string.IsNullOrWhiteSpace(request.Color) ? null : request.Color.Trim();
            }

            if (request.Icon is not null)
            {
                category.Icon = string.IsNullOrWhiteSpace(request.Icon) ? null : request.Icon.Trim();
            }

            return new CategoryDto(category.Id, category.ParentCategoryId, category.Name, category.Type, category.Color, category.Icon);
        }, cancellationToken);

    public Task ArchiveAsync(Guid categoryId, CancellationToken cancellationToken)
        => SetArchiveStateAsync(categoryId, true, cancellationToken);

    public Task UnarchiveAsync(Guid categoryId, CancellationToken cancellationToken)
        => SetArchiveStateAsync(categoryId, false, cancellationToken);

    public async Task<IReadOnlyCollection<CategoryDto>> ListSubcategoriesAsync(Guid parentCategoryId, CancellationToken cancellationToken)
    {
        bool parentOk = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
            .AnyAsync(x => x.Id == parentCategoryId && x.ParentCategoryId == null && !x.IsArchived, cancellationToken);
        if (!parentOk)
        {
            throw new KeyNotFoundException("Category not found.");
        }

        return await db.Categories.AsNoTracking().InWorkspace(currentWorkspace.WorkspaceId)
            .Where(x => x.ParentCategoryId == parentCategoryId && !x.IsArchived)
            .OrderBy(x => x.Name)
            .Select(x => new CategoryDto(x.Id, x.ParentCategoryId, x.Name, x.Type, x.Color, x.Icon))
            .ToListAsync(cancellationToken);
    }

    public Task<CategoryDto> CreateSubcategoryAsync(Guid parentCategoryId, CreateSubcategoryRequest request, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            Category parent = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
                .SingleOrDefaultAsync(x => x.Id == parentCategoryId && x.ParentCategoryId == null && !x.IsArchived, ct)
                ?? throw new KeyNotFoundException("Parent category not found.");

            var sub = new Category
            {
                WorkspaceId = currentWorkspace.WorkspaceId,
                UserId = currentUser.UserId,
                OrganizationId = currentUser.OrganizationId,
                BranchId = currentUser.BranchId,
                ParentCategoryId = parent.Id,
                Name = request.Name.Trim(),
                Type = parent.Type,
                Color = request.Color,
                Icon = request.Icon
            };

            await categories.AddAsync(sub, ct);
            return new CategoryDto(sub.Id, sub.ParentCategoryId, sub.Name, sub.Type, sub.Color, sub.Icon);
        }, cancellationToken);

    public Task DeleteSubcategoryAsync(Guid parentCategoryId, Guid subcategoryId, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            Category sub = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
                .SingleOrDefaultAsync(x => x.Id == subcategoryId && x.ParentCategoryId == parentCategoryId && !x.IsArchived, ct)
                ?? throw new KeyNotFoundException("Subcategory not found.");

            bool hasTransactions = await db.Transactions.InWorkspace(currentWorkspace.WorkspaceId)
                .AnyAsync(t => t.CategoryId == subcategoryId, ct);
            if (hasTransactions)
            {
                throw new InvalidOperationException("Cannot remove a subcategory that has transactions.");
            }

            sub.IsArchived = true;
        }, cancellationToken);

    private Task SetArchiveStateAsync(Guid categoryId, bool archived, CancellationToken cancellationToken)
        => unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            Category category = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
                .SingleOrDefaultAsync(x => x.Id == categoryId, ct)
                ?? throw new KeyNotFoundException("Category not found.");

            category.IsArchived = archived;

            if (category.ParentCategoryId is null)
            {
                List<Category> children = await db.Categories.InWorkspace(currentWorkspace.WorkspaceId)
                    .Where(x => x.ParentCategoryId == categoryId)
                    .ToListAsync(ct);
                foreach (Category child in children)
                {
                    child.IsArchived = archived;
                }
            }
        }, cancellationToken);
}
