'use client';

import { useEffect, useMemo, useState } from 'react';
import { AccountSelector, CategorySelector, PaymentMethodSelector } from '@/components/finance/finance-selectors';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronLeft,
  CreditCard,
  Download,
  FileText,
  History,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BranchSwitcher } from '@/components/branches/branch-switcher';
import { BrandMark } from '@/components/ui/brand';
import { hexaTrackApi } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import type { Account, Category, Transaction, TransactionType } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';

type FinanceKind = 'income' | 'expenses' | 'accounts' | 'transactions' | 'analytics' | 'ledger' | 'categories';
type TxFormType = Extract<TransactionType, 'Income' | 'Expense'>;

const incomeDefaults = ['Sales', 'Client Payment', 'Salary', 'Investment', 'Refund', 'Commission', 'Rental', 'Interest', 'Bonus', 'Other Income'];
const expenseDefaults = ['Food', 'Travel', 'Salary', 'Bills', 'Utilities', 'Marketing', 'Cloud Services', 'Office', 'Hardware', 'Software', 'Maintenance', 'Fuel', 'Healthcare', 'Tax', 'Rent', 'Subscription', 'Miscellaneous'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function titleFor(kind: FinanceKind) {
  return {
    income: 'Income',
    expenses: 'Expenses',
    accounts: 'Accounts',
    transactions: 'Transactions',
    analytics: 'Financial Analytics',
    ledger: 'Global Ledger',
    categories: 'Category Management',
  }[kind];
}

export function IncomeManagementPage() {
  return <OwnerFinanceShell kind="income" />;
}

export function ExpenseManagementPage() {
  return <OwnerFinanceShell kind="expenses" />;
}

export function AccountManagementPage() {
  return <OwnerFinanceShell kind="accounts" />;
}

export function TransactionManagementPage() {
  return <OwnerFinanceShell kind="transactions" />;
}

export function FinancialAnalyticsPage() {
  return <OwnerFinanceShell kind="analytics" />;
}

export function GlobalLedgerPage() {
  return <OwnerFinanceShell kind="ledger" />;
}

export function CategoryManagementPage() {
  return <OwnerFinanceShell kind="categories" />;
}


function OwnerFinanceShell({ kind }: { kind: FinanceKind }) {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const loadWorkspace = useFinanceStore((state) => state.loadWorkspace);
  const loading = useFinanceStore((state) => state.loading);
  const error = useFinanceStore((state) => state.error);
  const [quickOpen, setQuickOpen] = useState<TxFormType | null>(null);

  useEffect(() => {
    if (hydrated && (!user || user.organizationRole?.toLowerCase() !== 'owner')) {
      router.replace('/');
    }
  }, [hydrated, router, user]);

  useEffect(() => {
    if (activeWorkspaceId) void loadWorkspace();
  }, [activeWorkspaceId, loadWorkspace]);

  if (!hydrated || !user) {
    return <div className="min-h-screen bg-[#050816] text-[#C2C6D6] grid place-items-center text-xs font-black uppercase tracking-widest">Authorizing owner finance</div>;
  }

  const moduleContent = (
    <>
      {!activeWorkspaceId && kind !== 'analytics' && kind !== 'ledger' ? (
        <EmptyState title="Select a branch to begin" action="Branch context is required for balance-safe writes." />
      ) : null}
      {error ? <ErrorCard message={error} onRetry={() => activeWorkspaceId && loadWorkspace()} /> : null}
      {loading ? <FinanceSkeleton /> : renderModule(kind, setQuickOpen)}
    </>
  );

  return (
    <>
      {/* ─── DESKTOP LAYOUT (xl+) ─── */}
      <div className="hidden md:block min-h-screen bg-[#050816] text-[#E1E2EC]">
        <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#050816]/85 px-4 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <BrandMark tone="dark" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#10B981]">Owner Finance</p>
                <h1 className="text-2xl font-black tracking-tight">{titleFor(kind)}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <BranchSwitcher />
              {kind !== 'analytics' && kind !== 'ledger' ? (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { type: kind === 'expenses' ? 'Expense' : 'Income' } }))}
                  className="h-11 rounded-[18px] bg-[#10B981] px-5 text-sm font-bold text-white active:scale-95"
                >
                  <Plus className="mr-2 inline h-4 w-4" />
                  {kind === 'accounts' ? 'Quick Record' : `Add ${kind === 'expenses' ? 'Expense' : 'Income'}`}
                </button>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
          {moduleContent}
        </main>
      </div>

      {/* ─── MOBILE LAYOUT (below md) ─── */}
      <div className="md:hidden flex flex-col bg-[#050816] text-[#E1E2EC] font-sans" style={{ height: '100dvh' }}>
        {/* Mobile Header */}
        <header className="shrink-0 flex items-center justify-between px-4 bg-[#050816]/90 backdrop-blur-xl border-b border-white/[0.05]" style={{ height: 72 }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/owner')} className="h-9 w-9 rounded-xl border border-white/[0.05] bg-[#0E152B] flex items-center justify-center text-[#C2C6D6] shrink-0">
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#10B981]">Owner</p>
              <h1 className="text-sm font-black tracking-tight truncate">{titleFor(kind)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BranchSwitcher />
            {kind !== 'analytics' && kind !== 'ledger' ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { type: kind === 'expenses' ? 'Expense' : 'Income' } }))}
                className="h-9 px-3 rounded-xl bg-[#10B981] text-[11px] font-bold text-white flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <Plus size={14} /> Add
              </button>
            ) : null}
          </div>
        </header>

        {/* Scrollable Content */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 16,
            paddingBottom: 'calc(82px + env(safe-area-inset-bottom) + 24px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="space-y-4">
            {moduleContent}
          </div>
        </main>

        {/* Fixed Bottom Navigation */}
        <OwnerBottomNav 
          activeTab={kind === 'transactions' ? 'history' : kind === 'analytics' ? 'reports' : 'home'} 
          onAdd={() => window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { type: kind === 'expenses' ? 'Expense' : 'Income' } }))} 
          disabled={!activeWorkspaceId} 
        />
      </div>
    </>
  );
}

