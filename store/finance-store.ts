import { create } from 'zustand';
import { hexaTrackApi } from '@/lib/api';
import { round } from '@/lib/format';
import type {
  Account,
  Category,
  DashboardSummary,
  GroupExpense,
  RecurrenceFrequency,
  RecurringTransaction,
  ReportSummary,
  Tag,
  Transaction,
  TransactionType,
} from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspace-store';
import { offlineQueue } from '@/lib/offline-queue';

type FinanceState = {
  currency: string;
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
  recurring: RecurringTransaction[];
  groupExpenses: GroupExpense[];
  report: ReportSummary;
  dashboard: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  /** Most recent success message (auto-clears). */
  successMessage: string | null;
  setError: (message: string | null) => void;
  loadWorkspace: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'tags'> & { tagNames?: string[] }) => Promise<void>;
  addRecurring: (payload: {
    accountId: string;
    categoryId: string;
    type: TransactionType;
    frequency: RecurrenceFrequency;
    amount: number;
    currency: string;
    note?: string;
    nextRunOn: string;
    endsOn?: string;
  }) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
};

type PersistedFinanceWorkspace = Pick<
  FinanceState,
  'accounts' | 'categories' | 'tags' | 'transactions' | 'recurring' | 'groupExpenses' | 'report' | 'dashboard'
> & {
  savedAt: string;
};

const FINANCE_STORAGE_KEY = 'hexatrack.finance-cache.v1';
const recurring: RecurringTransaction[] = [];

const groupExpenses: GroupExpense[] = [];

function makeReport(rows: Transaction[]): ReportSummary {
  const income = round(rows.filter((row) => row.type === 'Income').reduce((sum, row) => round(sum + row.amount), 0));
  const expense = round(rows.filter((row) => row.type === 'Expense').reduce((sum, row) => round(sum + row.amount), 0));
  return {
    income,
    expense,
    net: round(income - expense),
    cashflow: buildCashflow(rows),
    spendingByCategory: [],
  };
}

function buildCashflow(rows: Transaction[]) {
  const buckets = new Map<string, { period: string; income: number; expense: number; net: number }>();
  for (const row of rows) {
    const period = `${row.occurredOn.slice(0, 7)}-01`;
    const current = buckets.get(period) ?? { period, income: 0, expense: 0, net: 0 };
    if (row.type === 'Income') current.income = round(current.income + row.amount);
    if (row.type === 'Expense') current.expense = round(current.expense + row.amount);
    current.net = round(current.income - current.expense);
    buckets.set(period, current);
  }
  return Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));
}

function readCachedWorkspace(): PersistedFinanceWorkspace | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedFinanceWorkspace) : null;
  } catch {
    window.localStorage.removeItem(FINANCE_STORAGE_KEY);
    return null;
  }
}

function monthToDateRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  return { from, to };
}

function cacheWorkspace(workspace: Omit<PersistedFinanceWorkspace, 'savedAt'>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    FINANCE_STORAGE_KEY,
    JSON.stringify({
      ...workspace,
      savedAt: new Date().toISOString(),
    }),
  );
}

/**
 * Ensures the workspace store has an active workspace ID.
 * Resolves the critical hydration race: finance API calls were firing before
 * the workspace store had resolved which workspace to use, causing the
 * X-Workspace-Id header to be null and all finance requests to fail.
 */
async function ensureWorkspaceReady(): Promise<string> {
  const ws = useWorkspaceStore.getState();

  if (!ws.hydrated) {
    ws.hydrate();
  }

  await useWorkspaceStore.getState().ensureActiveWorkspace();
  const final = useWorkspaceStore.getState().activeWorkspaceId;
  if (!final) {
    throw new Error('No workspace available. Please create or join a workspace first.');
  }
  return final;
}

const cachedWorkspace = readCachedWorkspace();

