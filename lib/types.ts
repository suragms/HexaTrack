export type AccountType = 'Cash' | 'Bank' | 'Wallet' | 'Credit' | 'Savings' | 'Investment';
export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export type RecurrenceFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
export type SplitMethod = 'Equal' | 'Custom' | 'Percentage';

export type UserMode = 'Individual' | 'OrganizationOwner' | 'OrganizationStaff' | 'BranchManager' | 'SuperAdmin';

export type User = {
  id: string;
  email: string;
  name?: string;
  displayName: string;
  userMode: UserMode;
  isSuperAdmin?: boolean;
  organizationId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  organizationRole?: string | null;
  department?: string | null;
};

export type WorkspaceType = 'Personal' | 'Business' | 'Family';
export type WorkspaceMode = 'Individual' | 'Organization' | 'Branch' | 'Enterprise';

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  mode?: WorkspaceMode;
  organizationId?: string | null;
  currency: string;
  isDefault: boolean;
};

export type AuthResponse = {
  accessToken: string;
  expiresAt: string;
  user: User;
};

export type AuthMeResponse = {
  user: User;
  isSuperAdmin: boolean;
};

export type WorkspaceRoleName = 'Owner' | 'Member' | 'Viewer';

export type InviteAcceptRequest = {
  token: string;
  password: string;
};

/** Matches API `SubscriptionPlan` (JSON string enum). */
export type SubscriptionPlan = 'Free' | 'Basic' | 'Pro' | 'ProMax';
export type OrgPlan = 'Free' | 'Basic' | 'Growth' | 'Pro' | 'ProMax' | 'Enterprise';

export type AdminUserListItem = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isSuperAdmin: boolean;
  isLocked: boolean;
  subscriptionPlan: SubscriptionPlan | null;
  organizationRole?: string | null;
  department?: string | null;
  organizationName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
};

