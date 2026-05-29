'use client';

import { useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  PieChart,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { money, shortDate } from '@/lib/format';
import { useFinanceStore } from '@/store/finance-store';

type FilterTab = 'Today' | 'Week' | 'Month' | 'Year';

import type { TransactionType } from '@/lib/types';
import type { ScreenKey } from '@/components/layout/app-shell';

type PremiumFintechDashboardProps = {
  roleLabel?: string;
  onAddTransaction: (type?: TransactionType) => void;
  onNavigate?: (screen: ScreenKey) => void;
};

// Vibrant theme-compliant colors for categories
const ringColors = ['#4F8CFF', '#1FD18B', '#38BDF8', '#FF5C75'];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

export function PremiumFintechDashboard({ onAddTransaction, onNavigate }: PremiumFintechDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Month');
  const accounts = useFinanceStore((s) => s.accounts);
  const categories = useFinanceStore((s) => s.categories);
  const report = useFinanceStore((s) => s.report);
  const transactions = useFinanceStore((s) => s.transactions);

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
    <div className="min-h-full bg-[#0B1015] text-[#F5F7FA]">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-6"
      >

        <motion.section
          variants={itemVariants}
          className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#121A22]/60 p-6 backdrop-blur-xl shadow-2xl"
        >
          {/* Glowing brand gradient backdrops */}
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#4F8CFF]/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-[#1FD18B]/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#8B9BB4]">Total Balance</p>
              <motion.p layout className="mt-2 text-4xl font-black tracking-tight lg:text-5xl text-[#F5F7FA]">
                {money(totalBalance)}
              </motion.p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#1FD18B]">
                <Sparkles size={15} />
                <span>{profitPercent}% profit efficiency this {activeFilter.toLowerCase()}</span>
              </div>
            </div>
            <div className="flex gap-2.5 shrink-0 self-center">
              <button
                type="button"
                onClick={() => onAddTransaction('Income')}
                className="flex items-center gap-2 rounded-2xl bg-[#1FD18B]/10 hover:bg-[#1FD18B]/20 text-[#1FD18B] border border-[#1FD18B]/20 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition hover:scale-105 active:scale-95 shadow-sm"
                aria-label="Add Income"
              >
                <ArrowDownLeft size={16} strokeWidth={2.5} />
                <span>Income</span>
              </button>
              <button
                type="button"
                onClick={() => onAddTransaction('Expense')}
                className="flex items-center gap-2 rounded-2xl bg-[#FF5C75]/10 hover:bg-[#FF5C75]/20 text-[#FF5C75] border border-[#FF5C75]/20 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition hover:scale-105 active:scale-95 shadow-sm"
                aria-label="Add Expense"
              >
                <ArrowUpRight size={16} strokeWidth={2.5} />
                <span>Expense</span>
              </button>
            </div>
          </div>
        </motion.section>

        <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-1">
          {(['Today', 'Week', 'Month', 'Year'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`h-10 shrink-0 rounded-full px-5 text-sm font-bold transition ${
                activeFilter === tab
                  ? 'bg-[#4F8CFF] text-white shadow-[0_8px_20px_rgba(79,140,255,0.25)]'
                  : 'bg-[#121A22]/60 text-[#8B9BB4] border border-white/[0.06] hover:bg-white/[0.02]'
              }`}
            >
              {tab}
            </button>
          ))}
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div variants={itemVariants}>
            <PremiumCard className="p-5 lg:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-[#F5F7FA]">Analytics</p>
                  <p className="mt-1 text-xs font-medium text-[#8B9BB4]">Income, expenses, and net movement</p>
                </div>
                <PieChart className="text-[#4F8CFF]" size={22} />
              </div>
              <div className="mt-6 grid items-center gap-6 sm:grid-cols-[220px_1fr]">
                <RingChart percent={profitPercent} />
                <div className="grid gap-3">
                  <MetricRow label="Income" value={money(report.income)} icon={ArrowDownLeft} color="#1FD18B" />
                  <MetricRow label="Expenses" value={money(report.expense)} icon={ArrowUpRight} color="#FF5C75" />
                  <MetricRow label="Total Profit" value={money(report.net)} icon={Wallet} color="#4F8CFF" />
                </div>
              </div>
            </PremiumCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <PremiumCard className="p-5 lg:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-[#F5F7FA]">Category Mix</p>
                  <p className="mt-1 text-xs font-medium text-[#8B9BB4]">Live expense breakdown</p>
                </div>
                <button type="button" onClick={() => onNavigate?.('reports')} className="text-xs font-bold text-[#4F8CFF] hover:underline">
                  Reports
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {(categoryBreakdown.length ? categoryBreakdown : [{ id: 'empty', name: 'No expenses yet', amount: 0, percent: 0 }]).map((category, index) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ringColors[index % ringColors.length] }} />
                        <span className="truncate font-bold text-[#F5F7FA]">{category.name}</span>
                      </div>
                      <span className="font-bold text-[#8B9BB4]">{category.percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
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
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-3">
          <MiniStat title="Income" value={money(report.income)} tone="success" />
          <MiniStat title="Expenses" value={money(report.expense)} tone="danger" />
          <MiniStat title="Accounts" value={accounts.length.toLocaleString()} tone="teal" />
        </motion.div>

        <motion.div variants={itemVariants}>
          <PremiumCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] p-5">
              <div>
                <p className="text-sm font-extrabold text-[#F5F7FA]">Recent Activity</p>
                <p className="mt-1 text-xs font-medium text-[#8B9BB4]">Realtime transaction stream</p>
              </div>
              <button type="button" onClick={() => onNavigate?.('history')} className="rounded-full bg-[#4F8CFF]/10 px-3 py-2 text-xs font-bold text-[#4F8CFF] hover:bg-[#4F8CFF]/20 transition">
                View all
              </button>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {recentTransactions.length ? recentTransactions.map((tx) => {
                const isIncome = tx.type === 'Income';
                const category = categories.find((c) => c.id === tx.categoryId);
                return (
                  <motion.div key={tx.id} layout className="flex items-center gap-3 p-4 transition hover:bg-white/[0.02]">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isIncome ? 'bg-[#1FD18B]/10 text-[#1FD18B]' : 'bg-[#FF5C75]/10 text-[#FF5C75]'}`}>
                      {isIncome ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#F5F7FA]">{tx.merchant || category?.name || tx.type}</p>
                      <p className="mt-0.5 text-xs font-medium text-[#8B9BB4]">{category?.name ?? 'General'} · {shortDate(tx.occurredOn)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-black ${isIncome ? 'text-[#1FD18B]' : 'text-[#FF5C75]'}`}>
                        {isIncome ? '+' : '-'}{money(tx.amount, tx.currency)}
                      </span>
                      <ChevronRight size={16} className="text-[#8B9BB4]" />
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="p-8 text-center text-sm font-semibold text-[#8B9BB4]">No transactions yet. Use the center action to add income or expense.</div>
              )}
            </div>
          </PremiumCard>
        </motion.div>
      </motion.div>
    </div>
  );
}



function PremiumCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[28px] border border-white/[0.06] bg-[#121A22]/60 shadow-2xl backdrop-blur-[12px] ${className}`}>
      {children}
    </section>
  );
}

function RingChart({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto grid h-52 w-52 place-items-center">
      <svg className="-rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="10" />
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
            <stop offset="0%" stopColor="#4F8CFF" />
            <stop offset="100%" stopColor="#1FD18B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-black tracking-tight text-[#F5F7FA]">{percent}%</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#8B9BB4]">Profit</p>
      </div>
    </div>
  );
}

function MetricRow({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#121A22]/40 p-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.04] shadow-sm" style={{ color }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#8B9BB4]">{label}</p>
        <p className="truncate text-base font-black text-[#F5F7FA]">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ title, value, tone }: { title: string; value: string; tone: 'success' | 'danger' | 'teal' }) {
  const color = tone === 'danger' ? '#FF5C75' : tone === 'success' ? '#1FD18B' : '#4F8CFF';
  return (
    <PremiumCard className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B9BB4]">{title}</p>
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      </div>
      <p className="mt-3 truncate text-2xl font-black tracking-tight text-[#F5F7FA]">{value}</p>
    </PremiumCard>
  );
}