function renderModule(kind: FinanceKind, openQuick: (type: TxFormType | null) => void) {
  if (kind === 'income') return <IncomeExpenseModule type="Income" onAdd={() => openQuick('Income')} />;
  if (kind === 'expenses') return <IncomeExpenseModule type="Expense" onAdd={() => openQuick('Expense')} />;
  if (kind === 'accounts') return <AccountsModule onQuick={() => openQuick('Income')} />;
  if (kind === 'transactions') return <TransactionsModule onAdd={() => openQuick('Income')} />;
  if (kind === 'analytics') return <AnalyticsModule />;
  if (kind === 'categories') return <CategoriesModule />;
  return <LedgerModule />;
}

function CategoriesModule() {
  const categories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
  const loadWorkspace = useFinanceStore((state) => state.loadWorkspace);
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<'Expense' | 'Income'>('Expense');

  const typeCats = categories.filter(c => !c.parentCategoryId && c.type === activeType);

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['Expense', 'Income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`h-9 rounded-full px-4 text-[11px] font-bold uppercase tracking-wider transition-all border ${
                activeType === t
                  ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
                  : 'border-white/[0.05] bg-[#0E152B] text-[#C2C6D6]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="h-9 rounded-xl bg-[#10B981] px-3.5 text-[11px] font-bold text-white flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Category Cards */}
      {typeCats.length === 0 ? (
        <EmptyState title={`No ${activeType.toLowerCase()} categories.`} action="Create your first category to organize transactions." onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {typeCats.map((cat) => {
            const subs = categories.filter(sub => sub.parentCategoryId === cat.id);
            const txCount = transactions.filter(tx => tx.categoryId === cat.id || subs.some(s => s.id === tx.categoryId)).length;
            const totalAmt = transactions.filter(tx => tx.categoryId === cat.id || subs.some(s => s.id === tx.categoryId)).reduce((s, tx) => s + tx.amount, 0);

            return (
              <div key={cat.id} className="rounded-2xl border border-white/[0.05] bg-[#0E152B] p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-start gap-3">
                  {/* Color Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${cat.color || '#10B981'}15`, border: `1px solid ${cat.color || '#10B981'}25` }}
                  >
                    <TagIcon size={18} style={{ color: cat.color || '#10B981' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#E1E2EC] truncate">{cat.name}</p>
                    <p className="text-[10px] text-[#C2C6D6] mt-0.5">{txCount} records · {money(totalAmt)}</p>
                  </div>
                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: cat.color || '#10B981' }} />
                </div>
                {/* Subcategories */}
                {subs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subs.map(sub => (
                      <span key={sub.id} className="text-[10px] font-medium text-[#C2C6D6] bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded-lg">{sub.name}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && <CategoryModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); loadWorkspace(); }} />}
    </div>
  );
}

import { Tag as TagIcon } from 'lucide-react';

function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'Expense' as Category['type'], color: '#10B981', parentCategoryId: '' });
  const [saving, setSaving] = useState(false);
  const parentOptions = useFinanceStore((state) => state.categories.filter(c => !c.parentCategoryId));

  async function save() {
    setSaving(true);
    try {
      await hexaTrackApi.categories.create({
        name: form.name,
        type: form.type,
        parentCategoryId: form.parentCategoryId || null,
        color: form.color,
      });
      onSaved();
    } catch(e) {
       alert(e instanceof Error ? e.message : 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] grid place-items-end bg-black/70 p-0 backdrop-blur-sm md:place-items-center md:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-[32px] border border-white/[0.08] bg-[#050816] p-6 md:rounded-[32px]">
        <div className="flex justify-between items-center mb-5"><h2 className="text-xl font-black">Create Category</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="space-y-4">
          <Field label="Category Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-finance w-full" placeholder="e.g. Marketing" /></Field>
          <Field label="Type">
             <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Category['type'] })} className="input-finance w-full">
               <option value="Expense">Expense</option>
               <option value="Income">Income</option>
             </select>
          </Field>
          <Field label="Parent Category (Optional)">
             <select value={form.parentCategoryId} onChange={(e) => setForm({ ...form, parentCategoryId: e.target.value })} className="input-finance w-full">
               <option value="">-- None (Top Level) --</option>
               {parentOptions.filter(p => p.type === form.type).map(p => (
                 <option key={p.id} value={p.id}>{p.name}</option>
               ))}
             </select>
          </Field>
          <Field label="Pick Color">
             <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full h-10 rounded-xl bg-transparent border-0" />
          </Field>
        </div>
        <button disabled={saving || !form.name} onClick={save} className="mt-6 h-12 w-full rounded-[18px] bg-[#10B981] font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Create category'}</button>
      </div>
    </div>
  );
}

function IncomeExpenseModule({ type, onAdd }: { type: TxFormType; onAdd: () => void }) {
  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const recurring = useFinanceStore((state) => state.recurring);
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const rows = transactions.filter((tx) => tx.type === type);
  const total = rows.reduce((sum, tx) => sum + tx.amount, 0);
  const thisMonth = rows.filter((tx) => {
    const d = new Date(tx.occurredOn);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = thisMonth.reduce((sum, tx) => sum + tx.amount, 0);
  const recurringCount = recurring.filter((r) => r.type === type && r.isActive).length;
  const typeCats = categories.filter((c) => c.type === type && !c.parentCategoryId);

  const filtered = rows.filter((tx) => {
    const cat = categories.find((c) => c.id === tx.categoryId);
    const acc = accounts.find((a) => a.id === tx.accountId);
    const matchQuery = !query || [tx.merchant, tx.note, cat?.name, acc?.name].some((v) => v?.toLowerCase().includes(query.toLowerCase()));
    const matchCat = !selectedCat || tx.categoryId === selectedCat;
    return matchQuery && matchCat;
  });

  const isIncome = type === 'Income';
  const accent = isIncome ? '#22C55E' : '#EF4444';

  return (
    <div className="space-y-4">
      {/* ── Summary Cards (2×2 compact) ── */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          label={isIncome ? 'Total Income' : 'Total Expenses'}
          value={money(total, accounts[0]?.currency)}
          color={accent}
          icon={isIncome ? ArrowDownLeft : ArrowUpRight}
        />
        <SummaryCard
          label="This Month"
          value={money(monthTotal, accounts[0]?.currency)}
          color="#10B981"
          icon={BarChart3}
        />
        <SummaryCard
          label="Records"
          value={rows.length.toString()}
          color="#C2C6D6"
          icon={CreditCard}
        />
        <SummaryCard
          label={`Recurring ${type}`}
          value={recurringCount.toString()}
          color="#F59E0B"
          icon={RefreshCw}
        />
      </div>

      {/* ── Search Bar ── */}
      <label className="flex h-11 items-center gap-3 rounded-2xl border border-white/[0.05] bg-[#0E152B] px-4">
        <Search className="h-4 w-4 text-[#C2C6D6] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${type.toLowerCase()}s...`}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#C2C6D6]/60 text-[#E1E2EC]"
        />
      </label>

      {/* ── Category Filter Pills ── */}
      {typeCats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar hide-scrollbar pb-1">
          <button
            onClick={() => setSelectedCat(null)}
            className={`shrink-0 h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider border transition-all ${
              !selectedCat
                ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
                : 'border-white/[0.05] bg-[#0E152B] text-[#C2C6D6]'
            }`}
          >
            All
          </button>
          {typeCats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
              className={`shrink-0 h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                selectedCat === cat.id
                  ? 'border-[#10B981]/30 text-[#E1E2EC]'
                  : 'border-white/[0.05] bg-[#0E152B] text-[#C2C6D6]'
              }`}
              style={selectedCat === cat.id ? { background: `${cat.color || '#10B981'}20` } : undefined}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: cat.color || '#10B981' }} />
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Transaction List ── */}
      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? `Start tracking ${type.toLowerCase()}.` : 'No matching records.'}
          action={rows.length === 0 ? `Add first ${type.toLowerCase()}` : 'Try a different filter.'}
          onAction={rows.length === 0 ? onAdd : undefined}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C2C6D6]">
            {filtered.length} {type.toLowerCase()}{filtered.length !== 1 ? 's' : ''}
          </p>
          {filtered.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const acc = accounts.find((a) => a.id === tx.accountId);
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-[#0E152B] p-3.5 active:scale-[0.99] transition-transform"
              >
                {/* Category Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${cat?.color || accent}15`, border: `1px solid ${cat?.color || accent}25` }}
                >
                  {isIncome ? (
                    <ArrowDownLeft size={18} style={{ color: cat?.color || accent }} />
                  ) : (
                    <ArrowUpRight size={18} style={{ color: cat?.color || accent }} />
                  )}
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#E1E2EC] truncate">{tx.merchant || cat?.name || type}</p>
                  <p className="text-[11px] text-[#C2C6D6] truncate">{cat?.name}{acc ? ` · ${acc.name}` : ''} · {shortDate(tx.occurredOn)}</p>
                </div>
                {/* Amount + Badge */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold" style={{ color: isIncome ? '#22C55E' : '#E1E2EC' }}>
                    {isIncome ? '+' : '-'}{money(tx.amount, tx.currency)}
                  </p>
                  <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E]">
                    Posted
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AccountsModule({ onQuick }: { onQuick: () => void }) {
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const loadWorkspace = useFinanceStore((state) => state.loadWorkspace);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold text-[#C2C6D6]">Create accounts, track recent activity, and reconcile branch balances.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="h-11 rounded-[18px] bg-[#10B981] px-5 text-sm font-bold text-white">
          <Plus className="mr-2 inline h-4 w-4" /> Create Account
        </button>
      </div>
      {accounts.length === 0 ? (
        <EmptyState title="Start tracking branch finances." action="Create first account" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountBalanceCard key={account.id} account={account} recentCount={transactions.filter((tx) => tx.accountId === account.id).length} onQuick={onQuick} />
          ))}
        </div>
      )}
      {open ? <AccountModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); void loadWorkspace(); }} /> : null}
    </div>
  );
}

