using HexaTrack.Api.Domain;

namespace HexaTrack.Api.Application.Dtos;

public sealed record AuthMeResponse(UserDto User, bool IsSuperAdmin);
public sealed record AdminUserListItemDto(
    Guid Id,
    string Email,
    string DisplayName,
    DateTimeOffset CreatedAt,
    bool IsSuperAdmin,
    bool IsLocked,
    SubscriptionPlan? SubscriptionPlan,
    string? OrganizationRole = null,
    string? Department = null,
    string? OrganizationName = null,
    Guid? BranchId = null,
    string? BranchName = null,
    Guid? OrganizationId = null,
    Guid? WorkspaceId = null);
public sealed record AdminUserListResult(IReadOnlyCollection<AdminUserListItemDto> Items, int Page, int PageSize, int TotalCount);
public sealed record AdminUserListFilter(
    string? Query,
    bool? OrganizationUsersOnly,
    bool? IndividualUsersOnly,
    bool? LockedOnly,
    bool? SuperAdminOnly,
    bool? BranchUsersOnly = null);
public sealed record AdminCreateUserRequest(
    string Email,
    string Password,
    string FullName,
    string WorkspaceName,
    WorkspaceType WorkspaceType,
    string Currency,
    bool IsSuperAdmin,
    WorkspaceRole? InitialWorkspaceRole = null,
    Guid? OrganizationId = null,
    Guid? BranchId = null,
    string? OrganizationRole = null,
    string? Department = null);
public sealed record AdminUpdateUserRequest(
    string Email,
    string FullName,
    string? Department = null,
    string? OrganizationRole = null);
public sealed record AdminCreateUserResponse(
    bool Success,
    Guid Id,
    Guid UserId,
    Guid WorkspaceId,
    string Email,
    string DisplayName,
    bool IsSuperAdmin,
    string? TemporaryPassword = null,
    string? PlaintextPassword = null);
public sealed record SetSuperAdminRequest(bool IsSuperAdmin);
public sealed record SetUserLockedRequest(bool Locked);
public sealed record AdminAuditLogDto(
    Guid Id,
    Guid ActorUserId,
    string Action,
    string? TargetType,
    Guid? TargetId,
    string? IpAddress,
    DateTimeOffset CreatedAt,
    string Severity);
public sealed record UpsertFeatureFlagRequest(string Value);
public sealed record FeatureFlagDto(string Key, string Value, DateTimeOffset UpdatedAt);
public sealed record InviteAcceptRequest(string Token, string Password);
public sealed record CreateWorkspaceInviteRequest(string Email, WorkspaceRole Role);
public sealed record CreateInviteResponse(string Token);
public sealed record SetUserSubscriptionRequest(SubscriptionPlan Plan);
public sealed record ResetPasswordRequest(string Password);
public sealed record OrganizationFeatureToggleDto(Guid Id, Guid OrganizationId, string FeatureKey, bool IsEnabled, DateTimeOffset UpdatedAt);
public sealed record WorkspaceFeatureToggleDto(Guid Id, Guid WorkspaceId, string FeatureKey, bool IsEnabled, DateTimeOffset UpdatedAt);
public sealed record BranchFeatureToggleDto(Guid Id, Guid BranchId, string FeatureKey, bool IsEnabled, DateTimeOffset UpdatedAt);
public sealed record UserFeatureToggleDto(Guid Id, Guid UserId, string FeatureKey, bool IsEnabled, DateTimeOffset UpdatedAt);
public sealed record UpsertToggleRequest(bool IsEnabled);
public sealed record GlobalSettingDto(string Key, string Value, DateTimeOffset UpdatedAt);
public sealed record AdminAuditListResult(IReadOnlyList<AdminAuditLogDto> Items, int Page, int PageSize, int TotalCount);
public sealed record AiUsageSummaryRow(Guid UserId, string Email, long TotalPromptTokens, long TotalCompletionTokens);
public sealed record AiUsageSummaryResult(IReadOnlyList<AiUsageSummaryRow> Rows);
public sealed record AdminWorkspaceListItemDto(
    Guid Id,
    string Name,
    WorkspaceType Type,
    Guid OwnerUserId,
    string OwnerEmail,
    DateTimeOffset CreatedAt,
    int MemberCount,
    SubscriptionPlan? OwnerSubscriptionPlan);
public sealed record AdminWorkspaceListResult(IReadOnlyList<AdminWorkspaceListItemDto> Items, int Page, int PageSize, int TotalCount);
public sealed record AdminCreateWorkspaceRequest(Guid OwnerUserId, string Name, WorkspaceType Type, WorkspaceMode Mode, string Currency, Guid? OrganizationId);
public sealed record AdminWorkspaceMemberRequest(Guid UserId, WorkspaceRole Role);
public sealed record AdminWorkspaceRoleRequest(WorkspaceRole Role);
public sealed record AdminWorkspaceUserReassignRequest(Guid UserId, Guid SourceWorkspaceId, Guid TargetWorkspaceId);

public sealed record AdminAnalyticsOverviewDto(
    int TotalUsers,
    int SuperAdminUsers,
    int LockedUsers,
    int TotalWorkspaces,
    int ActiveSubscriptions,
    long AiPromptTokensLast30Days,
    long AiCompletionTokensLast30Days);

public sealed record AdminTimeSeriesPointDto(string Date, int Value);

