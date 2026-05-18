'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { hexaTrackApi } from '@/lib/api';
import type { AdminAnalyticsDashboard } from '@/lib/types';
import {
  Building2, Users, GitBranch, CreditCard, TrendingUp, TrendingDown,
  Activity, Globe, Zap, BarChart3, WalletCards
} from 'lucide-react';
import { motion } from 'framer-motion';

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
};

function MetricCard({ title, value, subtitle, icon: Icon, color, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-[11px] font-medium text-gray-500 mt-1">{title}</p>
      {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function SuperAdminDashboard() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<AdminAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    hexaTrackApi.admin.analyticsDashboard(90)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-white/[0.04] rounded-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-white/[0.04] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const d = data ?? {} as AdminAnalyticsDashboard;
  const txGrowth = d.transactionsByDay?.slice(-14).map(p => p.value) ?? [];
  const totalUsers = d.cumulativeUsersByDay?.at(-1)?.value ?? 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-1">Command Center</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Platform Overview</h1>
        </div>
        <div className="sm:ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <Activity size={12} className="animate-pulse" />
            System Healthy
          </span>
        </div>
      </motion.div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Total Users" value={totalUsers} icon={Users} color="#10B981" delay={0.05} />
        <MetricCard title="Total Organizations" value={(d.totalActiveOrganizations ?? 0) + (d.totalSuspendedOrganizations ?? 0)} subtitle={`${d.totalSuspendedOrganizations ?? 0} suspended`} icon={Building2} color="#0D9488" delay={0.1} />
        <MetricCard title="Total Workspaces" value={d.totalWorkspaces ?? 0} icon={Globe} color="#F59E0B" delay={0.15} />
        <MetricCard title="Revenue Metrics" value={`INR ${(d.estimatedMrrInr ?? 0).toLocaleString()}`} subtitle={`${d.payingSubscriptionCount ?? 0} paying subscriptions`} icon={CreditCard} color="#EC4899" delay={0.2} />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Individual Users" value={d.totalIndividualUsers ?? 0} icon={Users} color="#8B5CF6" delay={0.25} />
        <MetricCard title="Active Branches" value={d.activeBranches ?? 0} icon={GitBranch} color="#10B981" delay={0.3} />
        <MetricCard title="Total Transactions" value={d.totalTransactions ?? 0} icon={WalletCards} color="#0D9488" delay={0.35} />
        <MetricCard title="Active Sessions" value={d.activeSessions ?? 0} subtitle="Last 24 hours" icon={Activity} color="#F59E0B" delay={0.4} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard title="Organization Users" value={d.totalOrganizationUsers ?? 0} icon={Building2} color="#10B981" delay={0.45} />
        <MetricCard title="30d Income" value={`INR ${(d.totalSystemIncome30d ?? 0).toLocaleString()}`} icon={TrendingUp} color="#10B981" delay={0.5} />
        <MetricCard title="30d Expense" value={`INR ${(d.totalSystemExpense30d ?? 0).toLocaleString()}`} icon={TrendingDown} color="#EF4444" delay={0.55} />
        <MetricCard title="30d Net" value={`INR ${(d.totalSystemNet30d ?? 0).toLocaleString()}`} icon={BarChart3} color="#EC4899" delay={0.6} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User growth */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400">User Growth</p>
              <p className="text-lg font-bold text-white">{totalUsers}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users size={14} className="text-emerald-400" />
            </div>
          </div>
          <MiniChart data={d.cumulativeUsersByDay?.map(p => p.value) ?? []} color="#10B981" />
        </motion.div>

        {/* Transaction volume */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400">Transaction Volume</p>
              <p className="text-lg font-bold text-white">{txGrowth.reduce((s, v) => s + v, 0).toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 size={14} className="text-primary" />
            </div>
          </div>
          <MiniChart data={txGrowth} color="#0D9488" />
        </motion.div>

        {/* Organization growth */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400">Organization Growth</p>
              <p className="text-lg font-bold text-white">{(d.totalActiveOrganizations ?? 0) + (d.totalSuspendedOrganizations ?? 0)}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Globe size={14} className="text-amber-400" />
            </div>
          </div>
          <MiniChart data={d.organizationGrowthByDay?.map(p => p.value) ?? []} color="#F59E0B" />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-400">Workspace Activity</p>
            <p className="text-lg font-bold text-white">{d.workspaceActivityByDay?.slice(-7).reduce((s, p) => s + p.value, 0).toLocaleString() ?? 0}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Activity size={14} className="text-emerald-400" />
          </div>
        </div>
        <MiniChart data={d.workspaceActivityByDay?.map(p => p.value) ?? []} color="#10B981" />
      </motion.div>

      {/* Subscription breakdown */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
        <p className="text-xs font-semibold text-gray-400 mb-4">Subscription Distribution</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(d.activeSubscriptionsByPlan ?? []).map((plan, i) => {
            const colors = ['#10B981', '#0D9488', '#F59E0B', '#EC4899'];
            const c = colors[i % colors.length];
            return (
              <div key={plan.plan} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: c }} />
                <p className="text-xl font-bold text-white">{plan.count}</p>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">{plan.plan}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
        <p className="text-xs font-semibold text-gray-400 mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Workspace', href: '/super-admin/workspaces', icon: Zap, color: '#10B981' },
            { label: 'New Organization', href: '/super-admin/organizations', icon: Building2, color: '#0D9488' },
            { label: 'Manage Users', href: '/super-admin/users', icon: Users, color: '#F59E0B' },
            { label: 'View Analytics', href: '/super-admin/analytics', icon: BarChart3, color: '#EC4899' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${action.color}15` }}>
                <action.icon size={18} style={{ color: action.color }} />
              </div>
              <p className="text-[11px] font-semibold text-gray-400 group-hover:text-white transition-colors">{action.label}</p>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