function TransactionsModule({ onAdd }: { onAdd: () => void }) {
  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'All' | TransactionType>('All');
  const filtered = transactions.filter((tx) => {
    const category = categories.find((item) => item.id === tx.categoryId)?.name ?? '';
    const account = accounts.find((item) => item.id === tx.accountId)?.name ?? '';
    const term = query.toLowerCase();
    return (type === 'All' || tx.type === type) && [tx.merchant, tx.note, category, account].some((value) => value?.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <label className="flex h-11 items-center gap-3 rounded-2xl border border-white/[0.05] bg-[#0E152B] px-4">
        <Search className="h-4 w-4 text-[#C2C6D6] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#C2C6D6]/60 text-[#E1E2EC]"
        />
      </label>

      {/* Type Filter Pills */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {(['All', 'Income', 'Expense', 'Transfer'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`shrink-0 h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-wider border transition-all ${
              type === t
                ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
                : 'border-white/[0.05] bg-[#0E152B] text-[#C2C6D6]'
            }`}
          >
            {t}
          </button>
        ))}
        <ExportButtons rows={filtered} />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState title="No transactions found." action="Add First Transaction" onAction={onAdd} />
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C2C6D6]">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </p>
          {filtered.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const acc = accounts.find((a) => a.id === tx.accountId);
            const isIncome = tx.type === 'Income';
            const accent = isIncome ? '#22C55E' : '#EF4444';
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-[#0E152B] p-3.5 active:scale-[0.99] transition-transform"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${cat?.color || accent}15`, border: `1px solid ${cat?.color || accent}25` }}
                >
                  {isIncome ? (
                    <ArrowDownLeft size={18} style={{ color: cat?.color || accent }} />
                  ) : (
                    <ArrowUpRight size={18} style={{ color: cat?.color || accent }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#E1E2EC] truncate">{tx.merchant || cat?.name || tx.type}</p>
                  <p className="text-[11px] text-[#C2C6D6] truncate">{cat?.name}{acc ? ` · ${acc.name}` : ''} · {shortDate(tx.occurredOn)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold" style={{ color: isIncome ? '#22C55E' : '#E1E2EC' }}>
                    {isIncome ? '+' : '-'}{money(tx.amount, tx.currency)}
                  </p>
                  <span
                    className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{
                      background: isIncome ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: isIncome ? '#22C55E' : '#EF4444',
                    }}
                  >
                    {tx.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LedgerModule() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hexaTrackApi.ledger().then((result) => {
      setRows(result.items);
      setBalance(result.consolidatedBalance);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <FinanceSkeleton />;
  return (
    <div className="space-y-5">
      <MetricCard label="Consolidated balance" value={money(balance)} icon={Wallet} tone="primary" />
      {rows.length === 0 ? <EmptyState title="No ledger movements yet." action="Record branch transactions to build the global ledger." /> : <LedgerTable rows={rows} />}
    </div>
  );
}

function AnalyticsModule() {
  const [data, setData] = useState<{ revenue: number; expenses: number; profit: number; branchPerformance: Array<{ id: string; name: string; revenue: number; expenses: number; profit: number }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hexaTrackApi.analytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <FinanceSkeleton />;
  const active = data ?? { revenue: 0, expenses: 0, profit: 0, branchPerformance: [] };
  return (
    <div className="space-y-5">
      <FinancialAnalyticsCards revenue={active.revenue} expenses={active.expenses} profit={active.profit} />
      <BranchRevenueChart rows={active.branchPerformance} />
    </div>
  );
}

export function QuickTransactionModal({ type, onClose }: { type: TxFormType; onClose: () => void }) {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const loadWorkspace = useFinanceStore((state) => state.loadWorkspace);
  const queryClient = useQueryClient();
  
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    accountId: '',
    categoryId: '',
    merchant: '',
    note: '',
    occurredOn: today(),
    recurring: false,
  });

  const isValid = form.amount && Number(form.amount) > 0 && form.accountId && form.categoryId;

  async function save(addAnother = false) {
    if (!isValid) return;
    setSaving(true);
    try {
      await addTransaction({
        accountId: form.accountId,
        categoryId: form.categoryId,
        type,
        amount: Number(form.amount),
        currency: 'USD', // Auto Lookup later if needed
        merchant: form.merchant || undefined,
        note: form.note || undefined,
        occurredOn: form.occurredOn,
      });
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        loadWorkspace()
      ]);

      if (addAnother) {
        setForm((current) => ({ ...current, amount: '', merchant: '', note: '' }));
      } else {
        onClose();
      }
    } catch (err) {
       alert(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-t-[32px] border border-white/[0.08] bg-[#050816] p-6 shadow-2xl md:rounded-[32px]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#10B981]">Quick transaction</p>
            <h2 className="text-xl font-black">Add {type}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.05]"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Amount"><input required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" min="0.01" step="0.01" className="input-finance w-full" /></Field>
          <Field label="Account">
            <AccountSelector 
              value={form.accountId} 
              onChange={(val) => setForm({ ...form, accountId: val })} 
            />
          </Field>
          <Field label="Category">
            <CategorySelector 
              type={type} 
              value={form.categoryId} 
              onChange={(val) => setForm({ ...form, categoryId: val })} 
            />
          </Field>
          <Field label={type === 'Income' ? 'Payment method' : 'Merchant'}>
             {type === 'Income' ? (
               <PaymentMethodSelector value={form.merchant} onChange={(val) => setForm({ ...form, merchant: val })} />
             ) : (
               <input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} className="input-finance w-full" />
             )}
          </Field>
          <Field label="Date"><input type="date" value={form.occurredOn} onChange={(e) => setForm({ ...form, occurredOn: e.target.value })} className="input-finance w-full" /></Field>
          <div className="flex h-12 items-center">
            <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0E152B] px-4 w-full h-full text-sm font-bold text-[#C2C6D6]">
              <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> 
              Recurring
            </label>
          </div>
          {type === 'Expense' ? <ReceiptUpload /> : null}
          <Field label="Description"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-finance w-full" /></Field>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button 
             disabled={saving || !isValid} 
             onClick={() => save(false)} 
             className={`h-12 rounded-[18px] font-bold text-white transition-all ${isValid ? 'bg-[#10B981] hover:bg-blue-600' : 'bg-white/[0.08] opacity-50 cursor-not-allowed'}`}
          >
            {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : `Record ${type}`}
          </button>
          <button 
             disabled={saving || !isValid} 
             onClick={() => save(true)} 
             className={`h-12 rounded-[18px] border border-white/[0.08] font-bold text-[#F5F7FA] hover:bg-white/[0.05] transition-all disabled:opacity-50`}
          >
             Save & Add Another
          </button>
        </div>
      </div>
    </div>
  );
}

async function ensureDefaultCategories(type: TxFormType, existing: Category[]) {
  if (existing.length > 0) return;
  const names = type === 'Income' ? incomeDefaults : expenseDefaults;
  await Promise.all(names.map((name) => hexaTrackApi.categories.create({ name, type, parentCategoryId: null, color: type === 'Income' ? '#22C55E' : '#FF5C75', icon: type === 'Income' ? 'ArrowDownLeft' : 'ArrowUpRight' }).catch(() => null)));
}

function AccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'Bank' as Account['type'], currency: 'USD', openingBalance: '0' });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await hexaTrackApi.createAccount({ ...form, openingBalance: Number(form.openingBalance) });
      onSaved();
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[999] grid place-items-end bg-black/70 p-0 backdrop-blur-sm md:place-items-center md:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-[32px] border border-white/[0.08] bg-[#050816] p-6 md:rounded-[32px]">
        <h2 className="text-xl font-black">Create account</h2>
        <div className="mt-5 space-y-4">
          <Field label="Account name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-finance" /></Field>
          <Field label="Account type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Account['type'] })} className="input-finance">{['Bank', 'Wallet', 'Cash', 'Credit', 'Savings'].map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Opening balance"><input value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} type="number" className="input-finance" /></Field>
        </div>
        <button disabled={saving || !form.name} onClick={save} className="mt-6 h-12 w-full rounded-[18px] bg-[#10B981] font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Create account'}</button>
      </div>
    </div>
  );
}

function TransactionTable({ transactions, categories, accounts }: { transactions: Transaction[]; categories: Category[]; accounts: Account[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0E152B]">
      <table className="w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-widest text-[#C2C6D6]"><tr><th className="p-4">Amount</th><th className="p-4">Category</th><th className="p-4">Account</th><th className="p-4">Status</th><th className="p-4">Created date</th><th className="p-4 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">
          {transactions.map((tx) => <tr key={tx.id}><td className="p-4 font-black">{money(tx.amount, tx.currency)}</td><td className="p-4">{categories.find((c) => c.id === tx.categoryId)?.name ?? 'Uncategorized'}</td><td className="p-4">{accounts.find((a) => a.id === tx.accountId)?.name ?? 'Account'}</td><td className="p-4 text-[#22C55E]">Posted</td><td className="p-4">{shortDate(tx.occurredOn)}</td><td className="p-4 text-right"><Trash2 className="ml-auto h-4 w-4 text-[#C2C6D6]" /></td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function TransactionTimeline({ transactions, categories, accounts }: { transactions: Transaction[]; categories: Category[]; accounts: Account[] }) {
  const groups = useMemo(() => groupTransactions(transactions), [transactions]);
  return <div className="space-y-5">{groups.map((group) => <section key={group.label}><h2 className="mb-3 text-xs font-black uppercase tracking-widest text-[#C2C6D6]">{group.label}</h2><TransactionTable transactions={group.items} categories={categories} accounts={accounts} /></section>)}</div>;
}

function groupTransactions(rows: Transaction[]) {
  const now = new Date();
  return [
    { label: 'Today', items: rows.filter((row) => row.occurredOn === today()) },
    { label: 'This Week', items: rows.filter((row) => daysAgo(row.occurredOn, now) <= 7 && row.occurredOn !== today()) },
    { label: 'This Month', items: rows.filter((row) => daysAgo(row.occurredOn, now) > 7 && daysAgo(row.occurredOn, now) <= 31) },
  ].filter((group) => group.items.length > 0);
}

function daysAgo(date: string, now: Date) {
  return Math.floor((now.getTime() - new Date(`${date}T00:00:00`).getTime()) / 86400000);
}

export function AccountBalanceCard({ account, recentCount, onQuick }: { account: Account; recentCount: number; onQuick: () => void }) {
  return <div className="rounded-3xl border border-white/[0.06] bg-[#0E152B] p-6"><div className="flex items-center justify-between"><Wallet className="h-6 w-6 text-[#10B981]" /><span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-[#C2C6D6]">{account.type}</span></div><h3 className="mt-4 text-lg font-black">{account.name}</h3><p className="mt-2 text-3xl font-black">{money(account.balance, account.currency)}</p><p className="mt-2 text-sm text-[#C2C6D6]">{recentCount} recent movements • Branch mapped</p><button onClick={onQuick} className="mt-5 h-10 rounded-[18px] border border-[#10B981]/25 px-4 text-sm font-bold text-[#10B981]">Record movement</button></div>;
}

function LedgerTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  return <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0E152B]"><table className="w-full text-left text-sm"><thead className="text-[11px] uppercase tracking-widest text-[#C2C6D6]"><tr><th className="p-4">Date</th><th className="p-4">Branch</th><th className="p-4">Account</th><th className="p-4">Category</th><th className="p-4">Amount</th></tr></thead><tbody className="divide-y divide-white/[0.05]">{rows.map((row) => <tr key={String(row.id)}><td className="p-4">{String(row.occurredOn)}</td><td className="p-4">{String(row.branchName)}</td><td className="p-4">{String(row.account)}</td><td className="p-4">{String(row.category)}</td><td className="p-4 font-black">{money(Number(row.amount), String(row.currency ?? 'USD'))}</td></tr>)}</tbody></table></div>;
}

export function FinancialAnalyticsCards({ revenue, expenses, profit }: { revenue: number; expenses: number; profit: number }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><MetricCard label="Revenue" value={money(revenue)} icon={ArrowDownLeft} tone="success" /><MetricCard label="Expenses" value={money(expenses)} icon={ArrowUpRight} tone="expense" /><MetricCard label="Profit" value={money(profit)} icon={BarChart3} tone="primary" /></div>;
}

export function BranchRevenueChart({ rows }: { rows: Array<{ id: string; name: string; revenue: number; expenses: number; profit: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.revenue));
  return <div className="rounded-3xl border border-white/[0.06] bg-[#0E152B] p-6"><h2 className="mb-5 text-lg font-black">Branch performance</h2>{rows.length === 0 ? <p className="text-sm text-[#C2C6D6]">No branch finance data yet.</p> : <div className="space-y-4">{rows.map((row) => <div key={row.id}><div className="mb-2 flex justify-between text-sm"><span className="font-bold">{row.name}</span><span className="text-[#C2C6D6]">{money(row.revenue)} revenue</span></div><div className="h-3 rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-[#10B981]" style={{ width: `${Math.max(4, (row.revenue / max) * 100)}%` }} /></div></div>)}</div>}</div>;
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone: 'primary' | 'success' | 'expense' }) {
  const color = tone === 'success' ? '#22C55E' : tone === 'expense' ? '#EF4444' : '#10B981';
  return <div className="rounded-3xl border border-white/[0.06] bg-[#0E152B] p-6"><Icon className="mb-4 h-6 w-6" style={{ color }} /><p className="text-[11px] font-black uppercase tracking-widest text-[#C2C6D6]">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function SummaryCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: LucideIcon }) {
  return (
    <div
      className="rounded-2xl border border-white/[0.05] bg-[#0E152B] p-3.5 flex items-center gap-3"
      style={{ height: 92 }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#C2C6D6] truncate">{label}</p>
        <p className="mt-1 text-lg font-extrabold text-[#E1E2EC] tracking-tight leading-none truncate">{value}</p>
      </div>
    </div>
  );
}

function ExportButtons({ rows }: { rows: Transaction[] }) {
  function download(ext: 'csv' | 'xls' | 'pdf') {
    const body = rows.map((row) => [row.occurredOn, row.type, row.amount, row.currency, row.merchant ?? '', row.note ?? ''].join(',')).join('\n');
    const mime = ext === 'xls' ? 'application/vnd.ms-excel' : ext === 'pdf' ? 'application/pdf' : 'text/csv';
    const blob = new Blob([`date,type,amount,currency,merchant,note\n${body}`], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hexatrack-transactions.${ext}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex gap-1.5 ml-auto shrink-0">
      <button onClick={() => download('csv')} className="h-8 rounded-full border border-white/[0.05] bg-[#0E152B] px-2.5 text-[10px] font-bold text-[#C2C6D6] flex items-center gap-1"><Download size={12} />CSV</button>
      <button onClick={() => download('xls')} className="h-8 rounded-full border border-white/[0.05] bg-[#0E152B] px-2.5 text-[10px] font-bold text-[#C2C6D6]">XLS</button>
      <button onClick={() => download('pdf')} className="h-8 rounded-full border border-white/[0.05] bg-[#0E152B] px-2.5 text-[10px] font-bold text-[#C2C6D6]">PDF</button>
    </div>
  );
}

function ReceiptUpload() {
  const [name, setName] = useState('');
  return <Field label="Receipt upload"><input type="file" accept="image/*,.pdf" onChange={(e) => setName(e.target.files?.[0]?.name ?? '')} className="input-finance" />{name ? <p className="mt-1 text-xs text-[#C2C6D6]">Preview ready: {name} • OCR placeholder</p> : null}</Field>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-[11px] font-black uppercase tracking-widest text-[#C2C6D6]">{label}<div className="mt-1.5 normal-case tracking-normal">{children}</div></label>;
}

function EmptyState({ title, action, onAction }: { title: string; action: string; onAction?: () => void }) {
  return <div className="rounded-3xl border border-dashed border-white/[0.1] bg-[#0E152B] px-6 py-16 text-center"><Building2 className="mx-auto mb-4 h-10 w-10 text-[#10B981]" /><h2 className="text-lg font-black">{title}</h2><p className="mt-2 text-sm text-[#C2C6D6]">{action}</p>{onAction ? <button onClick={onAction} className="mt-6 h-11 rounded-[18px] bg-[#10B981] px-5 text-sm font-bold text-white">Add First Transaction</button> : null}</div>;
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex items-center justify-between rounded-2xl border border-[#FF5C75]/25 bg-[#FF5C75]/10 p-4 text-sm text-[#FF5C75]"><span>{message}</span><button onClick={onRetry} className="font-bold text-[#F5F7FA]"><RefreshCw className="mr-1 inline h-4 w-4" />Retry</button></div>;
}

function FinanceSkeleton() {
  return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-3xl bg-white/[0.05]" />)}</div>;
}

type BottomTab = 'home' | 'history' | 'reports' | 'settings';

function OwnerBottomNav({ activeTab, onAdd, disabled }: { activeTab: BottomTab; onAdd: () => void; disabled?: boolean }) {
  const router = useRouter();
  const tabs: Array<{ key: BottomTab; icon: React.ElementType; label: string; onClick: () => void }> = [
    { key: 'home', icon: Home, label: 'Home', onClick: () => router.push('/owner') },
    { key: 'history', icon: History, label: 'History', onClick: () => router.push('/owner/transactions') },
    { key: 'reports', icon: BarChart3, label: 'Reports', onClick: () => router.push('/owner/analytics') },
    { key: 'settings', icon: Settings, label: 'Settings', onClick: () => router.push('/owner') },
  ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50"
      style={{
        background: 'rgba(5,8,22,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <nav
        className="mx-auto w-full max-w-md grid grid-cols-5 items-end select-none"
        style={{ height: 82, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* First 2 tabs */}
        {tabs.slice(0, 2).map((tab) => (
          <BottomNavItem key={tab.key} active={activeTab === tab.key} icon={tab.icon} label={tab.label} onClick={tab.onClick} />
        ))}
        {/* Center FAB */}
        <div className="relative flex items-center justify-center" style={{ height: 82 }}>
          <div className="absolute rounded-full pointer-events-none" style={{ width: 68, height: 68, background: 'rgba(16,185,129,0.25)', filter: 'blur(14px)', top: '50%', left: '50%', transform: 'translate(-50%, -54%)' }} />
          <button
            onClick={onAdd}
            disabled={disabled}
            className="relative z-10 flex items-center justify-center rounded-full overflow-hidden disabled:opacity-50 active:scale-90 transition-transform"
            style={{
              width: 68,
              height: 68,
              marginBottom: 10,
              background: 'linear-gradient(145deg, #34D399 0%, #10B981 50%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(16,185,129,0.45), 0 2px 8px rgba(0,0,0,0.4)',
              border: '1.5px solid rgba(255,255,255,0.12)',
            }}
          >
            <Plus size={28} strokeWidth={2} className="text-white" />
          </button>
        </div>
        {/* Last 2 tabs */}
        {tabs.slice(2).map((tab) => (
          <BottomNavItem key={tab.key} active={activeTab === tab.key} icon={tab.icon} label={tab.label} onClick={tab.onClick} />
        ))}
      </nav>
    </div>
  );
}

function BottomNavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-end gap-1.5 w-full h-full pb-[10px] outline-none active:scale-95 transition-transform"
    >
      {active && (
        <div
          className="absolute top-0 inset-x-3 h-[2px] rounded-b-full"
          style={{ background: '#10B981', boxShadow: '0 2px 8px #10B981' }}
        />
      )}
      <div style={{ color: active ? '#E1E2EC' : '#C2C6D6' }}>
        <Icon size={22} strokeWidth={1.75} style={active ? { filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' } : undefined} />
      </div>
      <span className="leading-none font-medium" style={{ fontSize: 11, color: active ? '#E1E2EC' : '#C2C6D6' }}>
        {label}
      </span>
    </button>
  );
}
