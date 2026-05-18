'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { hexaTrackApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminCreateWorkspaceRequest, AdminWorkspaceListItem, WorkspaceType } from '@/lib/types';
import { Layers, Search, ChevronLeft, ChevronRight, Plus, Wrench, X, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const MODE_COLORS: Record<string, string> = { Personal: '#10B981', Business: '#0D9488', Family: '#F59E0B' };

export default function WorkspacesPage() {
  const { accessToken } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const pageSize = 20;

  const fetch = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const r = await hexaTrackApi.admin.workspaces(search || undefined, page, pageSize);
      setWorkspaces(r.items); setTotalCount(r.totalCount);
    } catch {}
    setLoading(false);
  }, [accessToken, search, page]);

  useEffect(() => { fetch(); }, [fetch]);
  const totalPages = Math.ceil(totalCount / pageSize);

  const repairAccess = async (workspaceId: string) => {
    setActionId(workspaceId);
    try {
      await hexaTrackApi.admin.repairWorkspaceAccess(workspaceId);
      await fetch();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] mb-1">Management</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Workspaces</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="sm:ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-500"
        >
          <Plus size={15} />
          Create Workspace
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search workspaces..." className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.06] bg-[#0E1425] text-sm text-white placeholder:text-gray-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0E1425] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_120px] gap-4 px-5 py-3 border-b border-white/[0.04] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <span>Workspace</span><span>Type</span><span>Owner</span><span>Members</span><span>Plan</span><span>Controls</span>
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : workspaces.length === 0 ? (
          <div className="p-12 text-center"><Layers size={40} className="mx-auto text-gray-600 mb-3" /><p className="text-sm text-gray-500">No workspaces found</p></div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {workspaces.map((ws, i) => (
              <motion.div key={ws.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_120px] gap-2 lg:gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${MODE_COLORS[ws.type] ?? '#6B7280'}15` }}>
                    <Layers size={16} style={{ color: MODE_COLORS[ws.type] ?? '#6B7280' }} />
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{ws.name}</p>
                </div>
                <span className="inline-flex w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ color: MODE_COLORS[ws.type], background: `${MODE_COLORS[ws.type]}15` }}>{ws.type}</span>
                <p className="text-xs text-gray-400 truncate">{ws.ownerEmail}</p>
                <p className="text-sm text-gray-300">{ws.memberCount}</p>
                <span className="text-xs font-medium text-gray-400">{ws.ownerSubscriptionPlan ?? 'Free'}</span>
                <button
                  onClick={() => repairAccess(ws.id)}
                  disabled={actionId === ws.id}
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-60"
                >
                  {actionId === ws.id ? <RefreshCw size={12} className="animate-spin" /> : <Wrench size={12} />}
                  Repair
                </button>
              </motion.div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-gray-500">{totalCount} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center text-gray-500 disabled:opacity-30"><ChevronLeft size={14} /></button>
              <span className="text-xs text-gray-400 px-2">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center text-gray-500 disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetch();
          }}
        />
      )}
    </div>
  );
}

function CreateWorkspaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<AdminCreateWorkspaceRequest>({
    ownerUserId: '',
    name: '',
    type: 'Business',
    mode: 'Individual',
    currency: 'USD',
    organizationId: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await hexaTrackApi.admin.createWorkspace({
        ...form,
        organizationId: form.organizationId?.trim() ? form.organizationId.trim() : null,
        ownerUserId: form.ownerUserId.trim(),
        name: form.name.trim(),
        currency: form.currency.trim().toUpperCase(),
      });
      onCreated();
    } catch (e: any) {
      setError(e.message ?? 'Workspace creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0E1425] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Create Workspace</h2>
            <p className="mt-0.5 text-[10px] text-gray-500">Creates a real workspace row and owner membership.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Owner User ID</span>
            <input required value={form.ownerUserId} onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))} className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#141828] px-3 text-xs text-white outline-none focus:border-cyan-500/30" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Workspace Name</span>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#141828] px-3 text-xs text-white outline-none focus:border-cyan-500/30" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Type</span>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as WorkspaceType }))} className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#141828] px-3 text-xs text-white outline-none focus:border-cyan-500/30">
                <option value="Personal">Personal</option>
                <option value="Business">Business</option>
                <option value="Family">Family</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Mode</span>
              <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as AdminCreateWorkspaceRequest['mode'] }))} className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#141828] px-3 text-xs text-white outline-none focus:border-cyan-500/30">
                <option value="Individual">Individual</option>
                <option value="Organization">Organization</option>
                <option value="Branch">Branch</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Currency</span>
              <input required value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#141828] px-3 text-xs uppercase text-white outline-none focus:border-cyan-500/30" maxLength={3} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Organization ID</span>
              <input value={form.organizationId ?? ''} onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))} className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#141828] px-3 text-xs text-white outline-none focus:border-cyan-500/30" />
            </label>
          </div>
          {error && <p className="rounded-xl border border-red-500/10 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-white/[0.06] px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-gray-400 hover:bg-white/[0.03] hover:text-white">Cancel</button>
          <button disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60">
            {submitting && <RefreshCw size={12} className="animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
