'use client';

import React, { useEffect, useState } from 'react';
import { hexaTrackApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminAnalyticsDashboard } from '@/lib/types';
import { BarChart3, TrendingUp, TrendingDown, Users, Layers, DollarSign, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

function SparkLine({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${100 - (v / max) * 85}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`ag-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${pts} 100,100`} fill={`url(#ag-${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<AdminAnalyticsDashboard | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    hexaTrackApi.admin.analyticsDashboard(days).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [accessToken, days]);

  if (loading) return <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const d = data ?? {} as AdminAnalyticsDashboard;

  const charts = [
    { title: 'New Users', data: d.newUsersByDay?.map(p => p?.value ?? 0) ?? [], color: '#10B981', icon: Users, total: d.newUsersByDay?.reduce((s, p) => s + (p?.value ?? 0), 0) ?? 0 },
    { title: 'Cumulative Users', data: d.cumulativeUsersByDay?.map(p => p?.value ?? 0) ?? [], color: '#0D9488', icon: Users, total: d.cumulativeUsersByDay?.at(-1)?.value ?? 0 },
    { title: 'New Workspaces', data: d.newWorkspacesByDay?.map(p => p?.value ?? 0) ?? [], color: '#F59E0B', icon: Layers, total: d.newWorkspacesByDay?.reduce((s, p) => s + (p?.value ?? 0), 0) ?? 0 },
    { title: 'Active Users', data: d.activeUsersByDay?.map(p => p?.value ?? 0) ?? [], color: '#EC4899', icon: Activity, total: d.activeUsersByDay?.at(-1)?.value ?? 0 },
    { title: 'Transactions', data: d.transactionsByDay?.map(p => p?.value ?? 0) ?? [], color: '#10B981', icon: BarChart3, total: d.transactionsByDay?.reduce((s, p) => s + (p?.value ?? 0), 0) ?? 0 },
    { title: 'Token Usage', data: d.tokenUsageByDay?.map(p => (p?.promptTokens ?? 0) + (p?.completionTokens ?? 0)) ?? [], color: '#8B5CF6', icon: DollarSign, total: d.tokenUsageByDay?.reduce((s, p) => s + (p?.promptTokens ?? 0) + (p?.completionTokens ?? 0), 0) ?? 0 },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-[0.2em] mb-1">Insights</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Analytics</h1>
        </div>
        <div className="sm:ml-auto flex gap-2">
          {[30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${days === d ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <p className="text-xs font-semibold text-gray-400">30d System Income</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">₹{(d.totalSystemIncome30d ?? 0).toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-red-400" />
            <p className="text-xs font-semibold text-gray-400">30d System Expense</p>
          </div>
          <p className="text-2xl font-bold text-red-400">₹{(d.totalSystemExpense30d ?? 0).toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-amber-400" />
            <p className="text-xs font-semibold text-gray-400">Est. MRR</p>
          </div>
          <p className="text-2xl font-bold text-amber-400">₹{(d.estimatedMrrInr ?? 0).toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Chart grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map((chart, i) => (
          <motion.div key={chart.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-500">{chart.title}</p>
                <p className="text-lg font-bold text-white">{chart.total.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${chart.color}15` }}>
                <chart.icon size={14} style={{ color: chart.color }} />
              </div>
            </div>
            <SparkLine data={chart.data} color={chart.color} />
          </motion.div>
        ))}
      </div>

      {/* Expense category breakdown */}
      {(d.expenseCategoryTotals ?? []).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-white/[0.06] bg-[#0E1425] p-5">
          <p className="text-xs font-semibold text-gray-400 mb-4">Top Expense Categories (Platform-wide)</p>
          <div className="space-y-3">
            {d.expenseCategoryTotals.slice(0, 8).map((cat, i) => {
              const maxAmount = d.expenseCategoryTotals[0]?.totalAmount ?? 1;
              const pct = (cat.totalAmount / maxAmount) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <p className="text-xs text-gray-400 w-32 truncate">{cat.categoryName}</p>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
                  </div>
                  <p className="text-xs font-semibold text-white w-20 text-right">₹{cat.totalAmount.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