export const useFinanceStore = create<FinanceState>((set, get) => ({
  currency: 'USD',
  accounts: cachedWorkspace?.accounts ?? [],
  categories: cachedWorkspace?.categories ?? [],
  tags: cachedWorkspace?.tags ?? [],
  transactions: cachedWorkspace?.transactions ?? [],
  recurring: cachedWorkspace?.recurring ?? recurring,
  groupExpenses: cachedWorkspace?.groupExpenses ?? groupExpenses,
  report: cachedWorkspace?.report ?? makeReport([]),
  dashboard: cachedWorkspace?.dashboard ?? null,
  loading: false,
  error: null,
  successMessage: null,
  clearError: () => set({ error: null }),
  clearSuccess: () => set({ successMessage: null }),
  setError: (message) => set({ error: message }),
  loadWorkspace: async () => {
    set({ loading: true, error: null });
    try {
      // ── Workspace-ready guard ──
      await ensureWorkspaceReady();

      const { from, to } = monthToDateRange();
      const [nextAccounts, nextCategories, nextTags, nextRecurring, nextTransactions, dash] = await Promise.all([
        hexaTrackApi.accounts.list(),
        hexaTrackApi.categories.list(),
        hexaTrackApi.tags.list(),
        hexaTrackApi.recurring.list(),
        hexaTrackApi.transactions.list(from, to),
        hexaTrackApi.dashboard.summary(from, to),
      ]);

      const workspace = {
        accounts: nextAccounts,
        categories: nextCategories,
        tags: nextTags,
        recurring: nextRecurring as RecurringTransaction[],
        transactions: nextTransactions,
        groupExpenses,
        report: dash.report,
        dashboard: dash,
      };

      cacheWorkspace(workspace);
      set({ ...workspace, loading: false });
    } catch (error) {
      const cached = readCachedWorkspace();
      set((state) => {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        const message = offline
          ? 'Offline mode. Showing your last saved HexaTrack workspace.'
          : error instanceof Error
            ? error.message
            : 'Unable to load workspace';

        return {
          accounts: cached?.accounts ?? state.accounts,
          categories: cached?.categories ?? state.categories,
          tags: cached?.tags ?? state.tags,
          recurring: cached?.recurring ?? state.recurring,
          transactions: cached?.transactions ?? state.transactions,
          groupExpenses: cached?.groupExpenses ?? state.groupExpenses,
          report: cached?.report ?? state.report,
          dashboard: cached?.dashboard ?? state.dashboard,
          error: message,
          loading: false,
        };
      });
    }
  },
  addTransaction: async (transaction) => {
    set({ loading: true, error: null, successMessage: null });

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      const queued = offlineQueue.enqueue({
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type === 'Income' ? 'Income' : 'Expense',
        amount: transaction.amount,
        currency: transaction.currency,
        merchant: transaction.merchant,
        note: transaction.note,
        occurredOn: transaction.occurredOn,
        tagNames: transaction.tagNames,
      });

      const mockCreated: Transaction = {
        id: queued.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        merchant: transaction.merchant || '',
        note: transaction.note || '',
        occurredOn: transaction.occurredOn,
        tags: [],
      };

      const nextAccounts = get().accounts.map((acc) => {
        if (acc.id === transaction.accountId) {
          const delta = transaction.type === 'Income' ? transaction.amount : -transaction.amount;
          return {
            ...acc,
            balance: acc.balance + delta,
          };
        }
        return acc;
      });

      set((state) => {
        const nextTransactions = [mockCreated, ...state.transactions];
        const label = transaction.type === 'Income' ? 'Income' : 'Expense';
        const report = { ...state.report };
        if (transaction.type === 'Income') report.income = round(report.income + transaction.amount);
        else report.expense = round(report.expense + transaction.amount);
        report.net = round(report.income - report.expense);

        const nextDash = state.dashboard ? {
          ...state.dashboard,
          consolidatedBalance: round(nextAccounts.reduce((sum, a) => round(sum + a.balance), 0)),
          report
        } : null;

        cacheWorkspace({
          accounts: nextAccounts,
          categories: state.categories,
          tags: state.tags,
          recurring: state.recurring,
          groupExpenses: state.groupExpenses,
          transactions: nextTransactions,
          report,
          dashboard: nextDash,
        });

        return {
          accounts: nextAccounts,
          transactions: nextTransactions,
          report,
          dashboard: nextDash,
          loading: false,
          successMessage: `Saved offline! ${label} of ${transaction.currency} ${transaction.amount.toLocaleString()} queued for sync.`,
        };
      });

      invalidateFinanceQueries();
      return;
    }

    try {
      // ── Workspace-ready guard ──
      await ensureWorkspaceReady();

      const tagIds =
        transaction.tagNames && transaction.tagNames.length
          ? await Promise.all(
              transaction.tagNames.map(async (name) => {
                const tag = await hexaTrackApi.tags.upsert(name);
                return tag.id;
              }),
            )
          : [];

      const created = await hexaTrackApi.createTransaction({
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        merchant: transaction.merchant,
        note: transaction.note,
        occurredOn: transaction.occurredOn,
        tagIds,
        idempotencyKey: crypto.randomUUID(),
      });

      // Refresh dashboard + accounts in parallel for instant balance/chart updates
      const { from, to } = monthToDateRange();
      const [dash, nextAccounts] = await Promise.all([
        hexaTrackApi.dashboard.summary(from, to),
        hexaTrackApi.accounts.list(),
      ]);

      set((state) => {
        const nextTransactions = [created, ...state.transactions];
        cacheWorkspace({
          accounts: nextAccounts,
          categories: state.categories,
          tags: state.tags,
          recurring: state.recurring,
          groupExpenses: state.groupExpenses,
          transactions: nextTransactions,
          report: dash.report,
          dashboard: dash,
        });

        const label = transaction.type === 'Income' ? 'Income' : 'Expense';
        return {
          accounts: nextAccounts,
          transactions: nextTransactions,
          report: dash.report,
          dashboard: dash,
          loading: false,
          successMessage: `${label} of ${transaction.currency} ${transaction.amount.toLocaleString()} saved successfully`,
        };
      });

      invalidateFinanceQueries();
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error &&
          (error.message.includes('fetch') ||
            error.message.includes('Network') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('load')));

      if (isNetworkError) {
        const queued = offlineQueue.enqueue({
          accountId: transaction.accountId,
          categoryId: transaction.categoryId,
          type: transaction.type === 'Income' ? 'Income' : 'Expense',
          amount: transaction.amount,
          currency: transaction.currency,
          merchant: transaction.merchant,
          note: transaction.note,
          occurredOn: transaction.occurredOn,
          tagNames: transaction.tagNames,
        });

        const mockCreated: Transaction = {
          id: queued.id,
          accountId: transaction.accountId,
          categoryId: transaction.categoryId,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          merchant: transaction.merchant || '',
          note: transaction.note || '',
          occurredOn: transaction.occurredOn,
          tags: [],
        };

        const nextAccounts = get().accounts.map((acc) => {
          if (acc.id === transaction.accountId) {
            const delta = transaction.type === 'Income' ? transaction.amount : -transaction.amount;
            return {
              ...acc,
              balance: acc.balance + delta,
            };
          }
          return acc;
        });

        set((state) => {
          const nextTransactions = [mockCreated, ...state.transactions];
          const label = transaction.type === 'Income' ? 'Income' : 'Expense';
          const report = { ...state.report };
          if (transaction.type === 'Income') report.income = round(report.income + transaction.amount);
          else report.expense = round(report.expense + transaction.amount);
          report.net = round(report.income - report.expense);

          const nextDash = state.dashboard ? {
            ...state.dashboard,
            consolidatedBalance: round(nextAccounts.reduce((sum, a) => round(sum + a.balance), 0)),
            report
          } : null;

          cacheWorkspace({
            accounts: nextAccounts,
            categories: state.categories,
            tags: state.tags,
            recurring: state.recurring,
            groupExpenses: state.groupExpenses,
            transactions: nextTransactions,
            report,
            dashboard: nextDash,
          });

          return {
            accounts: nextAccounts,
            transactions: nextTransactions,
            report,
            dashboard: nextDash,
            loading: false,
            successMessage: `Saved offline! ${label} of ${transaction.currency} ${transaction.amount.toLocaleString()} queued for sync.`,
          };
        });

        invalidateFinanceQueries();
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to persist transaction.';
      set({
        loading: false,
        error: message,
        successMessage: null,
      });
      throw error;
    }
  },
  addRecurring: async (payload) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      // ── Workspace-ready guard ──
      await ensureWorkspaceReady();

      const created = (await hexaTrackApi.recurring.create({
        accountId: payload.accountId,
        categoryId: payload.categoryId,
        type: payload.type,
        frequency: payload.frequency,
        amount: payload.amount,
        currency: payload.currency,
        note: payload.note,
        nextRunOn: payload.nextRunOn,
        endsOn: payload.endsOn,
      })) as RecurringTransaction;

      const { from, to } = monthToDateRange();
      const dash = await hexaTrackApi.dashboard.summary(from, to);

      set((state) => {
        const nextRecurring = [...state.recurring, created].sort((a, b) => a.nextRunOn.localeCompare(b.nextRunOn));
        cacheWorkspace({
          accounts: state.accounts,
          categories: state.categories,
          tags: state.tags,
          recurring: nextRecurring,
          groupExpenses: state.groupExpenses,
          transactions: state.transactions,
          report: dash.report,
          dashboard: dash,
        });
        return {
          recurring: nextRecurring,
          report: dash.report,
          dashboard: dash,
          loading: false,
          successMessage: `Recurring ${payload.type.toLowerCase()} schedule created`,
        };
      });

      invalidateFinanceQueries();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to create recurring schedule',
        loading: false,
        successMessage: null,
      });
    }
  },
}));

/**
 * Invalidates all finance-related TanStack Query caches so that components
 * using useAccounts / useCategories / other hooks pick up fresh data immediately
 * after a transaction, income, or expense is created.
 */
function invalidateFinanceQueries() {
  try {
    // Dynamic import to avoid circular deps at module init time.
    // QueryClient is a singleton provided via QueryProvider.
    // We access it through the global window to avoid coupling.
    const { QueryClient } = require('@tanstack/react-query');
    // Try to find the QueryClient from the React tree
    // Since we can't access context from outside React, we use a workaround:
    // Dispatch a custom event that the QueryProvider can listen for.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hexatrack:invalidate-queries'));
    }
  } catch {
    // Silent: if TanStack Query isn't available, that's fine.
  }
}
