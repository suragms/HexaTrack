using Microsoft.EntityFrameworkCore;
using HexaTrack.Api.Domain.Entities;
using DomainRoute = HexaTrack.Api.Domain.Entities.Route;

namespace HexaTrack.Api.Infrastructure;

public sealed class HexaTrackDbContext(DbContextOptions<HexaTrackDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<DomainRoute> Routes => Set<DomainRoute>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionTag> TransactionTags => Set<TransactionTag>();
    public DbSet<AccountTransfer> AccountTransfers => Set<AccountTransfer>();
    public DbSet<RecurringTransaction> RecurringTransactions => Set<RecurringTransaction>();
    public DbSet<ExpenseGroup> ExpenseGroups => Set<ExpenseGroup>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<GroupExpense> GroupExpenses => Set<GroupExpense>();
    public DbSet<GroupExpenseSplit> GroupExpenseSplits => Set<GroupExpenseSplit>();
    public DbSet<GroupSettlement> GroupSettlements => Set<GroupSettlement>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<BackupJob> BackupJobs => Set<BackupJob>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();
    public DbSet<GlobalFeatureFlag> GlobalFeatureFlags => Set<GlobalFeatureFlag>();
    public DbSet<GlobalSetting> GlobalSettings => Set<GlobalSetting>();
    public DbSet<WorkspaceInvite> WorkspaceInvites => Set<WorkspaceInvite>();
    public DbSet<AiUsageDaily> AiUsageDaily => Set<AiUsageDaily>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Integration> Integrations => Set<Integration>();
    public DbSet<OrganizationFeatureToggle> OrganizationFeatureToggles => Set<OrganizationFeatureToggle>();
    public DbSet<WorkspaceFeatureToggle> WorkspaceFeatureToggles => Set<WorkspaceFeatureToggle>();
    public DbSet<BranchFeatureToggle> BranchFeatureToggles => Set<BranchFeatureToggle>();
    public DbSet<PricingConfiguration> PricingConfigurations => Set<PricingConfiguration>();
    public DbSet<UserFeatureToggle> UserFeatureToggles => Set<UserFeatureToggle>();
    public DbSet<AdminAlert> AdminAlerts => Set<AdminAlert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("uuid-ossp");

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasQueryFilter(x => x.DeletedAt == null);
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.GoogleSubject).IsUnique().HasFilter("\"GoogleSubject\" IS NOT NULL");
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.DisplayName).HasMaxLength(160);
            entity.Property(x => x.OrganizationRole).HasMaxLength(50);
            entity.Property(x => x.Department).HasMaxLength(100);
            entity.HasIndex(x => x.Mode);
            entity.HasIndex(x => x.OrganizationId).HasFilter("\"OrganizationId\" IS NOT NULL");
            entity.HasIndex(x => x.BranchId).HasFilter("\"BranchId\" IS NOT NULL");
            entity.HasIndex(x => x.CreatedAt);
            
            entity.HasOne(x => x.Organization)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);
                
            entity.HasOne(x => x.Branch)
                .WithMany(x => x.Staff)
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Route)
                .WithMany(x => x.AssignedStaff)
                .HasForeignKey(x => x.RouteId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.HasQueryFilter(x => x.DeletedAt == null);
            entity.Property(x => x.Name).HasMaxLength(150);
            entity.Property(x => x.Slug).HasMaxLength(100);
            entity.Property(x => x.BaseCurrency).HasMaxLength(3);
            entity.Property(x => x.SuspendReason).HasMaxLength(500);
            entity.HasIndex(x => x.Slug).IsUnique().HasFilter("\"Slug\" IS NOT NULL");
            entity.HasIndex(x => new { x.Plan, x.IsActive });
            entity.HasIndex(x => x.WorkspaceMode);
            entity.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(150);
            entity.Property(x => x.Code).HasMaxLength(50);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.Timezone).HasMaxLength(50);
            entity.Property(x => x.Address).HasMaxLength(300);
            entity.Property(x => x.Phone).HasMaxLength(50);
            entity.HasOne(x => x.Organization)
                .WithMany(x => x.Branches)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(x => x.OrganizationId);
            entity.HasIndex(x => x.WorkspaceId).HasFilter("\"WorkspaceId\" IS NOT NULL");
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => new { x.OrganizationId, x.IsEnabled });
        });

        modelBuilder.Entity<DomainRoute>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(150);
            entity.Property(x => x.Code).HasMaxLength(50);
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(x => new { x.OrganizationId, x.Code })
                .IsUnique()
                .HasFilter("\"Code\" IS NOT NULL");
            entity.HasIndex(x => new { x.OrganizationId, x.IsActive });
        });

        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.HasIndex(x => x.OwnerUserId);
            entity.HasIndex(x => x.CreatedAt);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.HasOne(x => x.Owner)
                .WithMany(x => x.OwnedWorkspaces)
                .HasForeignKey(x => x.OwnerUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkspaceMember>(entity =>
        {
            entity.HasIndex(x => new { x.WorkspaceId, x.UserId }).IsUnique();
            entity.HasIndex(x => x.UserId);
            entity.HasOne(x => x.Workspace)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasQueryFilter(x => x.DeletedAt == null);
            entity.HasIndex(x => new { x.UserId, x.Type });
            entity.HasIndex(x => new { x.WorkspaceId, x.Name }).IsUnique().HasFilter("\"IsArchived\" = false");
            entity.HasIndex(x => x.OrganizationId).HasFilter("\"OrganizationId\" IS NOT NULL");
            entity.HasIndex(x => x.BranchId).HasFilter("\"BranchId\" IS NOT NULL");
            entity.Property(x => x.Balance).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasQueryFilter(x => x.DeletedAt == null);
            entity.HasIndex(x => new { x.WorkspaceId, x.Type, x.ParentCategoryId });
            entity.HasIndex(x => new { x.WorkspaceId, x.UserId });
            entity.HasIndex(x => x.OrganizationId).HasFilter("\"OrganizationId\" IS NOT NULL");
            entity.HasIndex(x => x.BranchId).HasFilter("\"BranchId\" IS NOT NULL");
            entity.HasIndex(x => new { x.WorkspaceId, x.Name, x.ParentCategoryId }).IsUnique().HasFilter("\"IsArchived\" = false");
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.Color).HasMaxLength(32);
            entity.Property(x => x.Icon).HasMaxLength(64);
            entity.HasOne(x => x.ParentCategory)
                .WithMany(x => x.Subcategories)
                .HasForeignKey(x => x.ParentCategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasIndex(x => new { x.WorkspaceId, x.Name }).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(80);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasQueryFilter(x => x.DeletedAt == null);
            entity.HasIndex(x => new { x.UserId, x.OccurredOn });
            entity.HasIndex(x => new { x.WorkspaceId, x.OccurredOn });
            entity.HasIndex(x => new { x.UserId, x.CategoryId, x.OccurredOn });
            entity.HasIndex(x => new { x.AccountId, x.OccurredOn });
            entity.HasIndex(x => x.OrganizationId).HasFilter("\"OrganizationId\" IS NOT NULL");
            entity.HasIndex(x => x.BranchId).HasFilter("\"BranchId\" IS NOT NULL");
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique().HasFilter("\"IdempotencyKey\" IS NOT NULL");
            entity.HasIndex(x => x.TransferId).HasFilter("\"TransferId\" IS NOT NULL");
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.Merchant).HasMaxLength(160);
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.Property(x => x.IdempotencyKey).HasMaxLength(120);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TransactionTag>(entity =>
        {
            entity.HasKey(x => new { x.TransactionId, x.TagId });
            entity.HasIndex(x => x.TagId);
        });

        modelBuilder.Entity<AccountTransfer>(entity =>
        {
            entity.HasIndex(x => new { x.UserId, x.TransferOn });
            entity.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique();
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.FeeAmount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.Property(x => x.IdempotencyKey).HasMaxLength(120);
        });

        modelBuilder.Entity<RecurringTransaction>(entity =>
        {
            entity.HasIndex(x => new { x.IsActive, x.NextRunOn });
            entity.HasIndex(x => new { x.UserId, x.NextRunOn });
            entity.HasIndex(x => new { x.WorkspaceId, x.NextRunOn });
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ExpenseGroup>(entity =>
        {
            entity.HasIndex(x => x.OwnerUserId);
            entity.Property(x => x.Name).HasMaxLength(140);
        });

        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasIndex(x => x.GroupId);
            entity.Property(x => x.DisplayName).HasMaxLength(160);
        });

        modelBuilder.Entity<GroupExpense>(entity =>
        {
            entity.HasIndex(x => new { x.GroupId, x.ExpenseOn });
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.Description).HasMaxLength(240);
        });

        modelBuilder.Entity<GroupExpenseSplit>(entity =>
        {
            entity.HasIndex(x => new { x.GroupExpenseId, x.MemberId }).IsUnique();
            entity.Property(x => x.OwedAmount).HasPrecision(18, 2);
            entity.Property(x => x.Percentage).HasPrecision(9, 4);
            entity.Property(x => x.SettledAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<GroupSettlement>(entity =>
        {
            entity.HasIndex(x => new { x.GroupId, x.Status });
            entity.HasIndex(x => new { x.FromMemberId, x.ToMemberId });
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3);
        });

        modelBuilder.Entity<UserSubscription>(entity =>
        {
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.Property(x => x.ProviderCustomerId).HasMaxLength(160);
            entity.Property(x => x.ProviderSubscriptionId).HasMaxLength(160);
        });

        modelBuilder.Entity<BackupJob>(entity =>
        {
            entity.HasIndex(x => new { x.UserId, x.RequestedAt });
            entity.HasIndex(x => x.Status);
            entity.Property(x => x.Provider).HasMaxLength(80);
            entity.Property(x => x.ObjectKey).HasMaxLength(500);
            entity.Property(x => x.Error).HasMaxLength(1000);
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.ActorUserId);
            entity.HasIndex(x => new { x.Action, x.CreatedAt });
            entity.HasIndex(x => new { x.TargetType, x.CreatedAt });
            entity.Property(x => x.Action).HasMaxLength(120);
            entity.Property(x => x.TargetType).HasMaxLength(80);
            entity.Property(x => x.MetadataJson).HasMaxLength(4000);
            entity.Property(x => x.IpAddress).HasMaxLength(45);
            entity.HasOne(x => x.Actor)
                .WithMany()
                .HasForeignKey(x => x.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<GlobalFeatureFlag>(entity =>
        {
            entity.HasKey(x => x.Key);
            entity.Property(x => x.Key).HasMaxLength(120);
            entity.Property(x => x.Value).HasMaxLength(2000);
        });

        modelBuilder.Entity<GlobalSetting>(entity =>
        {
            entity.HasKey(x => x.Key);
            entity.Property(x => x.Key).HasMaxLength(120);
            entity.Property(x => x.Value).HasMaxLength(2000);
        });

        modelBuilder.Entity<AdminAlert>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Type).HasMaxLength(50);
            entity.Property(x => x.Title).HasMaxLength(150);
            entity.Property(x => x.Message).HasMaxLength(500);
            entity.Property(x => x.Severity).HasMaxLength(20);
            entity.Property(x => x.ResolvedBy).HasMaxLength(150);
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.IsResolved);
            entity.HasIndex(x => new { x.IsResolved, x.Severity, x.CreatedAt });
        });

        modelBuilder.Entity<WorkspaceInvite>(entity =>
        {
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.WorkspaceId, x.Email });
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.TokenHash).HasMaxLength(500);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.InvitedBy)
                .WithMany()
                .HasForeignKey(x => x.InvitedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AiUsageDaily>(entity =>
        {
            entity.HasIndex(x => new { x.UserId, x.DayUtc }).IsUnique();
            entity.HasIndex(x => x.DayUtc);
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Asset>(entity =>
        {
            entity.Property(x => x.PurchaseAmount).HasPrecision(18, 2);
            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.AssignedUser)
                .WithMany()
                .HasForeignKey(x => x.AssignedUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Integration>(entity =>
        {
            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrganizationFeatureToggle>(entity =>
        {
            entity.HasIndex(x => new { x.OrganizationId, x.FeatureKey }).IsUnique();
            entity.Property(x => x.FeatureKey).HasMaxLength(100);
            entity.HasOne(x => x.Organization)
                .WithMany(x => x.FeatureToggles)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkspaceFeatureToggle>(entity =>
        {
            entity.HasIndex(x => new { x.WorkspaceId, x.FeatureKey }).IsUnique();
            entity.Property(x => x.FeatureKey).HasMaxLength(100);
            entity.HasOne(x => x.Workspace)
                .WithMany()
                .HasForeignKey(x => x.WorkspaceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BranchFeatureToggle>(entity =>
        {
            entity.HasIndex(x => new { x.BranchId, x.FeatureKey }).IsUnique();
            entity.Property(x => x.FeatureKey).HasMaxLength(100);
            entity.HasOne(x => x.Branch)
                .WithMany()
                .HasForeignKey(x => x.BranchId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PricingConfiguration>(entity =>
        {
            entity.Property(x => x.PlanName).HasMaxLength(50);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.MonthlyPrice).HasPrecision(18, 2);
            entity.Property(x => x.YearlyPrice).HasPrecision(18, 2);
            entity.HasIndex(x => new { x.PlanName, x.IsActive });
        });

        modelBuilder.Entity<UserFeatureToggle>(entity =>
        {
            entity.HasIndex(x => new { x.UserId, x.FeatureKey }).IsUnique();
            entity.Property(x => x.FeatureKey).HasMaxLength(100);
            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
