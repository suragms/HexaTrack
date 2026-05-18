'use client';

import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Command,
  Download,
  CreditCard,
  Eye,
  EyeOff,
  Flag,
  Globe,
  Key,
  Loader2,
  Lock,
  LockKeyhole,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { ApiError, hexaTrackApi } from '@/lib/api';
import type {
  AdminAlert,
  AdminAnalyticsDashboard,
  AdminAnalyticsOverview,
  AdminAuditListResult,
  AdminUserListItem,
  AdminUserListResult,
  AdminWorkspaceListResult,
  AiUsageSummaryResult,
  FeatureFlagDto,
  GlobalSettingDto,
  SubscriptionPlan,
  WorkspaceType,
  LightOrganization,
} from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import { AdminCommandPalette, type AdminCommandItem } from '@/components/admin/admin-command-palette';
import { ControlCenterOverview } from '@/components/admin/control-center-overview';
import { CreateUserModal } from '@/components/admin/create-user-modal';
import { ResetPasswordModal } from '@/components/admin/reset-password-modal';
import OrganizationsManager from '@/components/admin/organizations-manager';
import { BrandMark } from '@/components/ui/brand';

type AdminSection = 'users' | 'workspaces' | 'organizations' | 'transactions' | 'flags' | 'audit' | 'ai' | 'analytics' | 'settings' | 'subscriptions' | 'notifications' | 'security';

const PAGE_SIZE = 20;
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = ['Free', 'Basic', 'Pro', 'ProMax'];
const WORKSPACE_PAGE_SIZE = 20;
const AUDIT_PAGE_SIZE = 25;

/** Illustrative USD per 1M tokens for admin estimates (not actual billing). */
const AI_EST_PROMPT_USD_PER_MILLION = 3;
const AI_EST_COMPLETION_USD_PER_MILLION = 15;

type AiUsageDayFilter = 7 | 30 | 90;

function estimateAiCostUsd(promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens / 1_000_000) * AI_EST_PROMPT_USD_PER_MILLION +
    (completionTokens / 1_000_000) * AI_EST_COMPLETION_USD_PER_MILLION
  );
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTokenCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function workspaceTypeBadgeClasses(type: WorkspaceType): string {
  switch (type) {
    case 'Personal':
      return 'border-[rgba(79,140,255,0.35)] bg-[rgba(79,140,255,0.12)] text-[#4F8CFF]';
    case 'Business':
      return 'border-[rgba(31,209,139,0.35)] bg-[rgba(31,209,139,0.12)] text-[#1FD18B]';
    case 'Family':
      return 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-[#F59E0B]';
    default:
      return 'border-white/[0.06] bg-white/[0.06] text-[#8B9BB4]';
  }
}

function formatAdminDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function isBooleanFlagValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'true' || v === 'false';
}

function parseBooleanFlag(value: string): boolean {
  return value.trim().toLowerCase() === 'true';
}

