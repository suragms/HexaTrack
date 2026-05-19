'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  PieChart,
  Plus,
  Search,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { BrandMark } from '@/components/ui/brand';
import { money, shortDate } from '@/lib/format';
import { useAuthStore } from '@/store/auth-store';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';

type FilterTab = 'Today' | 'Week' | 'Month' | 'Year';

type PremiumFintechDashboardProps = {
  roleLabel?: string;
  onAddTransaction: () => void;
  onNavigate?: (screen: string) => void;
};

const ringColors = ['#00BFA6', '#10B981', '#0F9D8A', '#F59E0B'];

export function PremiumFintechDashboard({ roleLabel = 'Individual', onAddTransaction, onNavigate }: PremiumFintechDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Month');
  const user = useAuthStore((s) => s.user);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const report = useFinanceStore((s) => s.report);
  const transactions = useFinanceStore((s) => s.transactions);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const totalFlow = Math.max(report.income + report.expense, 1);
  const profitPercent = Math.max(0, Math.min(100, Math.round((Math.max(report.net, 0) / totalFlow) * 100)));

  const categoryBreakdown = useMemo(() => {
    const expenses = transactions.filter((tx) => tx.type === 'Expense');
    const total = expenses.reduce((sum, tx) => sum + tx.amount, 0) || 1;
    return categories
      .filter((category) => category.type === 'Expense' && !category.parentCategoryId)
      .map((category) => {
        const amount = expenses
          .filter((tx) => tx.categoryId === category.id)
          .reduce((sum, tx) => sum + tx.amount, 0);
        return { ...category, amount, percent: Math.round((amount / total) * 100) };
      })
      .filter((category) => category.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [categories, transactions]);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime()).slice(0, 5),
    [transactions],
  );

  return (
    <div className="min-h-full bg-[#F5F7F8] text-[#102A43]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:py-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-[#E5E7EB]/70 bg-[#F5F7F8]/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,157,138,0.14)] ring-1 ring-[#E5E7EB]">
              <BrandMark tone="light" className="h-6 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F9D8A]">{roleLabel}</p>
              <h1 className="truncate text-lg font-extrabold tracking-tight text-[#102A43]">
                {activeWorkspace?.name ?? 'HexaTrack Workspace'}
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <IconButton label="Search" icon={Search} />
              <IconButton label="Notifications" icon={Bell} hasBadge />
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#0F9D8A] to-[#00BFA6] text-sm font-black text-white shadow-[0_12px_26px_rgba(15,157,138,0.28)]">
                {(user?.displayName ?? 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F9D8A] via-[#00BFA6] to-[#0B6B61] p-5 text-white shadow-[0_22px_55px_rgba(15,157,138,0.28)] lg:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-white/75">Total Balance</p>
              <motion.p layout className="mt-2 text-4xl font-black tracking-tight lg:text-5xl">
                {money(totalBalance)}
              </motion.p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/85">
                <Sparkles size={15} />
                <span>{profitPercent}% profit efficiency this {activeFilter.toLowerCase()}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onAddTransaction}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#0F9D8A] shadow-[0_12px_28px_rgba(11,107,97,0.28)] transition hover:scale-105 active:scale-95"
              aria-label="Add transaction"
            >
              <Plus size={24} />
            </button>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['Today', 'Week', 'Month', 'Year'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`h-10 shrink-0 rounded-full px-5 text-sm font-bold transition ${
                activeFilter === tab
                  ? 'bg-[#0F9D8A] text-white shadow-[0_12px_24px_rgba(15,157,138,0.24)]'
                  : 'bg-white text-[#6B7280] ring-1 ring-[#E5E7EB]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <PremiumCard className="p-5 lg:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#102A43]">Analytics</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280]">Income, expenses, and net movement</p>
              </div>
              <PieChart className="text-[#0F9D8A]" size={22} />
            </div>
            <div className="mt-6 grid items-center gap-6 sm:grid-cols-[220px_1fr]">
              <RingChart percent={profitPercent} />
              <div className="grid gap-3">
                <MetricRow label="Income" value={money(report.income)} icon={ArrowDownLeft} color="#10B981" />
                <MetricRow label="Expenses" value={money(report.expense)} icon={ArrowUpRight} color="#EF4444" />
                <MetricRow label="Total Profit" value={money(report.net)} icon={Wallet} color="#0F9D8A" />
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="p-5 lg:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#102A43]">Category Mix</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280]">Live expense breakdown</p>
              </div>
              <button type="button" onClick={() => onNavigate?.('reports')} className="text-xs font-bold text-[#0F9D8A]">
                Reports
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {(categoryBreakdown.length ? categoryBreakdown : [{ id: 'empty', name: 'No expenses yet', amount: 0, percent: 0 }]).map((category, index) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ringColors[index % ringColors.length] }} />
                      <span className="truncate font-bold text-[#102A43]">{category.name}</span>
                    </div>
                    <span className="font-bold text-[#6B7280]">{category.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EAF8F6]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${category.percent}%` }}
                      transition={{ duration: 0.7, delay: index * 0.08 }}
                      className="h-full rounded-full"
                      style={{ background: ringColors[index % ringColors.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat title="Income" value={money(report.income)} tone="success" />
          <MiniStat title="Expenses" value={money(report.expense)} tone="danger" />
          <MiniStat title="Accounts" value={accounts.length.toLocaleString()} tone="teal" />
        </div>

        <PremiumCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] p-5">
            <div>
              <p className="text-sm font-extrabold text-[#102A43]">Recent Activity</p>
              <p className="mt-1 text-xs font-medium text-[#6B7280]">Realtime transaction stream</p>
            </div>
            <button type="button" onClick={() => onNavigate?.('history')} className="rounded-full bg-[#EAF8F6] px-3 py-2 text-xs font-bold text-[#0F9D8A]">
              View all
            </button>
          </div>
          <div className="divide-y divide-[#E5E7EB]">
            {recentTransactions.length ? recentTransactions.map((tx) => {
              const isIncome = tx.type === 'Income';
              const category = categories.find((c) => c.id === tx.categoryId);
              return (
                <motion.div key={tx.id} layout className="flex items-center gap-3 p-4 transition hover:bg-[#F5F7F8]">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isIncome ? 'bg-[#EAF8F6] text-[#10B981]' : 'bg-red-50 text-[#EF4444]'}`}>
                    {isIncome ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#102A43]">{tx.merchant || category?.name || tx.type}</p>
                    <p className="mt-0.5 text-xs font-medium text-[#6B7280]">{category?.name ?? 'General'} · {shortDate(tx.occurredOn)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-black ${isIncome ? 'text-[#10B981]' : 'text-[#102A43]'}`}>
                      {isIncome ? '+' : '-'}{money(tx.amount, tx.currency)}
                    </span>
                    <ChevronRight size={16} className="text-[#9CA3AF]" />
                  </div>
                </motion.div>
              );
            }) : (
              <div className="p-8 text-center text-sm font-semibold text-[#6B7280]">No transactions yet. Use the center action to add income or expense.</div>
            )}
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

function IconButton({ label, icon: Icon, hasBadge = false }: { label: string; icon: React.ElementType; hasBadge?: boolean }) {
  return (
    <button type="button" aria-label={label} className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-[#102A43] shadow-sm ring-1 ring-[#E5E7EB] transition hover:text-[#0F9D8A]">
      <Icon size={18} />
      {hasBadge && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-white" />}
    </button>
  );
}

function PremiumCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[28px] border border-[#E5E7EB] bg-white shadow-[0_18px_45px_rgba(16,42,67,0.08)] ${className}`}>{children}</section>;
}

function RingChart({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto grid h-52 w-52 place-items-center">
      <svg className="-rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#EAF8F6" strokeWidth="10" />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#premium-ring)"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="premium-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#00BFA6" />
            <stop offset="55%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#0B6B61" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-black tracking-tight text-[#102A43]">{percent}%</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">Profit</p>
      </div>
    </div>
  );
}

function MetricRow({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F5F7F8] p-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm" style={{ color }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#6B7280]">{label}</p>
        <p className="truncate text-base font-black text-[#102A43]">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ title, value, tone }: { title: string; value: string; tone: 'success' | 'danger' | 'teal' }) {
  const color = tone === 'danger' ? '#EF4444' : tone === 'success' ? '#10B981' : '#0F9D8A';
  return (
    <PremiumCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">{title}</p>
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      </div>
      <p className="mt-3 truncate text-2xl font-black tracking-tight text-[#102A43]">{value}</p>
    </PremiumCard>
  );
}