export type AdminUserListResult = {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type AdminCreateUserRequest = {
  email: string;
  password: string;
  fullName: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  currency: 'USD' | 'INR' | 'EUR' | 'AED';
  isSuperAdmin: boolean;
  /** Workspace membership for the seeded default workspace (API default: Owner). */
  initialWorkspaceRole?: 'Owner' | 'Member' | 'Viewer' | null;
  organizationId?: string | null;
  branchId?: string | null;
  organizationRole?: string | null;
  department?: string | null;
};

export type AdminCreateUserResponse = {
  id: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  plaintextPassword?: string | null;
};

export type AdminWorkspaceListItem = {
  id: string;
  name: string;
  type: WorkspaceType;
  ownerUserId: string;
  ownerEmail: string;
  createdAt: string;
  memberCount: number;
  ownerSubscriptionPlan: SubscriptionPlan | null;
};

export type AdminWorkspaceListResult = {
  items: AdminWorkspaceListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type AdminCreateWorkspaceRequest = {
  ownerUserId: string;
  name: string;
  type: WorkspaceType;
  mode: 'Individual' | 'Organization' | 'Branch' | 'Enterprise';
  currency: string;
  organizationId?: string | null;
};

export type FeatureFlagDto = {
  key: string;
  value: string;
  updatedAt: string;
};

export type AdminAuditLogDto = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
  severity: 'Info' | 'Medium' | 'High';
};

export type AdminAuditListResult = {
  items: AdminAuditLogDto[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type AdminAlert = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'Info' | 'Low' | 'Medium' | 'High' | 'Critical';
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type AiUsageSummaryRow = {
  userId: string;
  email: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
};

export type AiUsageSummaryResult = {
  rows: AiUsageSummaryRow[];
};

export type AdminAnalyticsOverview = {
  totalUsers: number;
  superAdminUsers: number;
  lockedUsers: number;
  totalWorkspaces: number;
  activeSubscriptions: number;
  aiPromptTokensLast30Days: number;
  aiCompletionTokensLast30Days: number;
};

export type AdminTimeSeriesPoint = {
  date: string;
  value: number;
};

export type AdminTokenUsageDay = {
  date: string;
  promptTokens: number;
  completionTokens: number;
};

export type AdminSubscriptionTier = {
  plan: string;
  count: number;
};

export type AdminTokenCostDay = {
  date: string;
  estimatedCostUsd: number;
};

export type AdminExpenseCategoryAgg = {
  categoryName: string;
  currency: string;
  totalAmount: number;
  transactionCount: number;
};

export type AdminAnalyticsDashboard = {
  newUsersByDay: AdminTimeSeriesPoint[];
  cumulativeUsersByDay: AdminTimeSeriesPoint[];
  newWorkspacesByDay: AdminTimeSeriesPoint[];
  cumulativeWorkspacesByDay: AdminTimeSeriesPoint[];
  tokenUsageByDay: AdminTokenUsageDay[];
  activeSubscriptionsByPlan: AdminSubscriptionTier[];
  estimatedMrrInr: number;
  payingSubscriptionCount: number;
  averageRevenuePerPayingUserInr: number;
  activeUsersByDay: AdminTimeSeriesPoint[];
  transactionsByDay: AdminTimeSeriesPoint[];
  newPayingSubscriptionsByDay: AdminTimeSeriesPoint[];
  tokenEstimatedCostByDay: AdminTokenCostDay[];
  expenseCategoryTotals: AdminExpenseCategoryAgg[];
  totalSystemIncome30d: number;
  totalSystemExpense30d: number;
  totalSystemNet30d: number;
  totalActiveOrganizations: number;
  totalSuspendedOrganizations: number;
  totalIndividualUsers: number;
  totalOrganizationUsers: number;
  totalWorkspaces: number;
  activeBranches: number;
  totalTransactions: number;
  activeSessions: number;
  organizationGrowthByDay: AdminTimeSeriesPoint[];
  workspaceActivityByDay: AdminTimeSeriesPoint[];
};

export type GlobalSettingDto = {
  key: string;
  value: string;
  updatedAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = LoginRequest & {
  displayName: string;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
};

export type TransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  feeAmount?: number;
  note?: string;
  transferOn: string;
  idempotencyKey: string;
};

export type Transfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  feeAmount?: number;
  transferOn: string;
};

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  parentCategoryId?: string;
  color: string;
  icon: string;
};

export type Tag = {
  id: string;
  name: string;
};

export type Transaction = {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  merchant?: string;
  note?: string;
  occurredOn: string;
  tags: Tag[];
};

export type UpdateTransactionRequest = {
  categoryId?: string | null;
  amount?: number | null;
  merchant?: string | null;
  note?: string | null;
  occurredOn?: string | null;
  tagIds?: string[] | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type TransactionSearchParams = {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  tagId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
  type?: TransactionType;
  transfersOnly?: boolean;
};

export type StaffTask = {
  id: string;
  title: string;
  branchName: string;
  status: string;
  due: string;
};

export type StaffNotification = {
  id: string;
  title: string;
  message: string;
  severity: string;
};

export type StaffDashboardDto = {
  branchId: string;
  branchName: string;
  department?: string | null;
  workspaceId: string;
  accounts: Account[];
  categories: Category[];
  recentTransactions: Transaction[];
  summary: {
    income: number;
    expense: number;
    net: number;
    totalBalance: number;
  };
  tasks: StaffTask[];
  notifications: StaffNotification[];
  recurringReminders: Array<{
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    note?: string | null;
    nextRunOn: string;
  }>;
};

export type RecurringTransaction = {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  amount: number;
  currency: string;
  note?: string | null;
  nextRunOn: string;
  endsOn?: string | null;
  isActive: boolean;
};

export type GroupExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitMethod: SplitMethod;
  expenseOn: string;
  people: string[];
};

export type ReportSummary = {
  income: number;
  expense: number;
  net: number;
  cashflow: Array<{ period: string; income: number; expense: number; net: number }>;
  spendingByCategory: Array<{ categoryId: string; categoryName: string; amount: number }>;
};

export type DashboardSummary = {
  totalBalance: number;
  report: ReportSummary;
  recentTransactions: Transaction[];
  recurringDueSoon: RecurringTransaction[];
  insightLine: string;
};

export type OrganizationListItem = {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  status: string;
  createdAt: string;
  branchCount: number;
  ownerCount: number;
  staffCount: number;
  estimatedMrr: number;
  workspaceMode?: WorkspaceMode;
};

export type AdminOrganizationListResult = {
  items: OrganizationListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type BranchDetailsDto = {
  id: string;
  name: string;
  code?: string;
  staffCount: number;
  currency?: string;
  timezone?: string;
  workspaceId?: string;
};

export type UserLightDto = {
  id: string;
  email: string;
  displayName: string;
  department?: string;
  isLocked: boolean;
  branchId?: string | null;
  branchName?: string | null;
};

export type AdminOrganizationDetailsDto = {
  info: OrganizationListItem;
  maxBranches: number;
  maxStaff: number;
  currency: string;
  branches: BranchDetailsDto[];
  owners: UserLightDto[];
  staff: UserLightDto[];
};

export type AdminOrganizationAnalytics = {
  totalOrganizations: number;
  totalOwners: number;
  totalStaff: number;
  activeBranches: number;
  totalMrr: number;
};

export type CreateOrganizationRequest = {
  name: string;
  slug?: string;
  plan: OrgPlan;
  currency: string;
  maxBranches: number;
  maxStaff: number;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

export type UpdateOrganizationRequest = {
  name?: string | null;
  plan?: OrgPlan | null;
  maxBranches?: number | null;
  maxStaff?: number | null;
  baseCurrency?: string | null;
};

export type SuspendOrganizationRequest = {
  reason?: string | null;
};

export type CreateBranchRequest = {
  organizationId: string;
  name: string;
  code?: string;
  currency?: string;
  timezone?: string;
  address?: string;
  phone?: string;
};

export type UpdateBranchRequest = {
  name?: string | null;
  code?: string | null;
  currency?: string | null;
  timezone?: string | null;
  address?: string | null;
  phone?: string | null;
};

export type AddOwnerRequest = {
  organizationId: string;
  fullName: string;
  email: string;
  password: string;
};

export type AddStaffRequest = {
  organizationId: string;
  branchId?: string;
  fullName: string;
  email: string;
  department?: string;
  password: string;
};

export type ReassignStaffBranchRequest = {
  branchId?: string | null;
};

export type StaffReassignRequest = {
  branchId?: string | null;
  department?: string | null;
};

export type RouteDto = {
  id: string;
  organizationId: string;
  branchId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  assignedStaffCount: number;
  createdAt: string;
};

export type CreateRouteRequest = {
  organizationId: string;
  branchId?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
};

export type UpdateRouteRequest = {
  name?: string | null;
  code?: string | null;
  description?: string | null;
  isActive?: boolean | null;
};

export type BranchFinancialSummaryDto = {
  branchId: string;
  branchName: string;
  workspaceId?: string | null;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
};

export type OrgFinancialSummaryDto = {
  organizationId: string;
  organizationName: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  branches: BranchFinancialSummaryDto[];
};

export type LightOrganization = {
  id: string;
  name: string;
};

export type LightBranch = {
  id: string;
  name: string;
  organizationId: string;
  workspaceId?: string | null;
  code?: string;
  currency?: string;
};

export type BranchStatDto = {
  name: string;
  volume: number;
  percentage: number;
};

export type OrganizationOverviewDto = {
  name: string;
  branchCount: number;
  staffCount: number;
  totalFlow: number;
  branchVelocity: BranchStatDto[];
};

export type CreateOwnerStaffRequest = {
  fullName: string;
  email: string;
  password: string;
  branchId: string;
  department: string;
};

export type PricingConfiguration = {
  id: string;
  planName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  maxUsers: number;
  maxBranches: number;
  maxTransactionsPerMonth: number;
};

export type OrganizationFeatureToggleDto = {
  id: string;
  organizationId: string;
  featureKey: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type WorkspaceFeatureToggleDto = {
  id: string;
  workspaceId: string;
  featureKey: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type BranchFeatureToggleDto = {
  id: string;
  branchId: string;
  featureKey: string;
  isEnabled: boolean;
  updatedAt: string;
};

export type UserFeatureToggleDto = {
  id: string;
  userId: string;
  featureKey: string;
  isEnabled: boolean;
  updatedAt: string;
};


