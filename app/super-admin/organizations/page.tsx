'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { hexaTrackApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { showToast } from '@/components/ui/toast';
import type { OrganizationListItem, CreateOrganizationRequest, OrgPlan } from '@/lib/types';
import {
  Building2, Plus, Search, MoreVertical, Users, GitBranch, Crown,
  Pause, Play, Trash2, Edit, X, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PLANS: OrgPlan[] = ['Free', 'Basic', 'Growth', 'Pro', 'ProMax', 'Enterprise'];
const WORKSPACE_MODES = ['Organization', 'Branch', 'Enterprise'] as const;
const PLAN_COLORS: Record<string, string> = {
  Free: '#6B7280', Basic: '#3B82F6', Growth: '#10B981', Pro: '#8B5CF6', ProMax: '#F59E0B', Enterprise: '#EC4899'
};

export default function OrganizationsPage() {
  const { accessToken } = useAuthStore();
  const [orgs, setOrgs] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [actionOrg, setActionOrg] = useState<string | null>(null);

  const pageSize = 20;

  const fetchOrgs = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await hexaTrackApi.admin.organizations(search || undefined, page, pageSize);
      setOrgs(result.items);
      setTotalCount(result.totalCount);
    } catch { }
    setLoading(false);
  }, [accessToken, search, page]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleSuspend = async (id: string) => {
    try {
      await hexaTrackApi.admin.suspendOrganization(id, { reason: 'Suspended by admin' });
      showToast('success', 'Organization suspended successfully');
      setActionOrg(null);
      fetchOrgs();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'Failed to suspend organization');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await hexaTrackApi.admin.activateOrganization(id);
      showToast('success', 'Organization activated successfully');
      setActionOrg(null);
      fetchOrgs();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'Failed to activate organization');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this organization? This cannot be undone.')) return;
    try {
      await hexaTrackApi.admin.deleteOrganization(id);
      showToast('success', 'Organization deleted successfully');
      setActionOrg(null);
      fetchOrgs();
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || 'Failed to delete organization');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Management</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organizations</h1>
        </div>
        <div className="sm:ml-auto">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            New Organization
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search organizations..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.06] bg-[#0E1425] text-sm text-white placeholder:text-gray-600 outline-none focus:border-emerald-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0E1425] overflow-hidden">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_60px] gap-4 px-5 py-3 border-b border-white/[0.04] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <span>Organization</span>
          <span>Plan</span>
          <span>Status</span>
          <span>Branches</span>
          <span>Staff</span>
          <span>MRR</span>
          <span />
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">No organizations found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {orgs.map((org, i) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="relative grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_60px] gap-2 lg:gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Name */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${PLAN_COLORS[org.plan] ?? '#6B7280'}15` }}>
                    <Building2 size={16} style={{ color: PLAN_COLORS[org.plan] ?? '#6B7280' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{org.name}</p>
                    {org.slug && <p className="text-[10px] text-gray-600 truncate">{org.slug}</p>}
                  </div>
                </div>

                {/* Plan badge */}
                <div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ color: PLAN_COLORS[org.plan], background: `${PLAN_COLORS[org.plan]}15` }}>
                    {org.plan}
                  </span>
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${org.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10' : org.status === 'Suspended' ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-gray-500/10'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'Active' ? 'bg-emerald-400' : org.status === 'Suspended' ? 'bg-red-400' : 'bg-gray-400'}`} />
                    {org.status}
                  </span>
                </div>

                {/* Branches */}
                <div className="flex items-center gap-1.5 text-sm text-gray-300">
                  <GitBranch size={13} className="text-gray-500" />
                  {org.branchCount}
                </div>

                {/* Staff */}
                <div className="flex items-center gap-1.5 text-sm text-gray-300">
                  <Users size={13} className="text-gray-500" />
                  {org.ownerCount + org.staffCount}
                </div>

                {/* MRR */}
                <p className="text-sm font-semibold text-white">₹{org.estimatedMrr?.toLocaleString() ?? 0}</p>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() => setActionOrg(actionOrg === org.id ? null : org.id)}
                    className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
                  >
                    <MoreVertical size={16} />
                  </button>
                  <AnimatePresence>
                    {actionOrg === org.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-10 w-44 rounded-xl border border-white/[0.08] bg-[#141828] shadow-xl z-20 py-1"
                      >
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.04]">
                          <Edit size={13} /> Edit
                        </button>
                        {org.status === 'Active' ? (
                          <button onClick={() => handleSuspend(org.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:bg-white/[0.04]">
                            <Pause size={13} /> Suspend
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(org.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-white/[0.04]">
                            <Play size={13} /> Activate
                          </button>
                        )}
                        <button onClick={() => handleDelete(org.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/[0.04]">
                          <Trash2 size={13} /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04]">
            <p className="text-[11px] text-gray-500">{totalCount} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center text-gray-500 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-400 px-2">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center text-gray-500 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && <CreateOrganizationModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchOrgs(); }} />}
      </AnimatePresence>
    </div>
  );
}

function CreateOrganizationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateOrganizationRequest>({
    name: '', slug: '', plan: 'Free', currency: 'INR', maxBranches: 1, maxStaff: 5,
    ownerName: '', ownerEmail: '', ownerPassword: '',
  });
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateField = <K extends keyof CreateOrganizationRequest>(key: K, value: CreateOrganizationRequest[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await hexaTrackApi.admin.createOrganization(form);
      onCreated();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create');
    }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0E1425] shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white">New Organization</h2>
            <p className="text-[11px] text-gray-500">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Organization Name</label>
                <input value={form.name} onChange={e => updateField('name', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none focus:border-emerald-500/30" placeholder="Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Plan</label>
                  <select value={form.plan} onChange={e => updateField('plan', e.target.value as OrgPlan)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none">
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Currency</label>
                  <select value={form.currency} onChange={e => updateField('currency', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none">
                    {['INR', 'USD', 'EUR', 'AED'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Max Branches</label>
                  <input type="number" value={form.maxBranches} onChange={e => updateField('maxBranches', +e.target.value)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Max Staff</label>
                  <input type="number" value={form.maxStaff} onChange={e => updateField('maxStaff', +e.target.value)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Owner Name</label>
                <input value={form.ownerName} onChange={e => updateField('ownerName', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none focus:border-emerald-500/30" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Owner Email</label>
                <input type="email" value={form.ownerEmail} onChange={e => updateField('ownerEmail', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none focus:border-emerald-500/30" placeholder="john@acme.com" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Owner Password</label>
                <input type="password" value={form.ownerPassword} onChange={e => updateField('ownerPassword', e.target.value)} className="w-full h-11 px-4 rounded-xl border border-white/[0.06] bg-[#141828] text-sm text-white outline-none focus:border-emerald-500/30" placeholder="••••••••" />
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-400 hover:text-white transition-colors">Back</button>
          ) : <div />}
          {step < 2 ? (
            <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all disabled:opacity-60">
              {submitting ? 'Creating...' : 'Create Organization'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
