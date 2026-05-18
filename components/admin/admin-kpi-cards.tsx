'use client';

import { motion } from 'framer-motion';
import {
  Building2,
  Zap,
  DollarSign,
  ArrowUpRight,
  Users,
  Wallet,
  Layers,
  Activity,
  UserCheck,
  UserX
} from 'lucide-react';
import type { AdminAnalyticsOverview, AdminAnalyticsDashboard } from '@/lib/types';

interface AdminKpiCardsProps {
  overview: AdminAnalyticsOverview | null;
  dashboard: AdminAnalyticsDashboard | null;
  loading?: boolean;
}

export function AdminKpiCards({ overview, dashboard, loading }: AdminKpiCardsProps) {
  if (loading || !overview || !dashboard) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-[24px] bg-[#0E152B]/40 border border-white/[0.04]" />
        ))}
      </div>
    );
  }

  const mrrFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(dashboard.estimatedMrrInr);

  const totalTxCount = dashboard.transactionsByDay.reduce((acc, x) => acc + x.value, 0);
  const activeSessions = dashboard.activeUsersByDay[dashboard.activeUsersByDay.length - 1]?.value ?? 0;
  const totalOrgs = dashboard.totalActiveOrganizations + dashboard.totalSuspendedOrganizations;

  const metrics = [
    {
      label: 'System Users',
      key: 'Total Users',
      value: overview.totalUsers.toLocaleString(),
      suffix: `SUPER: ${overview.superAdminUsers} · LOCKED: ${overview.lockedUsers}`,
      icon: Users,
      color: 'text-cyan',
      glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] border-white/[0.05]',
      growth: '+14%'
    },
    {
      label: 'Tenant Structures',
      key: 'Organizations',
      value: totalOrgs.toLocaleString(),
      suffix: `ACTIVE: ${dashboard.totalActiveOrganizations} · INACTIVE: ${dashboard.totalSuspendedOrganizations}`,
      icon: Building2,
      color: 'text-primary',
      glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] border-white/[0.05]',
      growth: '+8%'
    },
    {
      label: 'Personal Accounts',
      key: 'Individual Users',
      value: dashboard.totalIndividualUsers.toLocaleString(),
      suffix: 'STANDALONE PERSONAL MODE',
      icon: UserCheck,
      color: 'text-emerald',
      glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] border-white/[0.05]',
      growth: '+22%'
    },
    {
      label: 'Ledger Environments',
      key: 'Total Workspaces',
      value: overview.totalWorkspaces.toLocaleString(),
      suffix: 'ACTIVE WORKSPACE NODES',
      icon: Wallet,
      color: 'text-cyan',
      glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] border-white/[0.05]',
      growth: '+12%'
    },
    {
      label: 'Tenant Nodes',
      key: 'Active Branches',
      value: dashboard.payingSubscriptionCount.toLocaleString(),
      suffix: 'DECENTRALIZED ENTERPRISE SEATS',
      icon: Layers,
      color: 'text-primary',
      glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] border-white/[0.05]',
      growth: '+5%'
    },
    {
      label: 'Ledger Operations',
      key: 'Total Transactions',
      value: totalTxCount.toLocaleString(),
      suffix: `LAST ${dashboard.transactionsByDay.length} DAYS MUTATION CADENCE`,
      icon: Activity,
      color: 'text-emerald',
      glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] border-white/[0.05]',
      growth: '+18%'
    },
    {
      label: 'Yield Velocity',
      key: 'Revenue MRR',
      value: mrrFormatted,
      suffix: `ARPU: ₹${Math.round(dashboard.averageRevenuePerPayingUserInr)}`,
      icon: DollarSign,
      color: 'text-emerald',
      glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] border-white/[0.05]',
      growth: '+6%'
    },
    {
      label: 'Active Pulse',
      key: 'Active Sessions',
      value: activeSessions.toLocaleString(),
      suffix: 'DAILY ACTIVE TELEMETRY DAU',
      icon: Zap,
      color: 'text-cyan',
      glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] border-white/[0.05]',
      growth: '+28%'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full font-sans">
      {metrics.map((metric, i) => (
        <motion.div
          key={metric.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.4 }}
          className={`relative backdrop-blur-md border rounded-[24px] p-5 overflow-hidden group hover:border-cyan/25 transition-all cursor-default bg-[#0E152B]/40 ${metric.glow}`}
        >
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/[0.005] rounded-full blur-2xl pointer-events-none transition-all" />
          
          <div className="flex justify-between items-start relative z-10 mb-4">
            <div>
              <p className="font-label-caps text-[9px] font-black tracking-widest text-on-surface-variant/65 uppercase">{metric.label}</p>
              <h3 className="font-bold text-on-surface text-[14px] tracking-wide mt-0.5">{metric.key}</h3>
            </div>
            <div className={`w-9 h-9 rounded-xl bg-[#0E152B] border border-white/[0.04] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform ${metric.color}`}>
              <metric.icon size={15} />
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <div>
              <p className="font-mono-data text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight leading-none select-all">{metric.value}</p>
              <p className="font-label-caps text-[8px] font-bold tracking-widest text-on-surface-variant opacity-60 uppercase mt-2.5">{metric.suffix}</p>
            </div>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald/10 border border-emerald/10 rounded text-emerald text-[9px] font-black font-label-caps tracking-wide">
              <ArrowUpRight size={8} strokeWidth={3} />
              {metric.growth}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
