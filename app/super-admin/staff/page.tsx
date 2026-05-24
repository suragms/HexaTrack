'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { hexaTrackApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminUserListItem, LightOrganization, LightBranch, AddStaffRequest } from '@/lib/types';
import { UserCog, Search, Building2, GitBranch, Plus, X, ArrowRightLeft, ChevronLeft, ChevronRight, MoreVertical, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '@/components/ui/toast';

export default function StaffPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [orgs, setOrgs] = useState<LightOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [selectedUserForReassign, setSelectedUserForReassign] = useState<AdminUserListItem | null>(null);

  const pageSize = 20;

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [u, o] = await Promise.all([
        hexaTrackApi.admin.users(search || undefined, page, pageSize, { organizationUsersOnly: true }),
        hexaTrackApi.admin.allOrganizations(),
      ]);
      setUsers(u.items);
      setTotalCount(u.totalCount);
      setOrgs(o);
    } catch {}
    setLoading(false);
  }, [accessToken, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">Management</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff</h1>
        </div>
        <div className="sm:ml-auto">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all active:scale-[0.98]">
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search staff members..." className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.06] bg-[#0E1425] text-sm text-white placeholder:text-gray-600 outline-none focus:border-emerald-500/30 transition-colors" />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0E1425] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_60px] gap-4 px-5 py-3 border-b border-white/[0.04] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          <span>Staff Member</span><span>Organization</span><span>Role</span><span>Branch</span><span>Department</span><span />
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center"><UserCog size={40} className="mx-auto text-gray-600 mb-3" /><p className="text-sm text-gray-500">No staff members found</p></div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {users.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_60px] gap-2 lg:gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.displayName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Building2 size={13} className="text-gray-600" />
                  {u.organizationName ?? '—'}
                </div>
                <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.organizationRole === 'Owner' ? 'text-amber-400 bg-amber-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                  {u.organizationRole}
                </span>
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <GitBranch size={13} className="text-gray-600" />
                  {u.branchName ?? '—'}
                </div>
                <p className="text-sm text-gray-400">{u.department ?? '—'}</p>
                
                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() => setActionUser(actionUser === u.id ? null : u.id)}
                    className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
                  >
                    <MoreVertical size={16} />
                  </button>
                  <AnimatePresence>
                    {actionUser === u.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-10 w-48 rounded-xl border border-white/[0.08] bg-[#141828] shadow-xl z-20 py-1"
                      >
                        <button
                          onClick={() => {
                            setActionUser(null);
                            setSelectedUserForReassign(u);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.04]"
                        >
                          <ArrowRightLeft size={13} /> Reassign Branch
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border border-t-0 border-white/[0.06] rounded-b-2xl bg-[#0E1425]">
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

      <AnimatePresence>
        {showCreate && <AddStaffModal orgs={orgs} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchData(); }} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUserForReassign && (
          <BranchReassignModal
            user={selectedUserForReassign}
            orgId={selectedUserForReassign.organizationId ?? ''}
            onClose={() => setSelectedUserForReassign(null)}
            onSuccess={() => {
              setSelectedUserForReassign(null);
              showToast('success', 'Branch reassigned successfully!');
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BranchReassignModal({
  user,
  orgId,
  onClose,
  onSuccess,
}: {
  user: AdminUserListItem;
  orgId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [branches, setBranches] = useState<LightBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user.branchId ?? '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) {
      setError('User does not belong to any organization.');
      setLoading(false);
      return;
    }
    hexaTrackApi.admin.allBranches(orgId)
      .then((res) => {
        setBranches(res);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message ?? 'Failed to load organization branches.');
        setLoading(false);
      });
  }, [orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await hexaTrackApi.admin.reassignStaffBranch(user.id, {
        branchId: selectedBranchId || null,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? 'Failed to reassign branch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0E1425] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-white">Reassign Staff Branch</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Move manager {user.displayName} to another localized branch ledger.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {loading ? (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[10px] text-gray-500 mt-2">Loading organizational branches...</p>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Select Destination Branch</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30 font-semibold"
                >
                  <option value="">-- No Branch Assignment (HQ) --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-[11px] text-red-400 bg-red-500/10 px-3.5 py-2 rounded-xl border border-red-500/10">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-white/[0.005]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.02] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <RefreshCw size={12} className="animate-spin" />}
              Reassign Branch
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function AddStaffModal({
  orgs,
  onClose,
  onCreated,
}: {
  orgs: LightOrganization[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [organizationId, setOrganizationId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Finance');
  const [password, setPassword] = useState('');
  const [branches, setBranches] = useState<LightBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  useEffect(() => {
    setPassword(generatePassword());
  }, []);

  useEffect(() => {
    if (!organizationId) {
      setBranches([]);
      return;
    }
    setLoadingBranches(true);
    setBranchId('');
    hexaTrackApi.admin.allBranches(organizationId)
      .then((res) => {
        setBranches(res);
      })
      .catch((err: any) => {
        console.error(err);
      })
      .finally(() => {
        setLoadingBranches(false);
      });
  }, [organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      setError('Please select an organization.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await hexaTrackApi.admin.addStaff({
        organizationId,
        branchId: branchId || undefined,
        fullName,
        email,
        department: department || undefined,
        password,
      });
      showToast('success', 'Staff member provisioned successfully!');
      onCreated();
    } catch (err: any) {
      setError(err.message ?? 'Failed to provision staff.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0E1425] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-bold text-white">Provision Staff Member</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Create a restricted staff user associated with an organization and branch.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jane.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Organization</label>
                <select
                  required
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30 font-semibold"
                >
                  <option value="">-- Select Organization --</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={!organizationId || loadingBranches}
                  className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{loadingBranches ? 'Loading branches...' : '-- HQ (No Branch) --'}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30 font-semibold"
                >
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 h-10 px-3.5 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    className="px-3 h-10 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.02]"
                    title="Generate random password"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="text-[11px] text-red-400 bg-red-500/10 px-3.5 py-2 rounded-xl border border-red-500/10">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-white/[0.005]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/[0.02] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <RefreshCw size={12} className="animate-spin" />}
              Provision Staff
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
