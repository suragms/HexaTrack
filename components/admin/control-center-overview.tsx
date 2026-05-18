'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import type { AdminAnalyticsDashboard, AdminAnalyticsOverview, AdminAuditLogDto } from '@/lib/types';
import { EnterpriseAnalyticsSkeleton } from '@/components/admin/enterprise-analytics-skeleton';

import { AdminKpiCards } from '@/components/admin/admin-kpi-cards';
import { OrganizationList } from '@/components/admin/organization-list';
import { AuditLogPanel } from '@/components/admin/audit-log';

const EnterpriseAnalyticsPanel = dynamic(
  () =>
    import('@/components/admin/enterprise-analytics').then((mod) => ({
      default: mod.EnterpriseAnalytics,
    })),
  {
    ssr: false,
    loading: () => <EnterpriseAnalyticsSkeleton />,
  },
);

function formatRefreshedAt(d: Date): string {
  try {
    return d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  } catch {
    return '';
  }
}

function formatAuditTime(iso: string): string {
  try {
     const date = new Date(iso);
     const now = new Date();
     const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
     if (diff < 1) return 'just now';
     if (diff < 60) return `${diff}m ago`;
     if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
     return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
     return 'recently';
  }
}

const RANGE_OPTIONS = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 365, label: '1Y' },
] as const;

export type ControlCenterOverviewProps = {
  overview: AdminAnalyticsOverview | null;
  dashboard: AdminAnalyticsDashboard | null;
  overviewLoading: boolean;
  dashboardLoading: boolean;
  overviewError: string | null;
  dashboardError: string | null;
  auditItems: AdminAuditLogDto[];
  auditLoading: boolean;
  chartDays: number;
  onChartDaysChange: (days: number) => void;
  onRetry: () => void;
  onOpenAudit: () => void;
  lastRefreshedAt: Date | null;
  onRefresh: () => void;
};

export function ControlCenterOverview({
  overview,
  dashboard,
  overviewLoading,
  dashboardLoading,
  overviewError,
  dashboardError,
  auditItems,
  chartDays,
  onChartDaysChange,
  onRetry,
  lastRefreshedAt,
  onRefresh,
}: ControlCenterOverviewProps) {
  const showSkeleton = (overviewLoading && !overview) || (dashboardLoading && !dashboard);
  const err = overviewError ?? dashboardError;

  const mappedKpiStats = overview ? {
     orgs: dashboard?.totalActiveOrganizations || overview.totalWorkspaces,
     tokens: overview.aiPromptTokensLast30Days + overview.aiCompletionTokensLast30Days,
     revenue: dashboard?.totalSystemIncome30d || 0
  } : undefined;

  const mappedAudit = auditItems.slice(0, 6).map(a => ({
     id: a.id,
     title: a.action.replace(/\./g, ' ').toUpperCase(),
     timestamp: formatAuditTime(a.createdAt),
     userInitials: 'SYS',
     role: 'Admin' as const,
     status: a.action.includes('.denied') ? 'Denied' as const : 'Success' as const
  }));

  return (
    <div className="relative mx-auto max-w-7xl w-full space-y-10 pb-28 lg:pb-10 px-container-margin lg:px-gutter pt-6 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Advanced Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div>
            <div className="flex items-center gap-2 mb-2">
               <p className="font-label-caps text-[11px] text-cyan tracking-widest uppercase font-black">Control Substrate</p>
               <div className="w-1.5 h-1.5 rounded-full bg-cyan shadow-[0_0_8px_#10B981]" />
            </div>
            <h2 className="font-headline text-3xl md:text-4xl text-on-surface font-extrabold tracking-tight">Command Center</h2>
            <p className="text-[11px] font-sans text-on-surface-variant font-semibold mt-2 flex items-center gap-2">
               <span className="uppercase tracking-wider font-label-caps opacity-70">Aggregated Telemetry Sync</span>
               {lastRefreshedAt && (
                  <>
                     <span className="w-[1px] h-3 bg-white/10" />
                     <span className="text-emerald font-mono-data font-bold uppercase tracking-wider">Active {formatRefreshedAt(lastRefreshedAt)}</span>
                  </>
               )}
            </p>
         </div>

         <div className="flex items-center gap-3">
            <div className="bg-[#0E152B] border border-white/[0.04] p-1.5 rounded-[20px] flex gap-1 shadow-sm">
               {RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => onChartDaysChange(opt.days)}
                    className={`px-4 py-2 rounded-xl font-black text-[9px] font-label-caps tracking-widest whitespace-nowrap active:scale-95 transition-all ${
                       chartDays === opt.days ? 'bg-white/5 text-cyan shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-white/[0.03]' : 'text-on-surface-variant opacity-60 hover:opacity-100'
                    }`}
                  >
                     {opt.label}
                  </button>
               ))}
            </div>
            <button 
              onClick={onRefresh}
              disabled={overviewLoading}
              className="w-[42px] h-[42px] rounded-[18px] bg-[#0E152B] border border-white/[0.04] flex items-center justify-center text-on-surface-variant hover:text-cyan hover:border-cyan/20 active:scale-95 transition-all disabled:opacity-50 shadow-inner"
            >
               <RefreshCw size={15} className={overviewLoading ? 'animate-spin' : ''} />
            </button>
         </div>
      </div>

      {/* Diagnostic Signal Loss */}
      {err && (
         <div className="bg-danger/10 border border-danger/20 rounded-[28px] p-5.5 flex items-center justify-between animate-pulse shadow-inner">
            <div className="flex items-center gap-3.5">
               <AlertCircle size={22} className="text-danger" />
               <p className="text-sm font-bold text-danger font-sans tracking-wide">Subsystem Offline: {err}</p>
            </div>
            <button onClick={onRetry} className="px-5 py-2.5 bg-danger text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:brightness-105 active:scale-95 transition-all shadow-lg shadow-danger/20 font-label-caps border border-white/[0.1]">Reboot Link</button>
         </div>
      )}

      {/* 1. Core KPI Matrix */}
      <AdminKpiCards overview={overview} dashboard={dashboard} loading={showSkeleton} />

      {/* 2. Operation Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-stack-lg mt-2">
         {/* Left: Subscribed Registry */}
         <div className="xl:col-span-7 min-h-[400px] flex flex-col">
            <OrganizationList loading={showSkeleton} />
         </div>
         
         {/* Right: System Signals */}
         <div className="xl:col-span-5 min-h-[400px] flex flex-col">
            <AuditLogPanel events={mappedAudit.length > 0 ? mappedAudit : undefined} />
         </div>
      </div>

      {/* 3. Dynamic Plot Stream */}
      {!err && dashboard && (
        <motion.div
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="glass-card rounded-[28px] p-6.5 border border-white/[0.05] bg-[#0E152B]/20 shadow-lg mt-6"
        >
           <EnterpriseAnalyticsPanel dashboard={dashboard} chartDays={chartDays} />
        </motion.div>
      )}
    </div>
  );
}

