'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { hexaTrackApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminUserListItem, AdminCreateUserRequest, WorkspaceType, LightOrganization, LightBranch, SubscriptionPlan, UserFeatureToggleDto, OrganizationFeatureToggleDto, BranchFeatureToggleDto } from '@/lib/types';
import { Users, Plus, Search, Shield, Lock, Unlock, Trash2, X, ChevronLeft, ChevronRight, MoreVertical, Crown, Copy, Check, Sparkles, Building, Landmark, UserCheck, RefreshCw, Key, CreditCard, Flag, GitMerge, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UsersPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [actionUser, setActionUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'individual' | 'org' | 'branch'>('all');
  
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserListItem | null>(null);
  const [editSubscriptionUser, setEditSubscriptionUser] = useState<AdminUserListItem | null>(null);
  const [userFlagsUser, setUserFlagsUser] = useState<AdminUserListItem | null>(null);
  const [orgFlagsUser, setOrgFlagsUser] = useState<AdminUserListItem | null>(null);
  const [branchFlagsUser, setBranchFlagsUser] = useState<AdminUserListItem | null>(null);
  const [reassignBranchUser, setReassignBranchUser] = useState<AdminUserListItem | null>(null);

  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const filters: {
        organizationUsersOnly?: boolean;
        individualUsersOnly?: boolean;
        branchUsersOnly?: boolean;
      } = {};
      if (activeTab === 'individual') filters.individualUsersOnly = true;
      if (activeTab === 'org') filters.organizationUsersOnly = true;
      if (activeTab === 'branch') filters.branchUsersOnly = true;

      const result = await hexaTrackApi.admin.users(search || undefined, page, pageSize, filters);
      setUsers(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, page, activeTab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleLock = async (u: AdminUserListItem) => {
    try {
      await hexaTrackApi.admin.setLocked(u.id, !u.isLocked);
      setActionUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSuperAdmin = async (u: AdminUserListItem) => {
    try {
      await hexaTrackApi.admin.setSuperAdmin(u.id, !u.isSuperAdmin);
      setActionUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this user permanently? This will also remove their user data.')) return;
    try {
      await hexaTrackApi.admin.deleteUser(id);
      setActionUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
        <div>
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] mb-1">Super Admin Panel</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform User Management</h1>
          <p className="text-xs text-gray-500 mt-1">Provision and audit system accounts across Individual, Org, and Branch manager levels.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/10 active:scale-[0.98]"
        >
          <Plus size={15} /> Provision New Account
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search accounts by name, email, department or organization..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/[0.06] bg-[#0E1425] text-xs text-white placeholder:text-gray-600 outline-none focus:border-violet-500/30 transition-colors"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-white/[0.06] p-1 gap-1 bg-[#101524]/60 backdrop-blur-md rounded-xl border border-white/[0.04] max-w-lg">
        {([
          { id: 'all', label: 'All Users' },
          { id: 'individual', label: 'Individuals' },
          { id: 'org', label: 'Org Users' },
          { id: 'branch', label: 'Branch Users' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-600/20'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0E1425] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1.2fr_1fr_1fr_60px] gap-4 px-5 py-3.5 border-b border-white/[0.04] text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white/[0.01]">
          <span>User Identity</span>
          <span>Organization Context</span>
          <span>Tenant Scopes</span>
          <span>SaaS Tier</span>
          <span>System Status</span>
          <span />
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[11px] text-gray-500 mt-3">Fetching platform tenants...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-xs text-gray-500">No matching accounts found in records.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {users.map((u, i) => {
              // Deduce badges based on membership
              const isOrg = !!u.organizationName;
              const isBranch = !!u.branchName;

              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className="relative grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1.2fr_1fr_1fr_60px] gap-2 lg:gap-4 items-center px-5 py-3.5 hover:bg-white/[0.015] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-white/10 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                      {u.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">{u.displayName}</p>
                        {u.isSuperAdmin && <Crown size={11} className="text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  <div>
                    {isOrg ? (
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-300 truncate flex items-center gap-1">
                          <Building size={11} className="text-violet-400" />
                          {u.organizationName}
                        </p>
                        {u.department && <p className="text-[9px] text-gray-500 truncate mt-0.5">{u.department}</p>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600 italic">No org assignment</span>
                    )}
                  </div>

                  <div>
                    {isBranch ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10">
                        <Landmark size={9} />
                        {u.branchName}
                      </span>
                    ) : isOrg ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10">
                        <Building size={9} />
                        {u.organizationRole === 'Owner' ? 'Org Owner' : 'Org Staff'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-500/10">
                        <UserCheck size={9} />
                        Individual
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-gray-400">{u.subscriptionPlan ?? 'Free Plan'}</span>
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${u.isLocked ? 'text-red-400' : 'text-emerald-400'}`}>
                      <span className={`w-1 h-1 rounded-full ${u.isLocked ? 'bg-red-400' : 'bg-emerald-400'}`} />
                      {u.isLocked ? 'Locked' : 'Active'}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setActionUser(actionUser === u.id ? null : u.id)}
                      className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center text-gray-500"
                    >
                      <MoreVertical size={14} />
                    </button>
                    <AnimatePresence>
                      {actionUser === u.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActionUser(null)} />
                            <div className="absolute right-0 top-8 w-48 rounded-xl border border-white/[0.08] bg-[#141828] shadow-2xl z-20 py-1.5 max-h-[320px] overflow-y-auto">
                              <button
                                onClick={() => handleToggleLock(u)}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                              >
                                {u.isLocked ? <><Unlock size={12} /> Unlock Account</> : <><Lock size={12} /> Lock Account</>}
                              </button>
                              <button
                                onClick={() => handleToggleSuperAdmin(u)}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-amber-400 hover:bg-white/[0.04]"
                              >
                                <Shield size={12} /> {u.isSuperAdmin ? 'Demote Super' : 'Promote Super'}
                              </button>
                              <button
                                onClick={() => {
                                  setResetPasswordUser(u);
                                  setActionUser(null);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                              >
                                <Key size={12} className="text-violet-400" /> Reset Password
                              </button>
                              <button
                                onClick={() => {
                                  setEditSubscriptionUser(u);
                                  setActionUser(null);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                              >
                                <CreditCard size={12} className="text-violet-400" /> Edit Subscription
                              </button>
                              <button
                                onClick={() => {
                                  setUserFlagsUser(u);
                                  setActionUser(null);
                                }}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                              >
                                <Flag size={12} className="text-violet-400" /> User Flags
                              </button>
                              {u.organizationId && (
                                <button
                                  onClick={() => {
                                    setOrgFlagsUser(u);
                                    setActionUser(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                                >
                                  <Building size={12} className="text-violet-400" /> Org Flags
                                </button>
                              )}
                              {u.branchId && (
                                <button
                                  onClick={() => {
                                    setBranchFlagsUser(u);
                                    setActionUser(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                                >
                                  <Landmark size={12} className="text-violet-400" /> Branch Flags
                                </button>
                              )}
                              {u.organizationId && u.organizationRole?.toLowerCase() === 'staff' && (
                                <button
                                  onClick={() => {
                                    setReassignBranchUser(u);
                                    setActionUser(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                                >
                                  <GitMerge size={12} className="text-violet-400" /> Reassign Branch
                                </button>
                              )}
                              <div className="border-t border-white/[0.04] my-1" />
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-red-400 hover:bg-white/[0.04]"
                              >
                                <Trash2 size={12} /> Delete Tenant
                              </button>
                            </div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04] bg-white/[0.005]">
            <p className="text-[10px] text-gray-500 font-semibold">{totalCount} accounts listed</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center text-gray-500 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] text-gray-400 px-2 font-semibold">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center text-gray-500 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

       <AnimatePresence>
        {showCreate && (
          <CreateUserModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              fetchUsers();
            }}
          />
        )}
        {resetPasswordUser && (
          <ResetPasswordModal
            user={resetPasswordUser}
            onClose={() => setResetPasswordUser(null)}
            onSuccess={() => {
              setResetPasswordUser(null);
              fetchUsers();
            }}
          />
        )}
        {editSubscriptionUser && (
          <EditSubscriptionModal
            user={editSubscriptionUser}
            onClose={() => setEditSubscriptionUser(null)}
            onSuccess={() => {
              setEditSubscriptionUser(null);
              fetchUsers();
            }}
          />
        )}
        {userFlagsUser && (
          <UserFeatureFlagsModal
            user={userFlagsUser}
            onClose={() => setUserFlagsUser(null)}
            onSuccess={() => {
              setUserFlagsUser(null);
              fetchUsers();
            }}
          />
        )}
        {orgFlagsUser && orgFlagsUser.organizationId && (
          <OrganizationFeatureFlagsModal
            user={orgFlagsUser}
            orgId={orgFlagsUser.organizationId}
            onClose={() => setOrgFlagsUser(null)}
            onSuccess={() => {
              setOrgFlagsUser(null);
              fetchUsers();
            }}
          />
        )}
        {branchFlagsUser && branchFlagsUser.branchId && (
          <BranchFeatureFlagsModal
            user={branchFlagsUser}
            branchId={branchFlagsUser.branchId}
            onClose={() => setBranchFlagsUser(null)}
            onSuccess={() => {
              setBranchFlagsUser(null);
              fetchUsers();
            }}
          />
        )}
        {reassignBranchUser && reassignBranchUser.organizationId && (
          <BranchReassignModal
            user={reassignBranchUser}
            orgId={reassignBranchUser.organizationId}
            onClose={() => setReassignBranchUser(null)}
            onSuccess={() => {
              setReassignBranchUser(null);
              fetchUsers();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Form selections
  const [userMode, setUserMode] = useState<'Individual' | 'Organization' | 'BranchManager'>('Individual');
  const [organizations, setOrganizations] = useState<LightOrganization[]>([]);
  const [branches, setBranches] = useState<LightBranch[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [form, setForm] = useState<AdminCreateUserRequest>({
    email: '',
    password: '',
    fullName: '',
    workspaceName: '',
    workspaceType: 'Personal',
    currency: 'USD',
    isSuperAdmin: false,
    organizationId: null,
    branchId: null,
    organizationRole: null,
    department: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return generated;
  };

  const regeneratePassword = () => {
    setForm((f) => ({ ...f, password: generateRandomPassword() }));
  };

  // Auto generate password
  useEffect(() => {
    setForm((f) => ({ ...f, password: generateRandomPassword() }));
  }, []);

  // Fetch Orgs & Branches
  useEffect(() => {
    if (userMode !== 'Individual') {
      hexaTrackApi.admin.allOrganizations()
        .then(setOrganizations)
        .catch(console.error);
    }
  }, [userMode]);

  useEffect(() => {
    if (selectedOrgId) {
      hexaTrackApi.admin.allBranches(selectedOrgId)
        .then(setBranches)
        .catch(console.error);
    } else {
      setBranches([]);
    }
  }, [selectedOrgId]);

  // Adjust defaults on UserMode change
  const handleModeChange = (mode: 'Individual' | 'Organization' | 'BranchManager') => {
    setUserMode(mode);
    setSelectedOrgId('');
    setSelectedBranchId('');
    setForm((f) => ({
      ...f,
      workspaceName: mode === 'Individual' ? 'My Ledger' : mode === 'Organization' ? 'HQ Workspace' : 'Branch Ledger',
      workspaceType: mode === 'Individual' ? 'Personal' : 'Business',
      organizationRole: mode === 'Organization' ? 'Owner' : mode === 'BranchManager' ? 'Staff' : null,
    }));
  };

  const handleCopyEmail = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(createdCredentials.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(createdCredentials.pass);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCopyAll = () => {
    if (!createdCredentials) return;
    const txt = `HexaTrack Account Details\n-------------------------\nDisplay Name: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...form,
        workspaceName: form.workspaceName || 'My Finance Ledger',
        organizationId: selectedOrgId || null,
        branchId: selectedBranchId || null,
      };

      const result = await hexaTrackApi.admin.createUser(payload);

      setCreatedCredentials({
        name: result.displayName,
        email: result.email,
        pass: result.plaintextPassword || form.password,
      });
      setStep('success');
    } catch (e: any) {
      setError(e.message ?? 'Platform failed to provision account.');
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
        className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0E1425] shadow-2xl overflow-hidden"
      >
        {step === 'form' ? (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white">Provision Account</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">Provision an isolated individual or enterprise tenant.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[500px] overflow-y-auto">
              {/* Account Level Selector */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Account Scoping</label>
                <div className="grid grid-cols-3 gap-2 bg-white/[0.02] p-1 rounded-xl border border-white/[0.04]">
                  {(['Individual', 'Organization', 'BranchManager'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleModeChange(m)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                        userMode === m ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {m === 'BranchManager' ? 'Branch Mgr' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Organization Fields */}
              {userMode !== 'Individual' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Select Organization</label>
                      <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                      >
                        <option value="">-- Choose Org --</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                        {userMode === 'BranchManager' ? 'Select Branch' : 'Organization Role'}
                      </label>
                      {userMode === 'BranchManager' ? (
                        <select
                          value={selectedBranchId}
                          onChange={(e) => setSelectedBranchId(e.target.value)}
                          required
                          className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                        >
                          <option value="">-- Choose Branch --</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={form.organizationRole || 'Owner'}
                          onChange={(e) => setForm((f) => ({ ...f, organizationRole: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                        >
                          <option value="Owner">Owner (Primary)</option>
                          <option value="Staff">Staff (Operations)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Department (Optional)</label>
                    <input
                      value={form.department || ''}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                      placeholder="e.g., Accounts, Treasury"
                    />
                  </div>
                </motion.div>
              )}

              {/* Core Credentials */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Full Name</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                    className="w-full h-10 px-3.5 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    className="w-full h-10 px-3.5 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              {/* Password Controls */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      required
                      className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={regeneratePassword}
                    className="px-3 h-10 rounded-xl border border-white/10 hover:bg-white/[0.04] text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-all flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Initial Workspace Name</label>
                  <input
                    value={form.workspaceName}
                    onChange={(e) => setForm((f) => ({ ...f, workspaceName: e.target.value }))}
                    className="w-full h-10 px-3.5 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                    placeholder={userMode === 'Individual' ? 'My Ledger' : 'Business HQ'}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Base Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e: any) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30 font-semibold"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Security & Access</label>
                <div className="flex items-center gap-3 px-1 py-1">
                  <input
                    type="checkbox"
                    checked={form.isSuperAdmin}
                    onChange={(e) => setForm((f) => ({ ...f, isSuperAdmin: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/10 bg-[#141828] text-violet-500 focus:ring-violet-500/20 focus:ring-offset-0"
                    id="sa-check-mod"
                  />
                  <label htmlFor="sa-check-mod" className="text-xs text-gray-300 font-semibold cursor-pointer select-none">
                    Grant global Super Administrator role
                  </label>
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
                {submitting ? 'Provisioning...' : 'Provision Tenant'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold shadow-lg shadow-emerald-500/5">
              <Sparkles size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Tenant Provisioned!</h2>
              <p className="text-xs text-gray-500 mt-1">Copy the one-time generated secure credentials before closing.</p>
            </div>

            <div className="bg-[#141828] border border-white/[0.06] rounded-2xl p-4 text-left space-y-3 max-w-sm mx-auto">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Display Name</p>
                <p className="text-xs font-semibold text-white">{createdCredentials?.name}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email / Login ID</p>
                <p className="text-xs font-semibold text-white">{createdCredentials?.email}</p>
              </div>
              <div className="relative">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">One-Time Password</p>
                <p className="text-xs font-bold text-amber-400 font-mono tracking-wide">{createdCredentials?.pass}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto pt-2">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="py-2.5 px-3 rounded-xl border border-white/10 hover:bg-white/[0.02] text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                {copiedEmail ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedEmail ? 'Email Copied' : 'Copy Email'}
              </button>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="py-2.5 px-3 rounded-xl border border-white/10 hover:bg-white/[0.02] text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                {copiedPassword ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedPassword ? 'Pass Copied' : 'Copy Password'}
              </button>
              <button
                type="button"
                onClick={handleCopyAll}
                className="col-span-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'All Credentials Copied!' : 'Copy All Details'}
              </button>
              <button
                type="button"
                onClick={onCreated}
                className="col-span-2 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.02] text-xs font-bold text-gray-400 hover:text-white transition-all"
              >
                Done & Return
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return generated;
  };

  useEffect(() => {
    setPassword(generateRandomPassword());
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password cannot be empty');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await hexaTrackApi.admin.resetPassword(user.id, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h2 className="text-base font-bold text-white">Reset Password</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Generate a secure new credential for {user.displayName}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        {!success ? (
          <form onSubmit={handleReset}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">New Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-white/[0.06] bg-[#141828] text-xs text-white outline-none focus:border-violet-500/30"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPassword(generateRandomPassword())}
                    className="px-3 h-10 rounded-xl border border-white/10 hover:bg-white/[0.04] text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-all flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw size={12} /> Regenerate
                  </button>
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
                {submitting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
              <Check size={20} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-white">Password Updated Successfully</h2>
              <p className="text-xs text-gray-500 mt-1">Copy the new password details below.</p>
            </div>

            <div className="bg-[#141828] border border-white/[0.06] rounded-2xl p-4 text-left max-w-sm mx-auto">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">New Password</p>
              <p className="text-xs font-bold text-amber-400 font-mono tracking-wide">{password}</p>
            </div>

            <div className="flex flex-col gap-2.5 max-w-xs mx-auto pt-2">
              <button
                onClick={handleCopy}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copied Password!' : 'Copy Password'}
              </button>
              <button
                onClick={onSuccess}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.02] text-xs font-bold text-gray-400 hover:text-white transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function EditSubscriptionModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(user.subscriptionPlan ?? 'Free');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const plans: SubscriptionPlan[] = ['Free', 'Basic', 'Pro', 'ProMax'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await hexaTrackApi.admin.setSubscription(user.id, selectedPlan);
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? 'Failed to update subscription tier.');
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
            <h2 className="text-base font-bold text-white">Adjust Subscription Tier</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Modify SaaS permissions and limits for {user.displayName}.</p>
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
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Available Tiers</label>
              <div className="grid grid-cols-2 gap-3">
                {plans.map((p) => {
                  let planDesc = 'Free usage tier';
                  if (p === 'Basic') planDesc = 'Standard single workspace';
                  if (p === 'Pro') planDesc = 'Multi-workspace capability';
                  if (p === 'ProMax') planDesc = 'Enterprise capabilities';

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPlan(p)}
                      className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                        selectedPlan === p
                          ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-600/5'
                          : 'border-white/[0.06] bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-bold ${selectedPlan === p ? 'text-white' : 'text-gray-300'}`}>{p}</p>
                        <p className="text-[9px] text-gray-500 mt-1 leading-normal">{planDesc}</p>
                      </div>
                      {selectedPlan === p && (
                        <div className="absolute right-2 bottom-2 bg-violet-600 text-white rounded-full p-0.5">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
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
              Update Tier
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function UserFeatureFlagsModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [flags, setFlags] = useState<UserFeatureToggleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchFlags = useCallback(async () => {
    try {
      const result = await hexaTrackApi.admin.userFeatureFlags(user.id);
      setFlags(result);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load user feature flags.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setUpdatingFlag(key);
    setError('');
    try {
      await hexaTrackApi.admin.setUserFeatureFlag(user.id, key, !currentValue);
      await fetchFlags();
    } catch (err: any) {
      setError(err.message ?? 'Failed to toggle feature flag.');
    } finally {
      setUpdatingFlag(null);
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
            <h2 className="text-base font-bold text-white">User Feature Overrides</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Toggle specific feature overrides for user {user.displayName}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] text-gray-500 mt-2">Loading feature toggles...</p>
            </div>
          ) : flags.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No feature flags registered in the system database.
            </div>
          ) : (
            <div className="space-y-2">
              {flags.map((f) => (
                <div
                  key={f.featureKey}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01]"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{f.featureKey}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Last updated: {new Date(f.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    disabled={updatingFlag === f.featureKey}
                    onClick={() => handleToggle(f.featureKey, f.isEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                      f.isEnabled ? 'bg-violet-600' : 'bg-gray-800'
                    } ${updatingFlag === f.featureKey ? 'opacity-50' : ''}`}
                  >
                    <motion.div
                      layout
                      className="w-4 h-4 rounded-full bg-white shadow-md"
                      animate={{ x: f.isEnabled ? 16 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-[11px] text-red-400 bg-red-500/10 px-3.5 py-2 rounded-xl border border-red-500/10">{error}</p>}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-white/[0.06] bg-white/[0.005]">
          <button
            type="button"
            onClick={onSuccess}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OrganizationFeatureFlagsModal({
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
  const [flags, setFlags] = useState<OrganizationFeatureToggleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchFlags = useCallback(async () => {
    try {
      const result = await hexaTrackApi.admin.orgFeatureFlags(orgId);
      setFlags(result);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load organization feature flags.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setUpdatingFlag(key);
    setError('');
    try {
      await hexaTrackApi.admin.setOrgFeatureFlag(orgId, key, !currentValue);
      await fetchFlags();
    } catch (err: any) {
      setError(err.message ?? 'Failed to toggle feature flag.');
    } finally {
      setUpdatingFlag(null);
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
            <h2 className="text-base font-bold text-white">Org Feature Overrides</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Toggle overrides for organization: {user.organizationName || 'Current Org'}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] text-gray-500 mt-2">Loading feature toggles...</p>
            </div>
          ) : flags.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No organization feature flags registered in the system database.
            </div>
          ) : (
            <div className="space-y-2">
              {flags.map((f) => (
                <div
                  key={f.featureKey}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01]"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{f.featureKey}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Last updated: {new Date(f.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    disabled={updatingFlag === f.featureKey}
                    onClick={() => handleToggle(f.featureKey, f.isEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                      f.isEnabled ? 'bg-violet-600' : 'bg-gray-800'
                    } ${updatingFlag === f.featureKey ? 'opacity-50' : ''}`}
                  >
                    <motion.div
                      layout
                      className="w-4 h-4 rounded-full bg-white shadow-md"
                      animate={{ x: f.isEnabled ? 16 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-[11px] text-red-400 bg-red-500/10 px-3.5 py-2 rounded-xl border border-red-500/10">{error}</p>}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-white/[0.06] bg-white/[0.005]">
          <button
            type="button"
            onClick={onSuccess}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BranchFeatureFlagsModal({
  user,
  branchId,
  onClose,
  onSuccess,
}: {
  user: AdminUserListItem;
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [flags, setFlags] = useState<BranchFeatureToggleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchFlags = useCallback(async () => {
    try {
      const result = await hexaTrackApi.admin.branchFeatureFlags(branchId);
      setFlags(result);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load branch feature flags.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (key: string, currentValue: boolean) => {
    setUpdatingFlag(key);
    setError('');
    try {
      await hexaTrackApi.admin.setBranchFeatureFlag(branchId, key, !currentValue);
      await fetchFlags();
    } catch (err: any) {
      setError(err.message ?? 'Failed to toggle feature flag.');
    } finally {
      setUpdatingFlag(null);
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
            <h2 className="text-base font-bold text-white">Branch Feature Overrides</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Toggle overrides for branch: {user.branchName || 'Current Branch'}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] text-gray-500 mt-2">Loading feature toggles...</p>
            </div>
          ) : flags.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No branch feature flags registered in the system database.
            </div>
          ) : (
            <div className="space-y-2">
              {flags.map((f) => (
                <div
                  key={f.featureKey}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01]"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{f.featureKey}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Last updated: {new Date(f.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    disabled={updatingFlag === f.featureKey}
                    onClick={() => handleToggle(f.featureKey, f.isEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                      f.isEnabled ? 'bg-violet-600' : 'bg-gray-800'
                    } ${updatingFlag === f.featureKey ? 'opacity-50' : ''}`}
                  >
                    <motion.div
                      layout
                      className="w-4 h-4 rounded-full bg-white shadow-md"
                      animate={{ x: f.isEnabled ? 16 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-[11px] text-red-400 bg-red-500/10 px-3.5 py-2 rounded-xl border border-red-500/10">{error}</p>}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-white/[0.06] bg-white/[0.005]">
          <button
            type="button"
            onClick={onSuccess}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
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
