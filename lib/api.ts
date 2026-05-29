import type {
  Account,
  AdminAlert,
  AdminAnalyticsDashboard,
  AdminAnalyticsOverview,
  AdminAuditListResult,
  AdminCreateUserRequest,
  AdminCreateWorkspaceRequest,
  AdminCreateUserResponse,
  AdminUserListResult,
  AdminWorkspaceListItem,
  AdminWorkspaceListResult,
  AdminExpenseCategoryAgg,
  AiUsageSummaryResult,
  AuthMeResponse,
  AuthResponse,
  BranchFeatureToggleDto,
  Category,
  DashboardSummary,
  FeatureFlagDto,
  GlobalSettingDto,
  InviteAcceptRequest,
  LoginRequest,
  PagedResult,
  RegisterRequest,
  ReportSummary,
  SubscriptionPlan,
  Transaction,
  TransactionSearchParams,
  UpdateTransactionRequest,
  Transfer,
  TransferRequest,
  Workspace,
  WorkspaceRoleName,
  AdminOrganizationListResult,
  AdminOrganizationAnalytics,
  LightOrganization,
  OrganizationFeatureToggleDto,
  UserFeatureToggleDto,
  WorkspaceFeatureToggleDto,
  LightBranch,
  AdminOrganizationDetailsDto,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  SuspendOrganizationRequest,
  CreateBranchRequest,
  UpdateBranchRequest,
  AddOwnerRequest,
  AddStaffRequest,
  ReassignStaffBranchRequest,
  StaffReassignRequest,
  RouteDto,
  CreateRouteRequest,
  UpdateRouteRequest,
  OrgFinancialSummaryDto,
  OrganizationOverviewDto,
  AdminUserListItem,
  CreateOwnerStaffRequest,
  StaffDashboardDto,
  StaffTask,
  StaffNotification,
  PricingConfiguration
} from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5014';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  token?: string;
  body?: unknown;
};

let accessTokenProvider: (() => string | null) | null = null;
let workspaceIdProvider: (() => string | null) | null = null;
let unauthorizedHandler: (() => void) | null = null;

type ApiErrorBody = {
  error?: string;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
};

export function configureApiClient(options: {
  getAccessToken: () => string | null;
  getWorkspaceId?: () => string | null;
  onUnauthorized: () => void;
}) {
  accessTokenProvider = options.getAccessToken;
  workspaceIdProvider = options.getWorkspaceId ?? null;
  unauthorizedHandler = options.onUnauthorized;
}