public sealed record AdminTokenUsageDayDto(string Date, long PromptTokens, long CompletionTokens);

public sealed record AdminSubscriptionTierDto(string Plan, int Count);

public sealed record AdminTokenCostDayDto(string Date, decimal EstimatedCostUsd);

public sealed record AdminExpenseCategoryAggDto(
    string CategoryName,
    string Currency,
    decimal TotalAmount,
    int TransactionCount);

public sealed record AdminAnalyticsDashboardDto(
    IReadOnlyList<AdminTimeSeriesPointDto> NewUsersByDay,
    IReadOnlyList<AdminTimeSeriesPointDto> CumulativeUsersByDay,
    IReadOnlyList<AdminTimeSeriesPointDto> NewWorkspacesByDay,
    IReadOnlyList<AdminTimeSeriesPointDto> CumulativeWorkspacesByDay,
    IReadOnlyList<AdminTokenUsageDayDto> TokenUsageByDay,
    IReadOnlyList<AdminSubscriptionTierDto> ActiveSubscriptionsByPlan,
    decimal EstimatedMrrInr,
    int PayingSubscriptionCount,
    decimal AverageRevenuePerPayingUserInr,
    IReadOnlyList<AdminTimeSeriesPointDto> ActiveUsersByDay,
    IReadOnlyList<AdminTimeSeriesPointDto> TransactionsByDay,
    IReadOnlyList<AdminTimeSeriesPointDto> NewPayingSubscriptionsByDay,
    IReadOnlyList<AdminTokenCostDayDto> TokenEstimatedCostByDay,
    IReadOnlyList<AdminExpenseCategoryAggDto> ExpenseCategoryTotals,
    decimal TotalSystemIncome30d,
    decimal TotalSystemExpense30d,
    decimal TotalSystemNet30d,
    int TotalActiveOrganizations,
    int TotalSuspendedOrganizations,
    int TotalIndividualUsers,
    int TotalOrganizationUsers,
    int TotalWorkspaces,
    int ActiveBranches,
    int TotalTransactions,
    int ActiveSessions,
    IReadOnlyList<AdminTimeSeriesPointDto> OrganizationGrowthByDay,
    IReadOnlyList<AdminTimeSeriesPointDto> WorkspaceActivityByDay);

public sealed record CreateOrganizationRequest(string Name, string? Slug, OrgPlan? Plan, string? Currency, int MaxBranches, int MaxStaff, string OwnerName, string OwnerEmail, string OwnerPassword);
public sealed record CreateBranchRequest(Guid OrganizationId, string Name, string? Code, string? Currency, string? Timezone, string? Address, string? Phone);
public sealed record AddOwnerRequest(Guid OrganizationId, string FullName, string Email, string Password);
public sealed record AddStaffRequest(Guid OrganizationId, Guid? BranchId, string FullName, string Email, string? Department, string Password);
public sealed record UpdateOrganizationRequest(string? Name, OrgPlan? Plan, int? MaxBranches, int? MaxStaff, string? BaseCurrency);
public sealed record SuspendOrganizationRequest(string? Reason);
public sealed record UpdateBranchRequest(string? Name, string? Code, string? Currency, string? Timezone, string? Address, string? Phone);
public sealed record ReassignStaffBranchRequest(Guid? BranchId);
public sealed record CreateRouteRequest(Guid OrganizationId, Guid? BranchId, string Name, string? Code, string? Description);
public sealed record UpdateRouteRequest(string? Name, string? Code, string? Description, bool? IsActive);
public sealed record RouteDto(
    Guid Id,
    Guid OrganizationId,
    Guid? BranchId,
    string Name,
    string? Code,
    string? Description,
    bool IsActive,
    int AssignedStaffCount,
    DateTimeOffset CreatedAt);
public sealed record OrganizationListItemDto(
    Guid Id,
    string Name,
    string? Slug,
    string Plan,
    string Status,
    DateTimeOffset CreatedAt,
    int BranchCount,
    int OwnerCount,
    int StaffCount,
    decimal EstimatedMrr);
public sealed record AdminOrganizationListResult(IReadOnlyList<OrganizationListItemDto> Items, int Page, int PageSize, int TotalCount);
public sealed record AdminOrganizationAnalyticsOverview(
    int TotalOrganizations,
    int TotalOwners,
    int TotalStaff,
    int ActiveBranches,
    decimal TotalMrr);

public sealed record AdminOrganizationDetailsDto(
    OrganizationListItemDto Info,
    int MaxBranches,
    int MaxStaff,
    string Currency,
    List<BranchDetailsDto> Branches,
    List<UserLightDto> Owners,
    List<UserLightDto> Staff);

public sealed record BranchDetailsDto(
    Guid Id,
    string Name,
    string? Code,
    int StaffCount,
    string? Currency,
    string? Timezone,
    Guid? WorkspaceId);

public sealed record UserLightDto(
    Guid Id,
    string Email,
    string DisplayName,
    string? Department,
    bool IsLocked,
    Guid? BranchId = null,
    string? BranchName = null);

public sealed record OrgFinancialSummaryDto(
    Guid OrganizationId,
    string OrganizationName,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal NetBalance,
    int TransactionCount,
    IReadOnlyList<BranchFinancialSummaryDto> Branches);

public sealed record BranchFinancialSummaryDto(
    Guid BranchId,
    string BranchName,
    Guid? WorkspaceId,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal NetBalance,
    int TransactionCount);
