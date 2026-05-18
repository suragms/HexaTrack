'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { hexaTrackApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminAlert } from '@/lib/types';
import { BellRing, CheckCircle2, Clock, RefreshCw, Search } from 'lucide-react';

const severityStyles: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-300 border-red-500/20',
  High: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  Medium: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Low: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Info: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

export default function AlertsPage() {
  const { accessToken } = useAuthStore();
  const [active, setActive] = useState<AdminAlert[]>([]);
  const [history, setHistory] = useState<AdminAlert[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [activeAlerts, resolvedAlerts] = await Promise.all([
        hexaTrackApi.admin.alerts.getActive(),
        hexaTrackApi.admin.alerts.getHistory(1, 50),
      ]);
      setActive(activeAlerts);
      setHistory(resolvedAlerts);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string) => {
    setResolvingId(id);
    try {
      await hexaTrackApi.admin.alerts.resolve(id);
      await load();
    } finally {
      setResolvingId(null);
    }
  };

  const visibleActive = active.filter((alert) => matches(alert, query));
  const visibleHistory = history.filter((alert) => matches(alert, query));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Realtime Monitoring</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Alert Center</h1>
          <p className="mt-1 text-xs text-gray-500">Security, billing, tenant, and platform alerts generated from database state.</p>
        </div>
        <button onClick={load} className="sm:ml-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-gray-300 hover:bg-white/[0.04]">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search alerts by type, severity, title or message..."
          className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#0E1425] pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-amber-500/30"
        />
      </div>

      <section className="rounded-2xl border border-white/[0.06] bg-[#0E1425]">
        <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
          <div className="flex items-center gap-2">
            <BellRing size={16} className="text-amber-300" />
            <h2 className="text-sm font-bold text-white">Active Alerts</h2>
          </div>
          <span className="text-xs font-semibold text-gray-500">{visibleActive.length} open</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-xs text-gray-500">Loading alerts...</div>
        ) : visibleActive.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-400" />
            <p className="text-sm font-semibold text-white">No active alerts</p>
            <p className="mt-1 text-xs text-gray-500">The latest scan did not find unresolved platform issues.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {visibleActive.map((alert) => (
              <AlertRow key={alert.id} alert={alert} actionLabel="Resolve" busy={resolvingId === alert.id} onAction={() => resolve(alert.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-[#0E1425]">
        <div className="flex items-center justify-between border-b border-white/[0.04] px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <h2 className="text-sm font-bold text-white">Alert History</h2>
          </div>
          <span className="text-xs font-semibold text-gray-500">{visibleHistory.length} resolved</span>
        </div>
        {visibleHistory.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-500">No resolved alerts match this search.</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {visibleHistory.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AlertRow({ alert, actionLabel, busy, onAction }: { alert: AdminAlert; actionLabel?: string; busy?: boolean; onAction?: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[140px_1fr_130px] lg:items-center">
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${severityStyles[alert.severity] ?? severityStyles.Info}`}>
          {alert.severity}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{alert.type}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-white">{alert.title}</p>
        <p className="mt-1 text-xs text-gray-500">{alert.message}</p>
        <p className="mt-1 text-[10px] text-gray-600">{new Date(alert.createdAt).toLocaleString()}</p>
      </div>
      {onAction && (
        <button onClick={onAction} disabled={busy} className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60 lg:ml-auto">
          {busy && <RefreshCw size={12} className="animate-spin" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function matches(alert: AdminAlert, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [alert.type, alert.title, alert.message, alert.severity].some((value) => value.toLowerCase().includes(q));
}