function auditActionBadgeClasses(action: string): string {
  const act = action.toLowerCase();
  if (act.includes('create')) {
    return 'bg-[rgba(16,185,129,0.2)] text-[#A855F7]';
  }
  if (act.includes('delete')) {
    return 'bg-[#FF5C75]/20 text-[#FF5C75]';
  }
  if (act.includes('lock') && !act.includes('unlock')) {
    return 'bg-[#F59E0B]/20 text-[#F59E0B]';
  }
  if (act.includes('unlock')) {
    return 'bg-[#1FD18B]/20 text-[#1FD18B]';
  }
  if (act.includes('subscription')) {
    return 'bg-[#4F8CFF]/20 text-[#4F8CFF]';
  }
  return 'bg-white/[0.06] text-[#8B9BB4]';
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

function AdminDashboardContent() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const logout = useAuthStore((s) => s.logout);

  const [section, setSection] = useState<AdminSection>('analytics');
  const searchParams = useSearchParams();

  // Sync Section from URL Params
  useEffect(() => {
    const requestedSection = searchParams.get('section') as AdminSection | null;
    if (requestedSection && ['analytics','workspaces','organizations','users','transactions','subscriptions','ai','notifications','security','audit','flags','settings'].includes(requestedSection)) {
      setSection(requestedSection);
    }
  }, [searchParams]);

  // Provide state sync helper that updates URL for persistence
  const updateSection = (nextSection: AdminSection) => {
    setSection(nextSection);
    // Push state without reload to keep URL persistent for browser back button support
    window.history.pushState(null, '', `/admin?section=${nextSection}`);
  };

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [usersData, setUsersData] = useState<AdminUserListResult | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [workspaceSearchInput, setWorkspaceSearchInput] = useState('');
  const [workspaceDebouncedSearch, setWorkspaceDebouncedSearch] = useState('');
  const [workspacePage, setWorkspacePage] = useState(1);
  const [workspacesData, setWorkspacesData] = useState<AdminWorkspaceListResult | null>(null);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);
  const [flagsData, setFlagsData] = useState<FeatureFlagDto[] | null>(null);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [flagDrafts, setFlagDrafts] = useState<Record<string, string>>({});
  const [flagSavingKey, setFlagSavingKey] = useState<string | null>(null);

  const [flagsSubTab, setFlagsSubTab] = useState<'global' | 'org' | 'user'>('global');
  const [orgFlagsOrgId, setOrgFlagsOrgId] = useState<string>('');
  const [orgFlagsData, setOrgFlagsData] = useState<Record<string, boolean>>({});
  const [orgFlagsLoading, setOrgFlagsLoading] = useState(false);
  
  const [userFlagsUserId, setUserFlagsUserId] = useState<string>('');
  const [userFlagsData, setUserFlagsData] = useState<Record<string, boolean>>({});
  const [userFlagsLoading, setUserFlagsLoading] = useState(false);
  const [flagsOrgs, setFlagsOrgs] = useState<LightOrganization[]>([]);
  const [flagsUsers, setFlagsUsers] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<AdminAuditListResult | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditQuery, setAuditQuery] = useState('');
  const [auditActionKeyword, setAuditActionKeyword] = useState('');
  const [auditTargetType, setAuditTargetType] = useState('');

  const [activeAlerts, setActiveAlerts] = useState<AdminAlert[] | null>(null);
  const [alertsHistory, setAlertsHistory] = useState<AdminAlert[] | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [alertsTab, setAlertsTab] = useState<'active' | 'history'>('active');
  const [alertsHistoryPage, setAlertsHistoryPage] = useState(1);
  const [aiData, setAiData] = useState<AiUsageSummaryResult | null>(null);
  const [aiDays, setAiDays] = useState<AiUsageDayFilter>(30);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [overviewData, setOverviewData] = useState<AdminAnalyticsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<AdminAnalyticsDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState(30);
  const [overviewRefreshedAt, setOverviewRefreshedAt] = useState<Date | null>(null);
  const [auditFeedData, setAuditFeedData] = useState<AdminAuditListResult | null>(null);
  const [auditFeedLoading, setAuditFeedLoading] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const [settingsData, setSettingsData] = useState<GlobalSettingDto[] | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [settingSavingKey, setSettingSavingKey] = useState<string | null>(null);

  const [rowPending, setRowPending] = useState<{
    userId: string;
    kind: 'lock' | 'delete' | 'plan' | 'superadmin';
  } | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordUserEmail, setResetPasswordUserEmail] = useState<string | null>(null);

  const router = useRouter();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(typeof window !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform));
  }, []);

  const commandItems = useMemo<AdminCommandItem[]>(
    () => [
      {
        id: 'go-users',
        label: 'Users',
        keywords: ['accounts', 'people', 'members'],
        icon: Users,
        onSelect: () => updateSection('users'),
      },
      {
        id: 'go-workspaces',
        label: 'Workspaces',
        keywords: ['orgs', 'teams'],
        icon: Globe,
        onSelect: () => updateSection('workspaces'),
      },
      {
        id: 'go-orgs',
        label: 'Organizations',
        keywords: ['companies', 'groups'],
        icon: Building2,
        onSelect: () => updateSection('organizations'),
      },
      {
        id: 'go-tx',
        label: 'Transactions',
        keywords: ['monitoring', 'ledger', 'audits'],
        icon: Activity,
        onSelect: () => updateSection('transactions'),
      },
      {
        id: 'go-sub',
        label: 'Subscriptions',
        keywords: ['billing', 'plans'],
        icon: CreditCard,
        onSelect: () => updateSection('subscriptions'),
      },
      {
        id: 'go-flags',
        label: 'Feature flags',
        keywords: ['toggles', 'features'],
        icon: Flag,
        onSelect: () => updateSection('flags'),
      },
      {
        id: 'go-audit',
        label: 'Audit log',
        keywords: ['security', 'events', 'activity'],
        icon: ClipboardList,
        onSelect: () => updateSection('audit'),
      },
      {
        id: 'go-ai',
        label: 'AI usage',
        keywords: ['tokens', 'claude', 'usage', 'zap'],
        icon: Zap,
        onSelect: () => updateSection('ai'),
      },
      {
        id: 'go-analytics',
        label: 'Dashboard',
        hint: 'Metrics, charts, audit feed',
        keywords: ['home', 'analytics'],
        icon: BarChart3,
        onSelect: () => updateSection('analytics'),
      },
      {
        id: 'go-notes',
        label: 'Notifications',
        keywords: ['alerts', 'inbox'],
        icon: Bell,
        onSelect: () => updateSection('notifications'),
      },
      {
        id: 'go-sec',
        label: 'Security',
        keywords: ['vault', 'access'],
        icon: Shield,
        onSelect: () => updateSection('security'),
      },
      {
        id: 'go-settings',
        label: 'Platform settings',
        keywords: ['config', 'global'],
        icon: Settings,
        onSelect: () => updateSection('settings'),
      },
      {
        id: 'create-user',
        label: 'Create user',
        hint: 'Opens Users with modal',
        keywords: ['add', 'invite', 'new'],
        icon: UserPlus,
        onSelect: () => {
          updateSection('users');
          setCreateUserOpen(true);
        },
      },
      {
        id: 'exit-app',
        label: 'Exit to app',
        keywords: ['close', 'leave', 'home'],
        icon: Command,
        onSelect: () => router.push('/'),
      },
    ],
    [router],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => setWorkspaceDebouncedSearch(workspaceSearchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [workspaceSearchInput]);

  useEffect(() => {
    setWorkspacePage(1);
  }, [workspaceDebouncedSearch]);

  const loadUsers = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const result = await hexaTrackApi.admin.users(
        debouncedSearch || undefined,
        page,
        PAGE_SIZE,
      );
      setUsersData(result);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Unable to load users.';
      setUsersError(msg);
      setUsersData(null);
    } finally {
      setUsersLoading(false);
    }
  }, [debouncedSearch, hydrated, isSuperAdmin, page, user]);

  useEffect(() => {
    if (section !== 'users') return;
    void loadUsers();
  }, [loadUsers, section]);

  const loadWorkspaces = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setWorkspacesLoading(true);
    setWorkspacesError(null);
    try {
      const result = await hexaTrackApi.admin.workspaces(
        workspaceDebouncedSearch || undefined,
        workspacePage,
        WORKSPACE_PAGE_SIZE,
      );
      setWorkspacesData(result);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Unable to load workspaces.';
      setWorkspacesError(msg);
      setWorkspacesData(null);
    } finally {
      setWorkspacesLoading(false);
    }
  }, [hydrated, isSuperAdmin, user, workspaceDebouncedSearch, workspacePage]);

  useEffect(() => {
    if (section !== 'workspaces') return;
    void loadWorkspaces();
  }, [loadWorkspaces, section]);

  const loadFlags = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setFlagsLoading(true);
    setFlagsError(null);
    try {
      const list = await hexaTrackApi.admin.featureFlags();
      setFlagsData(list);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Unable to load feature flags.';
      setFlagsError(msg);
      setFlagsData(null);
    } finally {
      setFlagsLoading(false);
    }
  }, [hydrated, isSuperAdmin, user]);

  useEffect(() => {
    if (section !== 'flags') return;
    void loadFlags();
  }, [loadFlags, section]);

  useEffect(() => {
    if (!flagsData) return;
    setFlagDrafts(Object.fromEntries(flagsData.map((f) => [f.key, f.value])));
  }, [flagsData]);

  const loadOrgFlags = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setOrgFlagsLoading(true);
    try {
      const res = await hexaTrackApi.admin.orgFeatureFlags(orgId);
      const dict: Record<string, boolean> = {};
      const flagsList = ['EnableOrganizations', 'EnableBranches', 'EnableAI', 'EnableAnalytics', 'EnableBudgets', 'EnableRecurringTransactions'];
      flagsList.forEach(k => {
        dict[k] = false;
      });
      res.forEach(item => {
        dict[item.featureKey] = item.isEnabled;
      });
      setOrgFlagsData(dict);
    } catch (e) {
      console.error(e);
    } finally {
      setOrgFlagsLoading(false);
    }
  }, []);

  const loadUserFlags = useCallback(async (userId: string) => {
    if (!userId) return;
    setUserFlagsLoading(true);
    try {
      const res = await hexaTrackApi.admin.userFeatureFlags(userId);
      const dict: Record<string, boolean> = {};
      const flagsList = ['EnableOrganizations', 'EnableBranches', 'EnableAI', 'EnableAnalytics', 'EnableBudgets', 'EnableRecurringTransactions'];
      flagsList.forEach(k => {
        dict[k] = false;
      });
      res.forEach(item => {
        dict[item.featureKey] = item.isEnabled;
      });
      setUserFlagsData(dict);
    } catch (e) {
      console.error(e);
    } finally {
      setUserFlagsLoading(false);
    }
  }, []);

  const handleToggleOrgFlag = async (key: string, isEnabled: boolean) => {
    if (!orgFlagsOrgId) return;
    try {
      await hexaTrackApi.admin.setOrgFeatureFlag(orgFlagsOrgId, key, isEnabled);
      setOrgFlagsData(prev => ({ ...prev, [key]: isEnabled }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleUserFlag = async (key: string, isEnabled: boolean) => {
    if (!userFlagsUserId) return;
    try {
      await hexaTrackApi.admin.setUserFeatureFlag(userFlagsUserId, key, isEnabled);
      setUserFlagsData(prev => ({ ...prev, [key]: isEnabled }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (orgFlagsOrgId) {
      void loadOrgFlags(orgFlagsOrgId);
    }
  }, [orgFlagsOrgId, loadOrgFlags]);

  useEffect(() => {
    if (userFlagsUserId) {
      void loadUserFlags(userFlagsUserId);
    }
  }, [userFlagsUserId, loadUserFlags]);

  useEffect(() => {
    if (section !== 'flags') return;

    const handleFeatureFlagsUpdated = () => {
      void loadFlags();
      if (orgFlagsOrgId) void loadOrgFlags(orgFlagsOrgId);
      if (userFlagsUserId) void loadUserFlags(userFlagsUserId);
    };

    window.addEventListener('hexatrack:feature-flags-updated', handleFeatureFlagsUpdated);
    return () => window.removeEventListener('hexatrack:feature-flags-updated', handleFeatureFlagsUpdated);
  }, [loadFlags, loadOrgFlags, loadUserFlags, orgFlagsOrgId, section, userFlagsUserId]);

  useEffect(() => {
    if (section !== 'flags') return;
    async function loadLookups() {
      try {
        const [orgs, usersRes] = await Promise.all([
          hexaTrackApi.admin.allOrganizations(),
          hexaTrackApi.admin.users(undefined, 1, 200),
        ]);
        setFlagsOrgs(orgs);
        setFlagsUsers(usersRes.items);
      } catch (e) {
        console.error("Lookups failed in flags tab", e);
      }
    }
    void loadLookups();
  }, [section]);

  const loadAudit = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const result = await hexaTrackApi.admin.auditLog(
        auditPage,
        AUDIT_PAGE_SIZE,
        auditQuery || undefined,
        auditActionKeyword || undefined,
        auditTargetType || undefined
      );
      setAuditData(result);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Unable to load audit log.';
      setAuditError(msg);
      setAuditData(null);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditQuery, auditActionKeyword, auditTargetType, hydrated, isSuperAdmin, user]);

  const loadAlerts = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const active = await hexaTrackApi.admin.alerts.getActive();
      setActiveAlerts(active);
    } catch (e) {
      setAlertsError(e instanceof Error ? e.message : 'Failed to load platform alerts.');
    } finally {
      setAlertsLoading(false);
    }
  }, [hydrated, isSuperAdmin, user]);

  const loadAlertsHistory = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    try {
      const history = await hexaTrackApi.admin.alerts.getHistory(alertsHistoryPage, 30);
      setAlertsHistory(history);
    } catch (e) {
      console.error('Failed to load alerts history', e);
    }
  }, [alertsHistoryPage, hydrated, isSuperAdmin, user]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await hexaTrackApi.admin.alerts.resolve(alertId);
      void loadAlerts();
      void loadAlertsHistory();
    } catch (e) {
      console.error('Failed to resolve alert', e);
    }
  };

  const handleExportAudit = useCallback(() => {
    const url = hexaTrackApi.admin.exportAuditLogUrl(
      auditQuery || undefined,
      auditActionKeyword || undefined,
      auditTargetType || undefined
    );
    window.open(url, '_blank');
  }, [auditQuery, auditActionKeyword, auditTargetType]);

  useEffect(() => {
    if (section !== 'audit') return;
    void loadAudit();
  }, [loadAudit, section, auditQuery, auditActionKeyword, auditTargetType, auditPage]);

  useEffect(() => {
    if (section !== 'notifications') return;
    void loadAlerts();
    void loadAlertsHistory();
  }, [loadAlerts, loadAlertsHistory, section, alertsHistoryPage]);

  const loadAiUsage = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setAiLoading(true);
    setAiError(null);
    try {
      setAiData(await hexaTrackApi.admin.aiUsage(aiDays));
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Unable to load AI usage.';
      setAiError(msg);
      setAiData(null);
    } finally {
      setAiLoading(false);
    }
  }, [aiDays, hydrated, isSuperAdmin, user]);

  useEffect(() => {
    if (section !== 'ai') return;
    void loadAiUsage();
  }, [loadAiUsage, section]);

  const loadOverviewSection = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setOverviewLoading(true);
    setDashboardLoading(true);
    setAuditFeedLoading(true);
    setOverviewError(null);
    setDashboardError(null);
    try {
      const [ov, dash, feed] = await Promise.all([
        hexaTrackApi.admin.analyticsOverview(),
        hexaTrackApi.admin.analyticsDashboard(chartDays),
        hexaTrackApi.admin.auditLog(1, 14),
      ]);
      setOverviewData(ov);
      setDashboardData(dash);
      setAuditFeedData(feed);
      setOverviewRefreshedAt(new Date());
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Unable to load control center.';
      setOverviewError(msg);
      setDashboardError(msg);
      setOverviewData(null);
      setDashboardData(null);
      setAuditFeedData(null);
    } finally {
      setOverviewLoading(false);
      setDashboardLoading(false);
      setAuditFeedLoading(false);
    }
  }, [chartDays, hydrated, isSuperAdmin, user]);

  useEffect(() => {
    if (section !== 'analytics') return;
    void loadOverviewSection();
  }, [loadOverviewSection, section]);

  useEffect(() => {
    if (section !== 'analytics') return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadOverviewSection();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [section, loadOverviewSection]);

  const loadSettings = useCallback(async () => {
    if (!hydrated || !user || !isSuperAdmin) return;
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const list = await hexaTrackApi.admin.globalSettings();
      setSettingsData(list);
    } catch (e) {
      setSettingsError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Unable to load settings.',
      );
      setSettingsData(null);
    } finally {
      setSettingsLoading(false);
    }
  }, [hydrated, isSuperAdmin, user]);

  useEffect(() => {
    if (section !== 'settings') return;
    void loadSettings();
  }, [loadSettings, section]);

  useEffect(() => {
    if (!settingsData) return;
    setSettingDrafts(Object.fromEntries(settingsData.map((s) => [s.key, s.value])));
  }, [settingsData]);

  async function handleFlagBoolToggle(key: string, next: boolean) {
    setFlagsError(null);
    setFlagSavingKey(key);
    try {
      await hexaTrackApi.admin.setFeatureFlag(key, next ? 'true' : 'false');
      await loadFlags();
    } catch (e) {
      setFlagsError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not update flag.',
      );
    } finally {
      setFlagSavingKey(null);
    }
  }

  async function handleFlagTextSave(key: string) {
    const value = flagDrafts[key] ?? '';
    setFlagsError(null);
    setFlagSavingKey(key);
    try {
      await hexaTrackApi.admin.setFeatureFlag(key, value);
      await loadFlags();
    } catch (e) {
      setFlagsError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not save value.',
      );
    } finally {
      setFlagSavingKey(null);
    }
  }

  async function handleToggleLock(row: AdminUserListItem) {
    if (!user || row.isSuperAdmin) return;
    setRowPending({ userId: row.id, kind: 'lock' });
    setUsersError(null);
    try {
      await hexaTrackApi.admin.setLocked(row.id, !row.isLocked);
      await loadUsers();
    } catch (e) {
      setUsersError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Lock update failed.',
      );
    } finally {
      setRowPending(null);
    }
  }

  async function handleSettingSave(key: string) {
    const value = settingDrafts[key] ?? '';
    setSettingsError(null);
    setSettingSavingKey(key);
    try {
      await hexaTrackApi.admin.setGlobalSetting(key, value);
      await loadSettings();
    } catch (e) {
      setSettingsError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not save setting.',
      );
    } finally {
      setSettingSavingKey(null);
    }
  }

  async function handleSetSubscription(row: AdminUserListItem, plan: SubscriptionPlan) {
    const current = row.subscriptionPlan ?? 'Free';
    if (plan === current) return;
    setRowPending({ userId: row.id, kind: 'plan' });
    setUsersError(null);
    try {
      await hexaTrackApi.admin.setSubscription(row.id, plan);
      await loadUsers();
    } catch (e) {
      setUsersError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Plan update failed.',
      );
    } finally {
      setRowPending(null);
    }
  }

  async function handleSetPlatformSuperAdmin(row: AdminUserListItem, next: boolean) {
    if (row.isSuperAdmin === next) return;
    setRowPending({ userId: row.id, kind: 'superadmin' });
    setUsersError(null);
    try {
      await hexaTrackApi.admin.setSuperAdmin(row.id, next);
      await loadUsers();
    } catch (e) {
      setUsersError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Role update failed.',
      );
    } finally {
      setRowPending(null);
    }
  }

  async function handleDelete(row: AdminUserListItem) {
    if (!user || row.id === user.id || row.isSuperAdmin) return;
    const ok = window.confirm(
      `Delete ${row.email}? This removes their data and cannot be undone.`,
    );
    if (!ok) return;
    setRowPending({ userId: row.id, kind: 'delete' });
    setUsersError(null);
    try {
      await hexaTrackApi.admin.deleteUser(row.id);
      await loadUsers();
    } catch (e) {
      setUsersError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Delete failed.',
      );
    } finally {
      setRowPending(null);
    }
  }

  const totalPages = usersData ? Math.max(1, Math.ceil(usersData.totalCount / PAGE_SIZE)) : 1;
  const totalWorkspacePages = workspacesData
    ? Math.max(1, Math.ceil(workspacesData.totalCount / WORKSPACE_PAGE_SIZE))
    : 1;
  const totalAuditPages = auditData
    ? Math.max(1, Math.ceil(auditData.totalCount / AUDIT_PAGE_SIZE))
    : 1;

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0B1015] px-4">
        <div className="flex items-center gap-3 text-sm text-[#8B9BB4]">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#4F8CFF]" aria-hidden />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminAuthPortal />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0B1015] px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <Shield className="h-16 w-16 text-[#FF5C75]" />
          <h1 className="text-2xl font-bold text-[#F5F7FA]">Access Denied</h1>
          <p className="text-[#8B9BB4]">You do not have permission to access this area.</p>
          <Link
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/[0.06] px-6 text-sm font-semibold text-[#F5F7FA] transition hover:bg-white/[0.1]"
            href="/"
          >
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const navItems: { id: AdminSection; label: string; shortLabel: string; icon: any }[] = [
    { id: 'analytics', label: 'Dashboard', shortLabel: 'Home', icon: BarChart3 },
    { id: 'workspaces', label: 'Workspaces', shortLabel: 'Spaces', icon: Globe },
    { id: 'organizations', label: 'Organizations', shortLabel: 'Orgs', icon: Building2 },
    { id: 'users', label: 'Users', shortLabel: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', shortLabel: 'Txs', icon: Activity },
    { id: 'subscriptions', label: 'Subscriptions', shortLabel: 'Sub', icon: CreditCard },
    { id: 'ai', label: 'AI Insights', shortLabel: 'AI', icon: Zap },
    { id: 'notifications', label: 'Notifications', shortLabel: 'Alerts', icon: Bell },
    { id: 'security', label: 'Security', shortLabel: 'Sec', icon: Shield },
    { id: 'audit', label: 'Audit logs', shortLabel: 'Audit', icon: ClipboardList },
    { id: 'flags', label: 'Feature flags', shortLabel: 'Flags', icon: Flag },
    { id: 'settings', label: 'System Settings', shortLabel: 'Config', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-[#0B1015] text-[#F5F7FA]">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#121A22] md:sticky md:top-0 md:flex md:h-screen">
        <div className="flex items-center gap-3 border-b border-white/[0.06] p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F8CFF]">
             <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold tracking-tight text-[#F5F7FA]">HexaTrack</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8B9BB4]">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateSection(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#4F8CFF]/10 text-[#4F8CFF]'
                    : 'text-[#8B9BB4] hover:bg-white/[0.04] hover:text-[#F5F7FA]'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${active ? 'text-[#4F8CFF]' : 'opacity-70 group-hover:opacity-100'}`} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="border-t border-white/[0.06] p-4">
          <Link
            href="/"
            className="flex h-10 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-transparent text-sm font-medium text-[#8B9BB4] transition hover:bg-white/[0.04] hover:text-[#F5F7FA]"
          >
            Exit dashboard
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] backdrop-blur-xl bg-[#0B1015]/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:hidden">
               <Shield className="h-5 w-5 text-[#4F8CFF]" />
               <span className="text-sm font-bold">Admin</span>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <h1 className="text-lg font-semibold tracking-tight text-[#F5F7FA]">
                {navItems.find((n) => n.id === section)?.label ?? 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="hidden h-10 items-center gap-3 rounded-xl border border-white/[0.06] bg-[#121A22] px-4 text-left transition hover:bg-[#121A22]/80 sm:flex lg:w-64"
              >
                <Search className="h-4 w-4 text-[#8B9BB4]" aria-hidden />
                <span className="text-sm text-[#8B9BB4]">Search...</span>
                <kbd className="ml-auto inline-flex items-center rounded border border-white/[0.1] bg-white/[0.03] px-1.5 font-mono text-[10px] text-[#8B9BB4]">
                  {isMac ? '⌘K' : 'Ctrl K'}
                </kbd>
              </button>
              
              <div className="flex items-center gap-3 border-l border-white/[0.06] pl-4">
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-medium text-[#F5F7FA]">{user.email?.split('@')[0]}</p>
                   <p className="text-[10px] text-[#8B9BB4]">{user.email}</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => logout()}
                   className="flex h-10 items-center justify-center rounded-xl bg-white/[0.04] px-4 text-sm font-medium text-[#F5F7FA] transition hover:bg-white/[0.08]"
                 >
                   Sign out
                 </button>
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 p-6 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-7xl"
            >
              {section === 'analytics' && (
                <ControlCenterOverview
                  overview={overviewData}
                  dashboard={dashboardData}
                  overviewLoading={overviewLoading}
                  dashboardLoading={dashboardLoading}
                  overviewError={overviewError}
                  dashboardError={dashboardError}
                  auditItems={auditFeedData?.items ?? []}
                  auditLoading={auditFeedLoading}
                  chartDays={chartDays}
                  onChartDaysChange={setChartDays}
                  onRetry={() => void loadOverviewSection()}
                  onOpenAudit={() => updateSection('audit')}
                  lastRefreshedAt={overviewRefreshedAt}
                  onRefresh={() => void loadOverviewSection()}
                />
              )}

              {section === 'organizations' && <OrganizationsManager />}

              {section === 'users' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-[#F5F7FA]">Users</h2>
                      <p className="text-sm text-[#8B9BB4]">Manage platform users, roles, and accessibility.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreateUserOpen(true)}
                      className="flex items-center gap-2 rounded-xl bg-[#4F8CFF] px-4 py-2.5 text-sm font-semibold text-white transition shadow-[0_8px_20px_rgba(79,140,255,0.2)] hover:brightness-105"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </button>
                  </div>

                  <CreateUserModal
                    open={createUserOpen}
                    onOpenChange={setCreateUserOpen}
                    onCreated={() => void loadUsers()}
                  />

                  <ResetPasswordModal
                    open={resetPasswordOpen}
                    onOpenChange={setResetPasswordOpen}
                    userId={resetPasswordUserId}
                    userEmail={resetPasswordUserEmail}
                  />

                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B9BB4]" />
                    <input
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search email or name..."
                      className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#121A22] pl-10 pr-4 text-sm text-[#F5F7FA] outline-none transition focus:border-[#4F8CFF]/40 focus:ring-1 focus:ring-[#4F8CFF]/40"
                    />
                  </div>

                  {usersError && (
                    <div className="flex items-center justify-between rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]">
                      <span>{usersError}</span>
                      <button onClick={() => void loadUsers()} className="font-bold hover:underline">Retry</button>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121A22]">
                    <div className="overflow-x-auto">
                      {usersLoading && !usersData ? (
                        <TableSkeleton />
                      ) : usersData && usersData.items.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-[#8B9BB4]">
                          <Users className="h-10 w-10 opacity-50" />
                          <p className="text-sm">No users found</p>
                        </div>
                      ) : usersData ? (
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Email / Name</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Corporation</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Platform Role</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Subscription</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Status</th>
                              <th className="px-6 py-4 text-right font-medium text-[#8B9BB4]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {usersData.items.map((row) => {
                              const isSelf = user?.id === row.id;
                              const isBusy = rowPending?.userId === row.id;
                              return (
                                <tr key={row.id} className="group transition hover:bg-white/[0.01]">
                                  <td className="px-6 py-4">
                                    <div className="font-medium text-[#F5F7FA]">{row.email}</div>
                                    <div className="text-xs text-[#8B9BB4]">{row.displayName || '—'}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {row.organizationName ? (
                                      <div className="flex flex-col gap-0.5">
                                         <div className="font-medium text-[#F5F7FA] flex items-center gap-1.5">
                                            <Building2 className="h-3 w-3 opacity-50" />
                                            {row.organizationName}
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.organizationRole === 'Owner' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                              {row.organizationRole?.toUpperCase() || 'USER'}
                                            </span>
                                            {row.department && <span className="text-[10px] text-[#8B9BB4] font-medium">/ {row.department}</span>}
                                         </div>
                                      </div>
                                    ) : (
                                      <span className="text-xs italic text-[#8B9BB4]/60">Standalone</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    {row.isSuperAdmin ? (
                                      <span className="inline-flex rounded-full bg-[#4F8CFF]/20 px-2.5 py-0.5 text-xs font-medium text-[#4F8CFF] border border-[#4F8CFF]/30">
                                        SuperAdmin
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-[#8B9BB4]">
                                        Client User
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <select
                                      value={row.subscriptionPlan ?? 'Free'}
                                      disabled={isBusy}
                                      onChange={(e) => void handleSetSubscription(row, e.target.value as SubscriptionPlan)}
                                      className="rounded-lg border border-white/[0.06] bg-[#0B1015] px-2 py-1 text-xs text-[#F5F7FA] outline-none focus:border-[#4F8CFF]/50"
                                    >
                                      {SUBSCRIPTION_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </td>
                                  <td className="px-6 py-4">
                                    {row.isLocked ? (
                                      <span className="inline-flex rounded-full bg-[#FF5C75]/20 px-2.5 py-0.5 text-xs font-medium text-[#FF5C75]">Locked</span>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-[#1FD18B]/20 px-2.5 py-0.5 text-xs font-medium text-[#1FD18B]">Active</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                                      {!row.isSuperAdmin && (
                                        <button
                                          onClick={() => void handleSetPlatformSuperAdmin(row, true)}
                                          disabled={isBusy}
                                          className="text-xs text-[#4F8CFF] hover:underline"
                                        >
                                          Promote
                                        </button>
                                      )}
                                      {row.isSuperAdmin && !isSelf && (
                                        <button
                                          onClick={() => void handleSetPlatformSuperAdmin(row, false)}
                                          disabled={isBusy}
                                          className="text-xs text-[#8B9BB4] hover:underline"
                                        >
                                          Demote
                                        </button>
                                      )}
                                      
                                      <button
                                         disabled={isBusy}
                                         onClick={() => {
                                           setResetPasswordUserId(row.id);
                                           setResetPasswordUserEmail(row.email);
                                           setResetPasswordOpen(true);
                                         }}
                                         title="Reset Password"
                                         className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-[#4F8CFF] hover:bg-[#4F8CFF]/10 disabled:opacity-30"
                                       >
                                         <Key size={14} />
                                       </button>

                                       <button
                                         disabled={row.isSuperAdmin || isBusy}
                                         onClick={() => void handleToggleLock(row)}
                                         title={row.isLocked ? 'Unlock' : 'Lock'}
                                         className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-[#8B9BB4] hover:bg-white/[0.06] disabled:opacity-30"
                                       >
                                         {row.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                                       </button>

                                      <button
                                        disabled={row.isSuperAdmin || isSelf || isBusy}
                                        onClick={() => void handleDelete(row)}
                                        title="Delete user"
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] text-[#FF5C75] hover:bg-[#FF5C75]/10 disabled:opacity-30"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : null}
                    </div>
                    
                    {usersData && totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.01] px-6 py-3">
                        <span className="text-xs text-[#8B9BB4]">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                          <button
                            disabled={page <= 1 || usersLoading}
                            onClick={() => setPage(p => Math.max(1, p-1))}
                            className="flex h-8 items-center justify-center rounded-lg border border-white/[0.06] px-3 text-xs font-medium text-[#F5F7FA] hover:bg-white/[0.04] disabled:opacity-40"
                          >
                            <ChevronLeft size={14} className="mr-1" /> Prev
                          </button>
                          <button
                            disabled={page >= totalPages || usersLoading}
                            onClick={() => setPage(p => p + 1)}
                            className="flex h-8 items-center justify-center rounded-lg border border-white/[0.06] px-3 text-xs font-medium text-[#F5F7FA] hover:bg-white/[0.04] disabled:opacity-40"
                          >
                            Next <ChevronRight size={14} className="ml-1" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {section === 'workspaces' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-[#F5F7FA]">Workspaces</h2>
                      <p className="text-sm text-[#8B9BB4]">Overview of active organizations and teams.</p>
                    </div>
                  </div>

                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B9BB4]" />
                    <input
                      type="search"
                      value={workspaceSearchInput}
                      onChange={(e) => setWorkspaceSearchInput(e.target.value)}
                      placeholder="Search workspace or owner..."
                      className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#121A22] pl-10 pr-4 text-sm text-[#F5F7FA] outline-none focus:border-[#4F8CFF]/40 focus:ring-1 focus:ring-[#4F8CFF]/40"
                    />
                  </div>

                  {workspacesError && (
                    <div className="flex items-center justify-between rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]">
                      <span>{workspacesError}</span>
                      <button onClick={() => void loadWorkspaces()} className="font-bold hover:underline">Retry</button>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121A22]">
                    <div className="overflow-x-auto">
                      {workspacesLoading && !workspacesData ? (
                        <TableSkeleton />
                      ) : workspacesData && workspacesData.items.length === 0 ? (
                         <div className="flex flex-col items-center gap-2 py-16 text-[#8B9BB4]">
                           <Globe className="h-10 w-10 opacity-50" />
                           <p className="text-sm">No workspaces found</p>
                         </div>
                      ) : workspacesData ? (
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Workspace</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Type</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Members</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Owner</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {workspacesData.items.map((w) => (
                              <tr key={w.id} className="group transition hover:bg-white/[0.01]">
                                <td className="px-6 py-4 font-medium text-[#F5F7FA]">{w.name}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${workspaceTypeBadgeClasses(w.type)}`}>
                                    {w.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-[#F5F7FA]">{w.memberCount}</td>
                                <td className="px-6 py-4">
                                  <div className="text-[#F5F7FA]">{w.ownerEmail}</div>
                                  <div className="text-xs text-[#8B9BB4]">{w.ownerSubscriptionPlan ?? 'Free'} Plan</div>
                                </td>
                                <td className="px-6 py-4 text-[#8B9BB4]">{formatAdminDate(w.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                    </div>
                    
                    {workspacesData && totalWorkspacePages > 1 && (
                       <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.01] px-6 py-3">
                        <span className="text-xs text-[#8B9BB4]">Page {workspacePage} of {totalWorkspacePages}</span>
                        <div className="flex gap-2">
                          <button
                            disabled={workspacePage <= 1 || workspacesLoading}
                            onClick={() => setWorkspacePage(p => Math.max(1, p-1))}
                            className="flex h-8 items-center justify-center rounded-lg border border-white/[0.06] px-3 text-xs font-medium text-[#F5F7FA] hover:bg-white/[0.04] disabled:opacity-40"
                          >
                            <ChevronLeft size={14} className="mr-1" /> Prev
                          </button>
                          <button
                            disabled={workspacePage >= totalWorkspacePages || workspacesLoading}
                            onClick={() => setWorkspacePage(p => p + 1)}
                            className="flex h-8 items-center justify-center rounded-lg border border-white/[0.06] px-3 text-xs font-medium text-[#F5F7FA] hover:bg-white/[0.04] disabled:opacity-40"
                          >
                            Next <ChevronRight size={14} className="ml-1" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}


          {section === 'flags' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#F5F7FA]">Feature Flags</h2>
                  <p className="text-sm text-[#8B9BB4]">Dynamically toggle system-wide features, organization access, and user overrides.</p>
                </div>
                
                {/* Clean glassmorphic sub-tabs */}
                <div className="flex rounded-xl bg-white/[0.02] border border-white/[0.04] p-1 shrink-0 self-start sm:self-auto">
                  {(['global', 'org', 'user'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFlagsSubTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        flagsSubTab === tab 
                          ? 'bg-[#4F8CFF] text-white shadow-md' 
                          : 'text-[#8B9BB4] hover:text-[#E1E2EC]'
                      }`}
                    >
                      {tab === 'global' && 'Global System'}
                      {tab === 'org' && 'Organization Toggles'}
                      {tab === 'user' && 'User Overrides'}
                    </button>
                  ))}
                </div>
              </div>

              {flagsSubTab === 'global' && (
                <>
                  {flagsError && (
                    <div className="flex items-center justify-between rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]">
                      <span>{flagsError}</span>
                      <button onClick={() => void loadFlags()} className="font-bold hover:underline">Retry</button>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/[0.06] bg-[#121A22] overflow-hidden">
                    {flagsLoading && !flagsData ? (
                      <TableSkeleton />
                    ) : flagsData && flagsData.length === 0 ? (
                      <div className="flex flex-col items-center py-16 text-[#8B9BB4]">
                        <Flag className="h-10 w-10 opacity-50 mb-2" />
                        <p className="text-sm">No feature flags configured</p>
                      </div>
                    ) : flagsData ? (
                      <ul className="divide-y divide-white/[0.04]">
                        {flagsData.map((f) => {
                          const saving = flagSavingKey === f.key;
                          const boolFlag = isBooleanFlagValue(f.value);
                          const on = boolFlag && parseBooleanFlag(f.value);
                          const draft = flagDrafts[f.key] ?? f.value;
                          const textDirty = !boolFlag && draft !== f.value;

                          return (
                            <li key={f.key} className="flex flex-col gap-4 p-6 transition hover:bg-white/[0.01] sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-sm font-bold tracking-tight text-[#4F8CFF]">{f.key}</p>
                                <p className="mt-1 text-xs text-[#8B9BB4]">Last updated {formatAdminDate(f.updatedAt)}</p>
                              </div>

                              <div className="flex items-center shrink-0">
                                {boolFlag ? (
                                  <div className="flex items-center gap-3">
                                    {saving && <Loader2 className="h-4 w-4 animate-spin text-[#4F8CFF]" />}
                                    <span className={`text-xs font-medium ${on ? 'text-[#1FD18B]' : 'text-[#8B9BB4]'}`}>{on ? 'Enabled' : 'Disabled'}</span>
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => void handleFlagBoolToggle(f.key, !on)}
                                      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none ${on ? 'bg-[#4F8CFF]' : 'bg-white/[0.1]'}`}
                                    >
                                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-3 w-full sm:w-auto">
                                    <input
                                      type="text"
                                      value={draft}
                                      disabled={saving}
                                      onChange={(e) => setFlagDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                      className="h-9 px-3 rounded-lg border border-white/[0.06] bg-[#0B1015] text-sm text-[#F5F7FA] outline-none focus:border-[#4F8CFF]/50 w-full sm:w-64"
                                    />
                                    <button
                                      disabled={!textDirty || saving}
                                      onClick={() => void handleFlagTextSave(f.key)}
                                      className="h-9 px-4 flex items-center justify-center rounded-lg bg-white/[0.06] text-xs font-semibold text-[#F5F7FA] transition hover:bg-white/[0.1] disabled:opacity-50"
                                    >
                                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                </>
              )}

              {flagsSubTab === 'org' && (
                <div className="space-y-4">
                  <div className="bg-[#121A22] border border-white/[0.06] p-6 rounded-2xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xs">
                      <label className="text-[10px] font-bold text-[#8B9BB4] uppercase tracking-wider block mb-2">Selected Scope Context</label>
                      <select
                        value={orgFlagsOrgId}
                        onChange={(e) => setOrgFlagsOrgId(e.target.value)}
                        className="w-full h-11 px-3 bg-[#0B1015] border border-white/[0.06] rounded-xl text-sm font-bold text-[#E1E2EC] outline-none focus:border-[#4F8CFF]/40 cursor-pointer"
                      >
                        <option value="">Select Organization...</option>
                        {flagsOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div className="text-xs text-[#8B9BB4] leading-relaxed max-w-md">
                      Hierarchical override layers target specific tenants. If an organization toggle is configured, it replaces the global state value for all users inside that organization.
                    </div>
                  </div>

                  {orgFlagsOrgId ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-[#121A22] overflow-hidden">
                      {orgFlagsLoading ? (
                        <TableSkeleton />
                      ) : (
                        <ul className="divide-y divide-white/[0.04]">
                          {['EnableOrganizations', 'EnableBranches', 'EnableAI', 'EnableAnalytics', 'EnableBudgets', 'EnableRecurringTransactions'].map((key) => {
                            const on = orgFlagsData[key] ?? false;
                            return (
                              <li key={key} className="flex flex-col gap-4 p-6 transition hover:bg-white/[0.01] sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-sm font-bold tracking-tight text-[#E1E2EC]">{key}</p>
                                  <p className="mt-1 text-xs text-[#8B9BB4]">
                                    {key === 'EnableOrganizations' && 'Enables multi-tenant business structures'}
                                    {key === 'EnableBranches' && 'Allows branch and department isolation'}
                                    {key === 'EnableAI' && 'Enables AI insights and ledger assistant'}
                                    {key === 'EnableAnalytics' && 'Allows access to advanced charts and visual velocity trackers'}
                                    {key === 'EnableBudgets' && 'Allows establishing monthly spending bounds'}
                                    {key === 'EnableRecurringTransactions' && 'Allows scheduled automated transaction seeding'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-xs font-medium ${on ? 'text-[#1FD18B]' : 'text-[#8B9BB4]'}`}>{on ? 'Override Enabled' : 'Global Default'}</span>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleOrgFlag(key, !on)}
                                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none ${on ? 'bg-[#1FD18B]' : 'bg-white/[0.1]'}`}
                                  >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#121A22] border border-white/[0.05] border-dashed p-12 text-center text-[#8B9BB4] rounded-2xl">
                      Select an organization to load and toggle its tenant-scoped features.
                    </div>
                  )}
                </div>
              )}

              {flagsSubTab === 'user' && (
                <div className="space-y-4">
                  <div className="bg-[#121A22] border border-white/[0.06] p-6 rounded-2xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xs">
                      <label className="text-[10px] font-bold text-[#8B9BB4] uppercase tracking-wider block mb-2">Selected User Context</label>
                      <select
                        value={userFlagsUserId}
                        onChange={(e) => setUserFlagsUserId(e.target.value)}
                        className="w-full h-11 px-3 bg-[#0B1015] border border-white/[0.06] rounded-xl text-sm font-bold text-[#E1E2EC] outline-none focus:border-[#4F8CFF]/40 cursor-pointer"
                      >
                        <option value="">Select User...</option>
                        {flagsUsers.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
                      </select>
                    </div>
                    <div className="text-xs text-[#8B9BB4] leading-relaxed max-w-md">
                      Granular user overrides supersede BOTH the organization-scoped toggles and global flag defaults. Useful for early testing, beta programs, or specialized personnel tiers.
                    </div>
                  </div>

                  {userFlagsUserId ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-[#121A22] overflow-hidden">
                      {userFlagsLoading ? (
                        <TableSkeleton />
                      ) : (
                        <ul className="divide-y divide-white/[0.04]">
                          {['EnableOrganizations', 'EnableBranches', 'EnableAI', 'EnableAnalytics', 'EnableBudgets', 'EnableRecurringTransactions'].map((key) => {
                            const on = userFlagsData[key] ?? false;
                            return (
                              <li key={key} className="flex flex-col gap-4 p-6 transition hover:bg-white/[0.01] sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-sm font-bold tracking-tight text-[#E1E2EC]">{key}</p>
                                  <p className="mt-1 text-xs text-[#8B9BB4]">
                                    {key === 'EnableOrganizations' && 'Enables multi-tenant business structures'}
                                    {key === 'EnableBranches' && 'Allows branch and department isolation'}
                                    {key === 'EnableAI' && 'Enables AI insights and ledger assistant'}
                                    {key === 'EnableAnalytics' && 'Allows access to advanced charts and visual velocity trackers'}
                                    {key === 'EnableBudgets' && 'Allows establishing monthly spending bounds'}
                                    {key === 'EnableRecurringTransactions' && 'Allows scheduled automated transaction seeding'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-xs font-medium ${on ? 'text-pink-400' : 'text-[#8B9BB4]'}`}>{on ? 'Override Enabled' : 'No Override'}</span>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleUserFlag(key, !on)}
                                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none ${on ? 'bg-pink-500' : 'bg-white/[0.1]'}`}
                                  >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#121A22] border border-white/[0.05] border-dashed p-12 text-center text-[#8B9BB4] rounded-2xl">
                      Select a user to load and toggle their individual override settings.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {section === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#F5F7FA]">Audit Logs</h2>
                  <p className="text-sm text-[#8B9BB4]">Track system operations and platform-level modifications.</p>
                </div>
                <button
                  onClick={handleExportAudit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase bg-cyan/15 text-cyan hover:bg-cyan/25 active:scale-95 transition-all shadow-[0_0_15px_rgba(34,211,238,0.15)] border border-cyan/20 font-label-caps"
                >
                  <Download size={13} />
                  Export Ledger CSV
                </button>
              </div>

              {/* Advanced Search & Filter Suite */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0E152B]/40 border border-white/[0.04] p-4 rounded-[22px] backdrop-blur-md">
                {/* Search query input */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9BB4]">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={auditQuery}
                    onChange={(e) => { setAuditQuery(e.target.value); setAuditPage(1); }}
                    placeholder="Search Actor, Action, IP..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold bg-[#121A22] border border-white/[0.06] text-[#F5F7FA] focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30 placeholder-[#8B9BB4]/50 transition-all"
                  />
                  {auditQuery && (
                    <button
                      onClick={() => setAuditQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9BB4] hover:text-white text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Target Type Filter */}
                <div>
                  <select
                    value={auditTargetType}
                    onChange={(e) => { setAuditTargetType(e.target.value); setAuditPage(1); }}
                    className="w-full px-4 py-2 rounded-xl text-xs font-semibold bg-[#121A22] border border-white/[0.06] text-[#F5F7FA] focus:outline-none focus:border-cyan/50 transition-all"
                  >
                    <option value="">All Scopes (Target Types)</option>
                    <option value="User">User Accounts</option>
                    <option value="Organization">Organizations</option>
                    <option value="Workspace">Workspace Ledgers</option>
                    <option value="Branch">Branches</option>
                    <option value="Staff">Staff Connections</option>
                    <option value="FeatureFlag">Feature Override Toggles</option>
                    <option value="GlobalSetting">Global System Settings</option>
                  </select>
                </div>

                {/* Action Keyword Filter */}
                <div>
                  <select
                    value={auditActionKeyword}
                    onChange={(e) => { setAuditActionKeyword(e.target.value); setAuditPage(1); }}
                    className="w-full px-4 py-2 rounded-xl text-xs font-semibold bg-[#121A22] border border-white/[0.06] text-[#F5F7FA] focus:outline-none focus:border-cyan/50 transition-all"
                  >
                    <option value="">All Action Vectors</option>
                    <option value="auth">Authentication Attempts</option>
                    <option value="create">Entity Creations</option>
                    <option value="delete">Entity Deletions</option>
                    <option value="locked">Account Locks</option>
                    <option value="featureflag">Feature Flag Mutations</option>
                    <option value="setting">Global Setting Updates</option>
                  </select>
                </div>
              </div>

              {auditError && (
                <div className="flex items-center justify-between rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]">
                  <span>{auditError}</span>
                  <button onClick={() => void loadAudit()} className="font-bold hover:underline">Retry</button>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121A22]">
                <div className="overflow-x-auto">
                  {auditLoading && !auditData ? (
                    <TableSkeleton />
                  ) : auditData && auditData.items.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-[#8B9BB4]">
                      <ClipboardList className="h-10 w-10 opacity-50 mb-2" />
                      <p className="text-sm">No audit log entries yet.</p>
                    </div>
                  ) : auditData ? (
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                          <th className="px-6 py-4 font-medium text-[#8B9BB4]">Timestamp</th>
                          <th className="px-6 py-4 font-medium text-[#8B9BB4]">Event</th>
                          <th className="px-6 py-4 font-medium text-[#8B9BB4]">Actor</th>
                          <th className="px-6 py-4 font-medium text-[#8B9BB4]">Context</th>
                          <th className="px-6 py-4 font-medium text-[#8B9BB4]">Origin IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {auditData.items.map((a) => (
                          <tr key={a.id} className="hover:bg-white/[0.01] transition">
                            <td className="px-6 py-4 text-[#8B9BB4] whitespace-nowrap text-xs tabular-nums">
                              {formatAdminDate(a.createdAt)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${auditActionBadgeClasses(a.action)}`}>
                                {a.action}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <code className="text-xs bg-white/[0.04] px-1.5 py-0.5 rounded text-[#F5F7FA]">
                                {a.actorUserId.substring(0, 8)}
                              </code>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {a.targetType && <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B9BB4]">{a.targetType}</span>}
                                {a.targetId && <code className="text-xs text-white/50">{a.targetId.substring(0,8)}</code>}
                                {!a.targetType && !a.targetId && <span className="text-[#8B9BB4]">—</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[#8B9BB4] font-mono text-xs">{a.ipAddress ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>

                {auditData && totalAuditPages > 1 && (
                  <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.01] px-6 py-3">
                    <span className="text-xs text-[#8B9BB4]">Page {auditPage} of {totalAuditPages}</span>
                    <div className="flex gap-2">
                      <button
                        disabled={auditPage <= 1 || auditLoading}
                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                        className="flex h-8 items-center justify-center rounded-lg border border-white/[0.06] px-3 text-xs font-medium text-[#F5F7FA] hover:bg-white/[0.04] disabled:opacity-40"
                      >
                        <ChevronLeft size={14} className="mr-1" /> Previous
                      </button>
                      <button
                        disabled={auditPage >= totalAuditPages || auditLoading}
                        onClick={() => setAuditPage(p => p + 1)}
                        className="flex h-8 items-center justify-center rounded-lg border border-white/[0.06] px-3 text-xs font-medium text-[#F5F7FA] hover:bg-white/[0.04] disabled:opacity-40"
                      >
                        Next <ChevronRight size={14} className="ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'ai' && (
            <div className="space-y-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[#F5F7FA]">AI Usage</h2>
                  <p className="text-sm text-[#8B9BB4]">Estimated token consumption analysis across the platform.</p>
                </div>
                <div className="flex gap-1 rounded-xl bg-[#121A22] p-1 border border-white/[0.06]">
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setAiDays(d)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${aiDays === d ? 'bg-[#4F8CFF] text-white shadow' : 'text-[#8B9BB4] hover:text-[#F5F7FA]'}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 p-4 text-xs text-[#8B9BB4]">
                <Zap size={16} className="text-[#4F8CFF] shrink-0" />
                <p>Costs computed using baseline rates of {AI_EST_PROMPT_USD_PER_MILLION} USD / 1M prompt tokens and {AI_EST_COMPLETION_USD_PER_MILLION} USD / 1M completion tokens.</p>
              </div>

              {aiError && (
                 <div className="flex items-center justify-between rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]">
                   <span>{aiError}</span>
                   <button onClick={() => void loadAiUsage()} className="font-bold hover:underline">Retry</button>
                 </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121A22]">
                {aiLoading && !aiData ? (
                  <TableSkeleton />
                ) : aiData && aiData.rows.length === 0 ? (
                   <div className="flex flex-col items-center py-16 text-[#8B9BB4]">
                     <Zap className="h-10 w-10 opacity-50 mb-2" />
                     <p className="text-sm">No AI activity in the past {aiDays} days</p>
                   </div>
                ) : aiData ? (
                  (() => {
                    const totals = aiData.rows.reduce(
                      (acc, r) => ({
                        prompt: acc.prompt + r.totalPromptTokens,
                        completion: acc.completion + r.totalCompletionTokens,
                      }),
                      { prompt: 0, completion: 0 }
                    );
                    const totalTokens = totals.prompt + totals.completion;
                    const totalCost = estimateAiCostUsd(totals.prompt, totals.completion);
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Entity / User</th>
                              <th className="px-6 py-4 text-right font-medium text-[#8B9BB4]">Prompt</th>
                              <th className="px-6 py-4 text-right font-medium text-[#8B9BB4]">Completion</th>
                              <th className="px-6 py-4 text-right font-medium text-[#8B9BB4]">Total Tokens</th>
                              <th className="px-6 py-4 text-right font-medium text-[#8B9BB4]">Est. Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {aiData.rows.map((r) => {
                              const rowCost = estimateAiCostUsd(r.totalPromptTokens, r.totalCompletionTokens);
                              return (
                                <tr key={r.userId} className="hover:bg-white/[0.01]">
                                  <td className="px-6 py-4 font-medium text-[#F5F7FA]">{r.email || r.userId}</td>
                                  <td className="px-6 py-4 text-right text-[#8B9BB4] tabular-nums">{formatTokenCount(r.totalPromptTokens)}</td>
                                  <td className="px-6 py-4 text-right text-[#8B9BB4] tabular-nums">{formatTokenCount(r.totalCompletionTokens)}</td>
                                  <td className="px-6 py-4 text-right font-medium text-[#F5F7FA] tabular-nums">{formatTokenCount(r.totalPromptTokens + r.totalCompletionTokens)}</td>
                                  <td className="px-6 py-4 text-right font-bold text-[#4F8CFF] tabular-nums">{formatUsd(rowCost)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="border-t border-white/[0.08] bg-white/[0.01]">
                            <tr>
                              <td className="px-6 py-5 font-bold text-[#F5F7FA]">Network Totals</td>
                              <td className="px-6 py-5 text-right font-semibold text-[#8B9BB4] tabular-nums">{formatTokenCount(totals.prompt)}</td>
                              <td className="px-6 py-5 text-right font-semibold text-[#8B9BB4] tabular-nums">{formatTokenCount(totals.completion)}</td>
                              <td className="px-6 py-5 text-right font-bold text-[#F5F7FA] tabular-nums">{formatTokenCount(totalTokens)}</td>
                              <td className="px-6 py-5 text-right font-bold text-[#4F8CFF] tabular-nums">{formatUsd(totalCost)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()
                ) : null}
              </div>
            </div>
          )}

          {section === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#F5F7FA]">Platform Settings</h2>
                <p className="text-sm text-[#8B9BB4]">Platform-wide environment and behavior keys (non-sensitive).</p>
              </div>

              {settingsError && (
                 <div className="flex items-center justify-between rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]">
                   <span>{settingsError}</span>
                   <button onClick={() => void loadSettings()} className="font-bold hover:underline">Retry</button>
                 </div>
              )}

              <div className="rounded-2xl border border-white/[0.06] bg-[#121A22] overflow-hidden">
                {settingsLoading && !settingsData ? (
                  <TableSkeleton />
                ) : settingsData && settingsData.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-[#8B9BB4]">
                    <Settings className="h-10 w-10 opacity-50 mb-2" />
                    <p className="text-sm">No active runtime settings</p>
                  </div>
                ) : settingsData ? (
                  <ul className="divide-y divide-white/[0.04]">
                    {settingsData.map((s) => {
                      const saving = settingSavingKey === s.key;
                      const draft = settingDrafts[s.key] ?? s.value;
                      const dirty = draft !== s.value;
                      return (
                        <li key={s.key} className="flex flex-col gap-4 p-6 transition hover:bg-white/[0.01] sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-bold text-[#4F8CFF]">{s.key}</p>
                            <p className="mt-1 text-xs text-[#8B9BB4]">Modified {formatAdminDate(s.updatedAt)}</p>
                          </div>
                          
                          <div className="flex gap-3 w-full sm:w-auto">
                             <input
                                type="text"
                                value={draft}
                                disabled={saving}
                                onChange={(e) => setSettingDrafts((prev) => ({ ...prev, [s.key]: e.target.value }))}
                                className="h-9 px-3 rounded-lg border border-white/[0.06] bg-[#0B1015] text-sm text-[#F5F7FA] outline-none focus:border-[#4F8CFF]/50 w-full sm:w-72 font-mono"
                             />
                             <button
                                disabled={!dirty || saving}
                                onClick={() => void handleSettingSave(s.key)}
                                className="h-9 px-4 flex items-center justify-center rounded-lg bg-white/[0.06] text-xs font-semibold text-[#F5F7FA] transition hover:bg-white/[0.1] disabled:opacity-50"
                             >
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                             </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </div>
          )}
          {section === 'notifications' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#F5F7FA]">Enterprise Alert Center</h2>
                  <p className="text-sm text-[#8B9BB4]">Real-time database-driven health and security telemetry monitors.</p>
                </div>

                <div className="bg-[#0E152B] border border-white/[0.04] p-1 rounded-xl flex gap-1 self-start">
                  <button
                    onClick={() => setAlertsTab('active')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${
                      alertsTab === 'active' ? 'bg-white/5 text-cyan' : 'text-[#8B9BB4] opacity-70 hover:opacity-100'
                    }`}
                  >
                    Active Signals ({activeAlerts?.length ?? 0})
                  </button>
                  <button
                    onClick={() => setAlertsTab('history')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${
                      alertsTab === 'history' ? 'bg-white/5 text-cyan' : 'text-[#8B9BB4] opacity-70 hover:opacity-100'
                    }`}
                  >
                    Resolution Log
                  </button>
                </div>
              </div>

              {alertsError && (
                <div className="flex items-center justify-between rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]">
                  <span>{alertsError}</span>
                  <button onClick={() => void loadAlerts()} className="font-bold hover:underline">Retry</button>
                </div>
              )}

              {alertsTab === 'active' ? (
                <div className="space-y-4">
                  {alertsLoading && !activeAlerts ? (
                    <div className="h-48 animate-pulse rounded-[24px] bg-[#0E152B]/40 border border-white/[0.04]" />
                  ) : activeAlerts && activeAlerts.length === 0 ? (
                    <div className="flex flex-col items-center py-20 bg-[#121A22] border border-white/[0.05] border-dashed rounded-3xl text-[#8B9BB4]">
                      <Activity className="h-12 w-12 opacity-50 mb-3 text-emerald animate-pulse" />
                      <p className="text-sm font-bold text-white">All Subsystems Nominal</p>
                      <p className="text-xs mt-1 text-[#8B9BB4]/80">No active health or security telemetry alerts flagged.</p>
                    </div>
                  ) : activeAlerts ? (
                    <div className="grid grid-cols-1 gap-4">
                      {activeAlerts.map((alert) => {
                        const isCritical = alert.severity === 'Critical';
                        const isHigh = alert.severity === 'High';
                        const badgeColor = isCritical
                          ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                          : isHigh
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';

                        return (
                          <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[22px] border bg-[#0E152B]/40 backdrop-blur-md transition-all ${
                              isCritical ? 'border-red-500/25 hover:border-red-500/40' : 'border-white/[0.04] hover:border-cyan/20'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-xl bg-[#121A22] border border-white/[0.05] flex items-center justify-center ${
                                isCritical ? 'text-red-400 animate-pulse' : 'text-cyan'
                              }`}>
                                <AlertCircle size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-[#F5F7FA] text-sm">{alert.title}</h4>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${badgeColor}`}>
                                    {alert.severity}
                                  </span>
                                </div>
                                <p className="text-xs text-[#8B9BB4] mt-1.5 max-w-2xl leading-relaxed">{alert.message}</p>
                                <p className="text-[10px] text-[#8B9BB4]/60 mt-2 font-mono tabular-nums">Flagged {new Date(alert.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-4 py-2 shrink-0 rounded-xl text-[10px] font-black tracking-widest uppercase border border-white/[0.06] bg-[#121A22] hover:bg-white/[0.04] text-white active:scale-95 transition-all font-label-caps"
                            >
                              Resolve
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  {!alertsHistory ? (
                    <div className="h-48 animate-pulse rounded-[24px] bg-[#0E152B]/40 border border-white/[0.04]" />
                  ) : alertsHistory.length === 0 ? (
                    <div className="flex flex-col items-center py-20 bg-[#121A22] border border-white/[0.05] rounded-3xl text-[#8B9BB4]">
                      <ClipboardList className="h-10 w-10 opacity-50 mb-2" />
                      <p className="text-sm">No resolved alerts log history present.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121A22]">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Timestamp</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Event</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Resolved By</th>
                              <th className="px-6 py-4 font-medium text-[#8B9BB4]">Resolution Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {alertsHistory.map((h) => (
                              <tr key={h.id} className="hover:bg-white/[0.01]">
                                <td className="px-6 py-4 text-[#8B9BB4] whitespace-nowrap text-xs font-mono tabular-nums">
                                  {new Date(h.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                  <div>
                                    <p className="font-bold text-[#F5F7FA] text-xs">{h.title}</p>
                                    <p className="text-[11px] text-[#8B9BB4] mt-0.5">{h.message}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-[#8B9BB4] text-xs">{h.resolvedBy}</td>
                                <td className="px-6 py-4 text-[#8B9BB4] whitespace-nowrap text-xs font-mono tabular-nums">
                                  {h.resolvedAt ? new Date(h.resolvedAt).toLocaleString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {['transactions', 'subscriptions', 'security'].includes(section) && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#121A22] border border-white/[0.06] text-[#8B9BB4] shadow-xl mb-6">
                 {(() => {
                   const i = navItems.find(x => x.id === section)?.icon;
                   const Icon = i ? i : BarChart3;
                   return <Icon size={32} />;
                 })()}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#F5F7FA]">
                {navItems.find(x => x.id === section)?.label}
              </h2>
              <p className="mt-2 text-[#8B9BB4] max-w-md text-sm">
                Real-time data pipelines provisioned. Specialized visual metrics awaiting final schema activation.
              </p>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/[0.06] bg-[#121A22] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
          aria-label="Mobile menu"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-[#4F8CFF]' : 'text-[#8B9BB4]'
                }`}
              >
                <Icon size={18} className={`${active ? 'opacity-100' : 'opacity-70'}`} />
                <span className="text-[9px] font-medium tracking-tight">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} commands={commandItems} />
    </div>
  );
}

function AdminAuthPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const globalError = useAuthStore((s) => s.error);

  const activeError = localError || globalError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password.trim()) {
      setLocalError('Required credentials missing.');
      return;
    }
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch {
      // Error is saved to store
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#0B1015] px-4 selection:bg-[#4F8CFF]/30 selection:text-white">
      {/* Ambient Backlight Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          className="absolute -right-[10%] -top-[15%] h-[500px] w-[500px] rounded-full bg-[#4F8CFF]/30 blur-[120px]"
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          className="absolute -bottom-[10%] -left-[10%] h-[400px] w-[400px] rounded-full bg-[#1FD18B]/20 blur-[100px]"
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-10 w-full max-w-[420px]"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Brand Logo placement */}
        <div className="mb-8 flex justify-center">
          <BrandMark tone="dark" />
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/[0.07] bg-[#121A22]/50 p-8 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                className="absolute -inset-4 rounded-full bg-[#4F8CFF]/10 blur-xl"
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4F8CFF]/30 bg-[#4F8CFF]/10 shadow-[0_0_24px_rgba(79,140,255,0.2)] backdrop-blur-md">
                <LockKeyhole className="h-7 w-7 text-[#4F8CFF]" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F7FA]">Admin Nexus</h1>
            <p className="mt-2 text-sm text-[#8B9BB4]">System authorization required.</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#8B9BB4]" htmlFor="email">
                Control Identity
              </label>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-2xl border border-white/[0.05] bg-[#0B1015]/60 px-4 text-sm text-[#F5F7FA] placeholder:text-[#8B9BB4]/40 outline-none transition focus:border-[#4F8CFF]/40 focus:ring-2 focus:ring-[#4F8CFF]/10 disabled:opacity-50"
                disabled={loading}
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@secure.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#8B9BB4]" htmlFor="password">
                Access Key
              </label>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className="h-12 w-full rounded-2xl border border-white/[0.05] bg-[#0B1015]/60 pl-4 pr-12 text-sm text-[#F5F7FA] placeholder:text-[#8B9BB4]/40 outline-none transition focus:border-[#4F8CFF]/40 focus:ring-2 focus:ring-[#4F8CFF]/10 disabled:opacity-50"
                  disabled={loading}
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-[#8B9BB4] hover:bg-white/5 hover:text-[#F5F7FA]"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeError && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-xl border border-[#FF5C75]/20 bg-[#FF5C75]/5 px-3 py-2 text-xs font-medium text-[#FF5C75]"
                  exit={{ opacity: 0, y: -5 }}
                  initial={{ opacity: 0, y: 5 }}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {activeError}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              className="relative flex h-12 w-full items-center justify-center rounded-2xl bg-[#4F8CFF] font-semibold text-white shadow-[0_12px_24px_-8px_rgba(79,140,255,0.4)] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              <span className={loading ? 'invisible' : 'visible'}>Initialize Session</span>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#8B9BB4]">
          <Shield className="h-3 w-3" />
          <span>HexaTrack Administrative Access v1.0</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B1015] grid place-items-center">
        <div className="flex items-center gap-3 text-[#8B9BB4]">
          <Loader2 className="animate-spin h-5 w-5 text-[#4F8CFF]" />
          <span className="text-sm font-medium">Loading Secure Layer...</span>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