function pathNeedsWorkspaceHeader(path: string, method = 'GET'): boolean {
  const queryIndex = path.indexOf('?');
  const p = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
  if (!p.startsWith('/api/')) return false;
  if (p.startsWith('/api/auth')) return false;
  if (p.startsWith('/api/admin')) return false;
  if (p.startsWith('/api/subscription')) return false;
  if (p.startsWith('/api/backup')) return false;
  if (p.startsWith('/api/groups')) return false;
  if (p.startsWith('/api/owner')) return false;
  if (p.startsWith('/api/staff')) return false;
  const normalized = p.replace(/\/$/, '') || '/';
  const verb = method.toUpperCase();
  if (normalized === '/api/workspaces' && (verb === 'GET' || verb === 'POST')) return false;
  const singleWorkspace = /^\/api\/workspaces\/([^/]+)$/.exec(normalized);
  if (singleWorkspace?.[1] && /^[0-9a-fA-F-]{36}$/i.test(singleWorkspace[1]) && (verb === 'PUT' || verb === 'DELETE')) {
    return false;
  }
  return true;
}

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;

  if (hasBody) {
    headers.set('Content-Type', 'application/json');
  }

  const token = options.token ?? accessTokenProvider?.();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const pathOnly = path.startsWith('http') ? (() => { try { return new URL(path).pathname; } catch { return path; } })() : path;
  if (pathNeedsWorkspaceHeader(pathOnly, options.method ?? 'GET')) {
    const ws = workspaceIdProvider?.();
    if (ws) {
      headers.set('X-Workspace-Id', ws);
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiError(
      `Unable to reach HexaTrack API at ${API_BASE_URL}. Start the ASP.NET backend, verify NEXT_PUBLIC_API_BASE_URL, and confirm CORS allows http://localhost:3000.`,
      0,
      error,
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: 'Request failed' }))) as ApiErrorBody;
    if (response.status === 401) {
      unauthorizedHandler?.();
    }
    throw new ApiError(getErrorMessage(body, response.status), response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function getErrorMessage(body: ApiErrorBody, status: number) {
  if (body.error) return body.error;
  if (body.detail) return body.detail;

  const validationMessage = body.errors ? Object.values(body.errors).flat().at(0) : null;
  if (validationMessage) return validationMessage;

  if (body.title && status !== 500) return body.title;
  return status === 0 ? 'Unable to reach HexaTrack API.' : 'Request failed. Please try again.';
}

/** Older APIs may omit enterprise fields; prevents admin UI crashes. */
function normalizeAdminAnalyticsDashboard(data: AdminAnalyticsDashboard): AdminAnalyticsDashboard {
  const newUsersByDay = data.newUsersByDay ?? [];
  const newWorkspacesByDay = data.newWorkspacesByDay ?? [];
  let cumulativeWorkspacesByDay = data.cumulativeWorkspacesByDay ?? [];
  if (cumulativeWorkspacesByDay.length === 0 && newWorkspacesByDay.length > 0) {
    let run = 0;
    cumulativeWorkspacesByDay = newWorkspacesByDay.map((d) => {
      run += d.value;
      return { date: d.date, value: run };
    });
  }

  return {
    newUsersByDay,
    cumulativeUsersByDay: data.cumulativeUsersByDay ?? [],
    newWorkspacesByDay,
    cumulativeWorkspacesByDay,
    tokenUsageByDay: data.tokenUsageByDay ?? [],
    activeSubscriptionsByPlan: data.activeSubscriptionsByPlan ?? [],
    estimatedMrrInr: data.estimatedMrrInr ?? 0,
    payingSubscriptionCount: data.payingSubscriptionCount ?? 0,
    averageRevenuePerPayingUserInr: data.averageRevenuePerPayingUserInr ?? 0,
    activeUsersByDay: data.activeUsersByDay ?? [],
    transactionsByDay: data.transactionsByDay ?? [],
    newPayingSubscriptionsByDay: data.newPayingSubscriptionsByDay ?? [],
    tokenEstimatedCostByDay: data.tokenEstimatedCostByDay ?? [],
    expenseCategoryTotals: data.expenseCategoryTotals ?? [],
    totalSystemIncome30d: data.totalSystemIncome30d ?? 0,
    totalSystemExpense30d: data.totalSystemExpense30d ?? 0,
    totalSystemNet30d: data.totalSystemNet30d ?? 0,
    totalActiveOrganizations: data.totalActiveOrganizations ?? 0,
    totalSuspendedOrganizations: data.totalSuspendedOrganizations ?? 0,
    totalIndividualUsers: data.totalIndividualUsers ?? 0,
    totalOrganizationUsers: data.totalOrganizationUsers ?? 0,
    totalWorkspaces: data.totalWorkspaces ?? (data.cumulativeWorkspacesByDay?.at(-1)?.value ?? 0),
    activeBranches: data.activeBranches ?? 0,
    totalTransactions: data.totalTransactions ?? 0,
    activeSessions: data.activeSessions ?? 0,
    organizationGrowthByDay: data.organizationGrowthByDay ?? [],
    workspaceActivityByDay: data.workspaceActivityByDay ?? [],
  };
}

export const hexaTrackApi = {
  auth: {
    login: (payload: LoginRequest) =>
      apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: payload,
      }),
    register: (payload: RegisterRequest) =>
      apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: payload,
      }),
    google: (idToken: string) =>
      apiRequest<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: { idToken },
      }),
    me: (tokenOverride?: string) =>
      apiRequest<AuthMeResponse>('/api/auth/me', {
        method: 'GET',
        token: tokenOverride,
      }),
    acceptInvite: (payload: InviteAcceptRequest) =>
      apiRequest<AuthResponse>('/api/auth/invite/accept', {
        method: 'POST',
        body: payload,
      }),
  },
  featureFlags: () => apiRequest<Record<string, boolean>>('/api/feature-flags'),
  accounts: {
    list: () => apiRequest<Account[]>('/api/accounts'),
    available: (branchId?: string) =>
      apiRequest<Account[]>(`/api/accounts/available${branchId ? `?branchId=${branchId}` : ''}`),
  },
  createAccount: (payload: { name: string; type: Account['type']; currency: string; openingBalance: number }) =>
    apiRequest<Account>('/api/accounts', { method: 'POST', body: payload }),
  transfer: (payload: TransferRequest) =>
    apiRequest<Transfer>('/api/accounts/transfer', {
      method: 'POST',
      body: payload,
    }),
  categories: {
    list: (params?: { branchId?: string; type?: string }) => {
      const q = new URLSearchParams();
      if (params?.branchId) q.set('branchId', params.branchId);
      if (params?.type) q.set('type', params.type);
      const qs = q.toString();
      return apiRequest<Category[]>(`/api/categories${qs ? `?${qs}` : ''}`);
    },
    create: (payload: {
      name: string;
      type: Category['type'];
      parentCategoryId?: string | null;
      color?: string | null;
      icon?: string | null;
    }) =>
      apiRequest<Category>('/api/categories', {
        method: 'POST',
        body: payload,
      }),
    update: (id: string, payload: { name?: string | null; color?: string | null; icon?: string | null }) =>
      apiRequest<Category>(`/api/categories/${id}`, {
        method: 'PUT',
        body: payload,
      }),
    archive: (id: string) => apiRequest<void>(`/api/categories/${id}/archive`, { method: 'POST' }),
    unarchive: (id: string) => apiRequest<void>(`/api/categories/${id}/unarchive`, { method: 'POST' }),
    subcategories: {
      list: (parentId: string) => apiRequest<Category[]>(`/api/categories/${parentId}/subcategories`),
      create: (parentId: string, payload: { name: string; color?: string | null; icon?: string | null }) =>
        apiRequest<Category>(`/api/categories/${parentId}/subcategories`, {
          method: 'POST',
          body: payload,
        }),
      delete: (parentId: string, subcategoryId: string) =>
        apiRequest<void>(`/api/categories/${parentId}/subcategories/${subcategoryId}`, {
          method: 'DELETE',
        }),
    },
  },
  tags: {
    list: () => apiRequest<{ id: string; name: string }[]>('/api/tags'),
    upsert: (name: string) =>
      apiRequest<{ id: string; name: string }>('/api/tags', {
        method: 'POST',
        body: { name },
      }),
  },
  recurring: {
    list: () => apiRequest('/api/recurring-transactions'),
    create: (payload: unknown) =>
      apiRequest('/api/recurring-transactions', {
        method: 'POST',
        body: payload,
      }),
  },
  transactions: {
    list: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const suffix = params.size ? `?${params.toString()}` : '';
      return apiRequest<Transaction[]>(`/api/transactions${suffix}`);
    },
    search: (params: TransactionSearchParams) => {
      const q = new URLSearchParams();
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      if (params.accountId) q.set('accountId', params.accountId);
      if (params.categoryId) q.set('categoryId', params.categoryId);
      if (params.tagId) q.set('tagId', params.tagId);
      if (params.query?.trim()) q.set('query', params.query.trim());
      q.set('page', String(params.page ?? 1));
      q.set('pageSize', String(params.pageSize ?? 30));
      if (params.type) q.set('type', params.type);
      if (params.transfersOnly) q.set('transfersOnly', 'true');
      const qs = q.toString();
      return apiRequest<PagedResult<Transaction>>(`/api/transactions/search?${qs}`);
    },
    update: (id: string, payload: UpdateTransactionRequest) =>
      apiRequest<Transaction>(`/api/transactions/${id}`, {
        method: 'PUT',
        body: payload,
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/transactions/${id}`, {
        method: 'DELETE',
      }),
  },
  createTransaction: (payload: unknown) =>
    apiRequest<Transaction>('/api/transactions', {
      method: 'POST',
      body: payload,
    }),
  income: {
    create: (payload: unknown) => apiRequest<Transaction>('/api/income', { method: 'POST', body: payload }),
  },
  expenses: {
    create: (payload: unknown) => apiRequest<Transaction>('/api/expenses', { method: 'POST', body: payload }),
  },
  ledger: (page = 1, pageSize = 100) =>
    apiRequest<{ items: any[]; page: number; pageSize: number; totalCount: number; consolidatedBalance: number }>(`/api/ledger?page=${page}&pageSize=${pageSize}`),
  analytics: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiRequest<any>(`/api/analytics${qs ? `?${qs}` : ''}`);
  },
  reportSummary: (from: string, to: string) =>
    apiRequest<ReportSummary>(`/api/reports/summary?from=${from}&to=${to}`),
  dashboard: {
    summary: (from: string, to: string) =>
      apiRequest<DashboardSummary>(`/api/dashboard/summary?from=${from}&to=${to}`),
  },
  admin: {
    users: (
      q?: string,
      page = 1,
      pageSize = 20,
      filters?: {
        organizationUsersOnly?: boolean;
        individualUsersOnly?: boolean;
        branchUsersOnly?: boolean;
      }
    ) => {
      const params = new URLSearchParams();
      if (q?.trim()) params.set('q', q.trim());
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filters?.organizationUsersOnly) params.set('organizationUsersOnly', 'true');
      if (filters?.individualUsersOnly) params.set('individualUsersOnly', 'true');
      if (filters?.branchUsersOnly) params.set('branchUsersOnly', 'true');
      const qs = params.toString();
      return apiRequest<AdminUserListResult>(`/api/admin/users?${qs}`);
    },
    createUser: (payload: AdminCreateUserRequest) =>
      apiRequest<AdminCreateUserResponse>('/api/admin/users', {
        method: 'POST',
        body: payload,
      }),
    updateUser: (userId: string, payload: { email: string; fullName: string; department?: string | null; organizationRole?: string | null }) =>
      apiRequest<void>(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: payload,
      }),
    deleteUser: (userId: string) =>
      apiRequest<void>(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    setLocked: (userId: string, locked: boolean) =>
      apiRequest<void>(`/api/admin/users/${userId}/locked`, {
        method: 'PUT',
        body: { locked },
      }),
    setSubscription: (userId: string, plan: SubscriptionPlan) =>
      apiRequest<void>(`/api/admin/users/${userId}/subscription`, {
        method: 'PUT',
        body: { plan },
      }),
    resetPassword: (userId: string, newPassword: string) =>
      apiRequest<void>(`/api/admin/users/${userId}/reset-password`, {
        method: 'PUT',
        body: { password: newPassword },
      }),
    setSuperAdmin: (userId: string, isSuperAdmin: boolean) =>
      apiRequest<void>(`/api/admin/users/${userId}/superadmin`, {
        method: 'PUT',
        body: { isSuperAdmin },
      }),
    workspaces: (q?: string, page = 1, pageSize = 20) => {
      const params = new URLSearchParams();
      if (q?.trim()) params.set('q', q.trim());
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      return apiRequest<AdminWorkspaceListResult>(`/api/admin/workspaces?${params.toString()}`);
    },
    createWorkspace: (payload: AdminCreateWorkspaceRequest) =>
      apiRequest<AdminWorkspaceListItem>('/api/admin/workspaces', { method: 'POST', body: payload }),
    repairWorkspaceAccess: (workspaceId: string) =>
      apiRequest<void>(`/api/admin/workspaces/${workspaceId}/repair-access`, { method: 'POST' }),
    deleteWorkspace: (workspaceId: string) =>
      apiRequest<void>(`/api/admin/workspaces/${workspaceId}`, { method: 'DELETE' }),
    assignWorkspaceUser: (workspaceId: string, userId: string, role: WorkspaceRoleName) =>
      apiRequest<void>(`/api/admin/workspaces/${workspaceId}/members`, { method: 'POST', body: { userId, role } }),
    changeWorkspaceRole: (workspaceId: string, userId: string, role: WorkspaceRoleName) =>
      apiRequest<void>(`/api/admin/workspaces/${workspaceId}/members/${userId}/role`, { method: 'PUT', body: { role } }),
    removeWorkspaceUser: (workspaceId: string, userId: string) =>
      apiRequest<void>(`/api/admin/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' }),
    featureFlags: () => apiRequest<FeatureFlagDto[]>('/api/admin/feature-flags'),
    setFeatureFlag: (key: string, value: string) =>
      apiRequest<void>(`/api/admin/feature-flags/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: { value },
      }),
    orgFeatureFlags: (orgId: string) =>
      apiRequest<OrganizationFeatureToggleDto[]>(`/api/admin/feature-flags/organizations/${orgId}`),
    setOrgFeatureFlag: (orgId: string, key: string, isEnabled: boolean) =>
      apiRequest<void>(`/api/admin/feature-flags/organizations/${orgId}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: { isEnabled },
      }),
    workspaceFeatureFlags: (workspaceId: string) =>
      apiRequest<WorkspaceFeatureToggleDto[]>(`/api/admin/feature-flags/workspaces/${workspaceId}`),
    setWorkspaceFeatureFlag: (workspaceId: string, key: string, isEnabled: boolean) =>
      apiRequest<void>(`/api/admin/feature-flags/workspaces/${workspaceId}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: { isEnabled },
      }),
    branchFeatureFlags: (branchId: string) =>
      apiRequest<BranchFeatureToggleDto[]>(`/api/admin/feature-flags/branches/${branchId}`),
    setBranchFeatureFlag: (branchId: string, key: string, isEnabled: boolean) =>
      apiRequest<void>(`/api/admin/feature-flags/branches/${branchId}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: { isEnabled },
      }),
    userFeatureFlags: (userId: string) =>
      apiRequest<UserFeatureToggleDto[]>(`/api/admin/feature-flags/users/${userId}`),
    setUserFeatureFlag: (userId: string, key: string, isEnabled: boolean) =>
      apiRequest<void>(`/api/admin/feature-flags/users/${userId}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: { isEnabled },
      }),
    auditLog: (page = 1, pageSize = 50, q?: string, actionKeyword?: string, targetType?: string) => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (q?.trim()) params.set('q', q.trim());
      if (actionKeyword?.trim()) params.set('actionKeyword', actionKeyword.trim());
      if (targetType?.trim()) params.set('targetType', targetType.trim());
      return apiRequest<AdminAuditListResult>(`/api/admin/audit?${params.toString()}`);
    },
    exportAuditLogUrl: (q?: string, actionKeyword?: string, targetType?: string) => {
      const params = new URLSearchParams();
      if (q?.trim()) params.set('q', q.trim());
      if (actionKeyword?.trim()) params.set('actionKeyword', actionKeyword.trim());
      if (targetType?.trim()) params.set('targetType', targetType.trim());
      return `/api/admin/audit/export?${params.toString()}`;
    },
    alerts: {
      getActive: () => apiRequest<AdminAlert[]>('/api/admin/alerts'),
      getHistory: (page = 1, pageSize = 50) =>
        apiRequest<AdminAlert[]>(`/api/admin/alerts/history?page=${page}&pageSize=${pageSize}`),
      resolve: (id: string) =>
        apiRequest<void>(`/api/admin/alerts/${id}/resolve`, { method: 'POST' }),
    },
    aiUsage: (days = 30) =>
      apiRequest<AiUsageSummaryResult>(`/api/admin/ai/usage?days=${days}`),
    analyticsOverview: () =>
      apiRequest<AdminAnalyticsOverview>('/api/admin/analytics/overview'),
    analyticsDashboard: async (days = 90) => {
      const raw = await apiRequest<AdminAnalyticsDashboard>(`/api/admin/analytics/dashboard?days=${days}`);
      return normalizeAdminAnalyticsDashboard(raw);
    },
    categoryTotals: (days = 30, orgId?: string) => {
      const params = new URLSearchParams();
      params.set('days', String(days));
      if (orgId) params.set('orgId', orgId);
      return apiRequest<AdminExpenseCategoryAgg[]>(`/api/admin/analytics/categories?${params.toString()}`);
    },
    globalSettings: () => apiRequest<GlobalSettingDto[]>('/api/admin/global-settings'),
    setGlobalSetting: (key: string, value: string) =>
      apiRequest<void>(`/api/admin/global-settings/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: { value },
      }),
    pricing: {
      list: () => apiRequest<PricingConfiguration[]>('/api/admin/pricing'),
      upsert: (payload: Partial<PricingConfiguration> & { planName: string; monthlyPrice: number; yearlyPrice: number; currency: string; trialDays: number; maxUsers: number; maxBranches: number; maxTransactionsPerMonth: number; isActive: boolean }) =>
        apiRequest<PricingConfiguration>('/api/admin/pricing', { method: 'POST', body: payload }),
      update: (id: string, payload: { planName: string; monthlyPrice: number; yearlyPrice: number; currency: string; trialDays: number; maxUsers: number; maxBranches: number; maxTransactionsPerMonth: number; isActive: boolean }) =>
        apiRequest<PricingConfiguration>(`/api/admin/pricing/${id}`, { method: 'PUT', body: payload }),
      delete: (id: string) =>
        apiRequest<void>(`/api/admin/pricing/${id}`, { method: 'DELETE' }),
    },
    organizations: (query?: string, page = 1, pageSize = 20) => {
      const p = new URLSearchParams();
      if (query) p.set('query', query);
      p.set('page', String(page));
      p.set('pageSize', String(pageSize));
      return apiRequest<AdminOrganizationListResult>(`/api/admin/organizations?${p.toString()}`);
    },
    individualUsers: (query?: string, page = 1, pageSize = 20) => {
      const p = new URLSearchParams();
      if (query) p.set('query', query);
      p.set('page', String(page));
      p.set('pageSize', String(pageSize));
      return apiRequest<AdminUserListResult>(`/api/admin/users/individual?${p.toString()}`);
    },
    organizationAnalytics: () =>
      apiRequest<AdminOrganizationAnalytics>('/api/admin/organizations/analytics'),
    allOrganizations: () =>
      apiRequest<LightOrganization[]>('/api/admin/organizations/all'),
    allBranches: (organizationId?: string) =>
      apiRequest<LightBranch[]>(`/api/admin/organizations/branches${organizationId ? `?organizationId=${organizationId}` : ''}`),
    getOrganizationDetails: (id: string) =>
      apiRequest<AdminOrganizationDetailsDto>(`/api/admin/organizations/${id}`),
    getOrganizationFinancials: (id: string, days = 30) =>
      apiRequest<OrgFinancialSummaryDto>(`/api/admin/organizations/${id}/financials?days=${days}`),
    createOrganization: (payload: CreateOrganizationRequest) =>
      apiRequest<any>('/api/admin/organizations', {
        method: 'POST',
        body: payload,
      }),
    updateOrganization: (id: string, payload: UpdateOrganizationRequest) =>
      apiRequest<any>(`/api/admin/organizations/${id}`, {
        method: 'PUT',
        body: payload,
      }),
    suspendOrganization: (id: string, payload: SuspendOrganizationRequest) =>
      apiRequest<void>(`/api/admin/organizations/${id}/suspend`, {
        method: 'POST',
        body: payload,
      }),
    activateOrganization: (id: string) =>
      apiRequest<void>(`/api/admin/organizations/${id}/activate`, { method: 'POST' }),
    deleteOrganization: (id: string) =>
      apiRequest<void>(`/api/admin/organizations/${id}`, { method: 'DELETE' }),
    createBranch: (payload: CreateBranchRequest) =>
      apiRequest<any>('/api/admin/organizations/branch', {
        method: 'POST',
        body: payload,
      }),
    getBranch: (id: string) =>
      apiRequest<LightBranch>(`/api/admin/organizations/branch/${id}`),
    updateBranch: (id: string, payload: UpdateBranchRequest) =>
      apiRequest<any>(`/api/admin/organizations/branch/${id}`, {
        method: 'PUT',
        body: payload,
      }),
    deleteBranch: (id: string) =>
      apiRequest<void>(`/api/admin/organizations/branch/${id}`, { method: 'DELETE' }),
    addOwner: (payload: AddOwnerRequest) =>
      apiRequest<any>('/api/admin/organizations/owner', {
        method: 'POST',
        body: payload,
      }),
    addStaff: (payload: AddStaffRequest) =>
      apiRequest<any>('/api/admin/organizations/staff', {
        method: 'POST',
        body: payload,
      }),
    reassignStaffBranch: (userId: string, payload: ReassignStaffBranchRequest) =>
      apiRequest<void>(`/api/admin/organizations/staff/${userId}/branch`, {
        method: 'PUT',
        body: payload,
      }),
    removeStaff: (userId: string) =>
      apiRequest<void>(`/api/admin/organizations/staff/${userId}`, { method: 'DELETE' }),
    routes: {
      list: (organizationId?: string, branchId?: string, page = 1, pageSize = 20) => {
        const params = new URLSearchParams();
        if (organizationId) params.set('organizationId', organizationId);
        if (branchId) params.set('branchId', branchId);
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        return apiRequest<PagedResult<RouteDto>>(`/api/admin/routes?${params.toString()}`);
      },
      get: (id: string) => apiRequest<RouteDto>(`/api/admin/routes/${id}`),
      create: (payload: CreateRouteRequest) =>
        apiRequest<RouteDto>('/api/admin/routes', { method: 'POST', body: payload }),
      update: (id: string, payload: UpdateRouteRequest) =>
        apiRequest<RouteDto>(`/api/admin/routes/${id}`, { method: 'PUT', body: payload }),
      delete: (id: string) => apiRequest<void>(`/api/admin/routes/${id}`, { method: 'DELETE' }),
      assignStaff: (id: string, userId: string) =>
        apiRequest<void>(`/api/admin/routes/${id}/assign-staff/${userId}`, { method: 'POST' }),
      unassignStaff: (id: string, userId: string) =>
        apiRequest<void>(`/api/admin/routes/${id}/assign-staff/${userId}`, { method: 'DELETE' }),
    },
  },
  staff: {
    dashboard: () => apiRequest<StaffDashboardDto>('/api/staff/dashboard'),
    tasks: () => apiRequest<StaffTask[]>('/api/staff/tasks'),
    transactions: (params: TransactionSearchParams = {}) => {
      const q = new URLSearchParams();
      if (params.query?.trim()) q.set('query', params.query.trim());
      if (params.type) q.set('type', params.type);
      q.set('page', String(params.page ?? 1));
      q.set('pageSize', String(params.pageSize ?? 50));
      return apiRequest<PagedResult<Transaction>>(`/api/staff/transactions?${q.toString()}`);
    },
    createTransaction: (payload: unknown) =>
      apiRequest<Transaction>('/api/staff/transactions', { method: 'POST', body: payload }),
    createIncome: (payload: unknown) =>
      apiRequest<Transaction>('/api/staff/income', { method: 'POST', body: payload }),
    createExpense: (payload: unknown) =>
      apiRequest<Transaction>('/api/staff/expenses', { method: 'POST', body: payload }),
    assignBranch: (userId: string, branchId: string) =>
      apiRequest<AdminUserListItem>('/api/staff/assign-branch', {
        method: 'POST',
        body: { userId, branchId },
      }),
    reassign: (id: string, payload: StaffReassignRequest) =>
      apiRequest<AdminUserListItem>(`/api/staff/${id}/reassign`, {
        method: 'PATCH',
        body: payload,
      }),
  },
  branches: {
    staff: (id: string) => apiRequest<AdminUserListItem[]>(`/api/branches/${id}/staff`),
  },
  workspaces: {
    list: () => apiRequest<Workspace[]>('/api/workspaces'),
    create: (payload: { name: string; type: Workspace['type']; currency: string }) =>
      apiRequest<Workspace>('/api/workspaces', { method: 'POST', body: payload }),
    createInvite: (workspaceId: string, payload: { email: string; role: WorkspaceRoleName }) =>
      apiRequest<{ token: string }>(`/api/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        body: payload,
      }),
  },
  owner: {
    overview: () =>
      apiRequest<OrganizationOverviewDto>('/api/owner/overview'),
    listBranches: () =>
      apiRequest<LightBranch[]>('/api/owner/branches'),
    listStaff: (branchId?: string, query?: string) => {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (query?.trim()) params.set('query', query.trim());
      const qs = params.toString();
      return apiRequest<AdminUserListItem[]>(`/api/owner/staff${qs ? `?${qs}` : ''}`);
    },
    branchStaff: (branchId: string) =>
      apiRequest<AdminUserListItem[]>(`/api/owner/branches/${branchId}/staff`),
    createStaff: (payload: CreateOwnerStaffRequest) =>
      apiRequest<any>('/api/owner/staff', { method: 'POST', body: payload }),
    assets: {
      list: () => apiRequest<any[]>('/api/owner/assets'),
      create: (payload: any) => apiRequest<any>('/api/owner/assets', { method: 'POST', body: payload })
    },
    integrations: {
      list: () => apiRequest<any[]>('/api/owner/integrations'),
      connect: (provider: string) => apiRequest<any>('/api/owner/integrations/connect', { method: 'POST', body: { provider } })
    },
    ledger: () => apiRequest<any[]>('/api/owner/ledger'),
  },
};
