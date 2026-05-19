'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Search,
  Shield,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { BrandMark } from '@/components/ui/brand';
import { hexaTrackApi } from '@/lib/api';
import type { AdminAnalyticsDashboard } from '@/lib/types';
import { useAuthStore } from '@/store/auth-store';

const tabs = ['Today', 'Week', 'Month', 'Year'] as const;

export default function SuperAdminDashboard() {
  const { accessToken, user } = useAuthStore();
  const [data, setData] = useState<AdminAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Month');

  useEffect(() => {
    if (!accessToken) return;
    hexaTrackApi.admin.analyticsDashboard(90)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const d = data ?? ({} as AdminAnalyticsDashboard);
  const totalUsers = d.cumulativeUsersByDay?.at(-1)?.value ?? 0;
  const organizationCount = (d.totalActiveOrganizations ?? 0) + (d.totalSuspendedOrganizations ?? 0);
  const transactionSeries = d.transactionsByDay?.slice(-14).map((p) => p.value) ?? [];
  const maxSeries = Math.max(...transactionSeries, 1);
  const revenueEfficiency = Math.max(0, Math.min(100, Math.round(((d.totalSystemNet30d ?? 0) / Math.max(d.totalSystemIncome30d ?? 1, 1)) * 100)));

  const cards = useMemo(() => [
    { title: 'Users', value: totalUsers, subtitle: `${d.totalIndividualUsers ?? 0} individual`, icon: Users, color: '#0F9D8A' },
    { title: 'Organizations', value: organizationCount, subtitle: `${d.totalSuspendedOrganizations ?? 0} suspended`, icon: Building2, color: '#00BFA6' },
    { title: 'Revenue', value: `INR ${(d.estimatedMrrInr ?? 0).toLocaleString()}`, subtitle: `${d.payingSubscriptionCount ?? 0} paying`, icon: CreditCard, color: '#10B981' },
    { title: 'Alerts', value: d.activeSessions ?? 0, subtitle: 'active sessions', icon: AlertTriangle, color: '#F59E0B' },
  ], [d.activeSessions, d.estimatedMrrInr, d.payingSubscriptionCount, d.totalIndividualUsers, d.totalSuspendedOrganizations, organizationCount, totalUsers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7F8] p-6">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-16 rounded-[28px] bg-white" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-36 rounded-[28px] bg-white" />)}
          </div>
          <div className="h-80 rounded-[28px] bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7F8] text-[#102A43]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:py-8">
        <header className="sticky top-0 z-30 -mx-4 border-b border-[#E5E7EB]/70 bg-[#F5F7F8]/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,157,138,0.14)] ring-1 ring-[#E5E7EB]">
              <BrandMark tone="light" className="h-6 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F9D8A]">Super Admin</p>
              <h1 className="truncate text-lg font-extrabold tracking-tight text-[#102A43]">Platform Overview</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <IconButton label="Search" icon={Search} />
              <IconButton label="Notifications" icon={Bell} hasBadge />
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#0F9D8A] to-[#00BFA6] text-sm font-black text-white">
                {(user?.displayName ?? 'S').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F9D8A] via-[#00BFA6] to-[#0B6B61] p-5 text-white shadow-[0_22px_55px_rgba(15,157,138,0.28)] lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-white/75">Platform revenue health</p>
              <p className="mt-2 text-4xl font-black tracking-tight lg:text-5xl">INR {(d.estimatedMrrInr ?? 0).toLocaleString()}</p>
              <p className="mt-3 text-sm font-semibold text-white/80">{revenueEfficiency}% net efficiency over the last 30 days</p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white/15 p-2 backdrop-blur">
              <HeroStat label="Users" value={totalUsers.toLocaleString()} />
              <HeroStat label="Workspaces" value={(d.totalWorkspaces ?? 0).toLocaleString()} />
              <HeroStat label="Transactions" value={(d.totalTransactions ?? 0).toLocaleString()} />
            </div>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-10 shrink-0 rounded-full px-5 text-sm font-bold transition ${
                activeTab === tab ? 'bg-[#0F9D8A] text-white shadow-[0_12px_24px_rgba(15,157,138,0.24)]' : 'bg-white text-[#6B7280] ring-1 ring-[#E5E7EB]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, index) => (
            <motion.section
              key={card.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_rgba(16,42,67,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF8F6]" style={{ color: card.color }}>
                  <card.icon size={21} />
                </div>
                <span className="rounded-full bg-[#F5F7F8] px-2.5 py-1 text-[11px] font-bold text-[#6B7280]">{card.subtitle}</span>
              </div>
              <p className="mt-5 truncate text-2xl font-black tracking-tight text-[#102A43]">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#6B7280]">{card.title}</p>
            </motion.section>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_rgba(16,42,67,0.08)] lg:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#102A43]">Realtime Analytics</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280]">Transaction volume from live platform metrics</p>
              </div>
              <BarChart3 className="text-[#0F9D8A]" />
            </div>
            <div className="mt-8 flex h-64 items-end gap-2">
              {(transactionSeries.length ? transactionSeries : [0, 0, 0, 0, 0, 0, 0]).map((value, index) => (
                <motion.div
                  key={`${value}-${index}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(8, (value / maxSeries) * 100)}%` }}
                  transition={{ duration: 0.55, delay: index * 0.03 }}
                  className="flex-1 rounded-t-2xl bg-gradient-to-t from-[#0B6B61] via-[#0F9D8A] to-[#00BFA6] shadow-[0_12px_24px_rgba(15,157,138,0.18)]"
                />
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_45px_rgba(16,42,67,0.08)] lg:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-[#102A43]">SaaS Metrics</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280]">No fake data, API backed</p>
              </div>
              <Activity className="text-[#10B981]" />
            </div>
            <div className="mt-5 space-y-3">
              <MetricLine label="Active branches" value={(d.activeBranches ?? 0).toLocaleString()} icon={Shield} />
              <MetricLine label="Organization users" value={(d.totalOrganizationUsers ?? 0).toLocaleString()} icon={Users} />
              <MetricLine label="30d income" value={`INR ${(d.totalSystemIncome30d ?? 0).toLocaleString()}`} icon={TrendingUp} />
              <MetricLine label="30d expense" value={`INR ${(d.totalSystemExpense30d ?? 0).toLocaleString()}`} icon={WalletCards} />
            </div>
          </section>
        </div>
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

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 text-center">
      <p className="text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
    </div>
  );
}

function MetricLine({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F5F7F8] p-3">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#0F9D8A] shadow-sm">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#6B7280]">{label}</p>
        <p className="truncate text-base font-black text-[#102A43]">{value}</p>
      </div>
    </div>
  );
}
