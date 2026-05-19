'use client';

import { Eye, EyeOff, Loader2, X, Shield, Building2, Network, User, ArrowRight, Briefcase, Check, Copy, Key } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { ApiError, hexaTrackApi } from '@/lib/api';
import type { LightOrganization, LightBranch } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const createUserSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(320),
  fullName: z.string().min(1, 'Full name required'),
  password: z.string().min(8, 'Require 8+ chars'),
  targetRole: z.enum(['Individual', 'Owner', 'Staff', 'BranchManager', 'SuperAdmin']),
  orgId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  workspaceName: z.string().trim().min(1, 'Identity container required'),
});

type FormErrors = Partial<Record<keyof z.infer<typeof createUserSchema>, string>>;

interface SuccessData {
  id: string;
  workspaceId?: string;
  email: string;
  fullName: string;
  passwordText: string;
  role: string;
  workspaceName: string;
}

export function CreateUserModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated?: (c: any) => void }) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'Individual' | 'Owner' | 'Staff' | 'BranchManager' | 'SuperAdmin'>('Owner');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const [organizations, setOrganizations] = useState<LightOrganization[]>([]);
  const [branches, setBranches] = useState<LightBranch[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [loadingLookup, setLoadingLookup] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    setStep(1);
    setErrors({});
    setApiError(null);
    setSelectedRole('Owner');
    setSelectedOrgId('');
    setSelectedBranchId('');
    setSelectedDepartment('');
    setWorkspaceName('');
    setSuccessData(null);
    setCopiedField(null);
    
    async function fetchLookups() {
      setLoadingLookup(true);
      try {
        const [orgs, brs] = await Promise.all([
          hexaTrackApi.admin.allOrganizations(),
          hexaTrackApi.admin.allBranches(),
        ]);
        setOrganizations(orgs);
        setBranches(brs);
      } catch (e) {
        console.error("Lookups failed", e);
      } finally {
        setLoadingLookup(false);
      }
    }
    void fetchLookups();
  }, [open]);

  const filteredBranches = selectedOrgId 
    ? branches.filter(b => b.organizationId === selectedOrgId)
    : branches;

  if (!open) return null;

  const handleRoleSelect = (role: typeof selectedRole) => {
    setSelectedRole(role);
    if (role === 'Individual' || role === 'SuperAdmin') {
      setSelectedOrgId('');
      setSelectedBranchId('');
      setSelectedDepartment('');
    } else if (role === 'Owner') {
      setSelectedBranchId('');
      setSelectedDepartment('');
    }
  };

  const handleNext = () => {
    const nextErrors: FormErrors = {};
    if (!workspaceName.trim()) {
      nextErrors.workspaceName = 'Workspace name is required.';
    }
    if (selectedRole !== 'Individual' && selectedRole !== 'SuperAdmin' && !selectedOrgId) {
      nextErrors.orgId = 'Organization is required.';
    }
    if (selectedRole === 'BranchManager' && !selectedBranchId) {
      nextErrors.branchId = 'Branch is required.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setStep(2);
    }
  };
  const handleBack = () => setStep(1);

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rawData: Record<string, FormDataEntryValue | string | null> = {
      ...Object.fromEntries(fd.entries()),
      targetRole: selectedRole,
      orgId: selectedRole !== 'Individual' && selectedRole !== 'SuperAdmin' ? selectedOrgId : null,
      branchId: selectedRole === 'Staff' || selectedRole === 'BranchManager' ? selectedBranchId || null : null,
      department: selectedRole === 'Staff' || selectedRole === 'BranchManager' ? selectedDepartment || null : null,
      workspaceName,
    };
    
    // Auto-populate workspace name if empty for standalone or admin modes
    if (!rawData.workspaceName && rawData.fullName) {
      rawData.workspaceName = selectedRole === 'Individual'
        ? `${rawData.fullName} Workspace`
        : `${rawData.fullName}'s Ledger`;
    }

    const parsed = createUserSchema.safeParse(rawData);

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(i => [i.path[0], i.message])));
      return;
    }

    setSubmitting(true);
    setApiError(null);
    try {
      const role = parsed.data.targetRole;
      const isSuperAdmin = role === 'SuperAdmin';
      const organizationId = (role !== 'Individual' && role !== 'SuperAdmin') ? parsed.data.orgId || null : null;
      const branchId = (role === 'Staff' || role === 'BranchManager') ? parsed.data.branchId || null : null;
      const organizationRole = role === 'Owner' ? 'Owner' : (role === 'Staff' || role === 'BranchManager') ? 'Staff' : null;
      const department = (role === 'Staff' || role === 'BranchManager') ? parsed.data.department || null : null;

      const finalBody = {
        email: parsed.data.email,
        password: parsed.data.password,
        fullName: parsed.data.fullName,
        workspaceName: parsed.data.workspaceName,
        workspaceType: role === 'Individual' ? 'Personal' as const : 'Business' as const,
        currency: 'USD' as const,
        isSuperAdmin,
        initialWorkspaceRole: 'Owner' as const,
        ...(organizationId ? { organizationId } : {}),
        ...(branchId ? { branchId } : {}),
        ...(organizationRole ? { organizationRole } : {}),
        ...(department ? { department } : {}),
      };
      
      const created = await hexaTrackApi.admin.createUser(finalBody);
      setSuccessData({
        id: created.userId ?? created.id,
        workspaceId: created.workspaceId,
        email: created.email,
        fullName: created.displayName,
        passwordText: created.temporaryPassword ?? created.plaintextPassword ?? parsed.data.password,
        role: role,
        workspaceName: parsed.data.workspaceName,
      });
    } catch (error) {
       setApiError(error instanceof ApiError ? error.message : 'Failed to create real user identity.');
    } finally {
       setSubmitting(false);
    }
  }

  const handleSuccessClose = () => {
    onCreated?.(successData);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 backdrop-blur-md px-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-[#0E152B] border border-white/[0.06] rounded-[32px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)] relative flex flex-col max-h-[90vh]"
      >
        
        {/* Fixed Header */}
        <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-[#4F8CFF]/10 flex items-center justify-center text-[#4F8CFF]">
                {loadingLookup ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
             </div>
             <div>
               <h2 className="font-bold text-[#E1E2EC] tracking-tight text-xl">
                 {successData ? 'Operator Provisions Active' : 'Initialize Operator'}
               </h2>
               <p className="text-xs text-[#C2C6D6] font-medium mt-0.5">
                 {successData ? 'Credentials generated and persistent' : 'Generate Persistence Verified Identity'}
               </p>
             </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-white/[0.05] rounded-xl transition-colors text-[#C2C6D6]">
            <X size={20}/>
          </button>
        </div>

        {/* Animate Step Changes */}
        <AnimatePresence mode="wait">
          {successData ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6 overflow-y-auto"
            >
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#1FD18B]/10 border border-[#1FD18B]/30 flex items-center justify-center text-[#1FD18B] mb-4">
                  <Check size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#E1E2EC] tracking-tight">Deployment Complete</h3>
                <p className="text-xs text-[#8B9BB4] mt-1 max-w-sm">
                  The persistent user context is fully seeded. Copy the secure access credentials below.
                </p>
              </div>

              <div className="space-y-3.5 bg-[#080C1A] border border-white/[0.04] p-5 rounded-2xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8B9BB4] font-medium">Platform Role</span>
                  <span className="text-[#4F8CFF] font-bold px-2 py-0.5 bg-[#4F8CFF]/10 rounded border border-[#4F8CFF]/20">{successData.role.toUpperCase()}</span>
                </div>

                <div className="border-t border-white/[0.04] pt-3 flex flex-col gap-1">
                  <span className="text-[10px] text-[#8B9BB4] font-bold uppercase tracking-wider">DisplayName</span>
                  <span className="text-sm font-medium text-[#E1E2EC]">{successData.fullName}</span>
                </div>

                {successData.workspaceId && (
                  <div className="border-t border-white/[0.04] pt-3 flex flex-col gap-1">
                    <span className="text-[10px] text-[#8B9BB4] font-bold uppercase tracking-wider">Workspace</span>
                    <span className="text-sm font-medium text-[#E1E2EC]">{successData.workspaceName}</span>
                  </div>
                )}

                <div className="border-t border-white/[0.04] pt-3 flex flex-col gap-1.5 relative">
                  <span className="text-[10px] text-[#8B9BB4] font-bold uppercase tracking-wider">Email Address</span>
                  <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded-xl">
                    <span className="text-sm font-mono font-bold text-[#4F8CFF]">{successData.email}</span>
                    <button 
                      type="button" 
                      onClick={() => handleCopy(successData.email, 'email')}
                      className="p-1.5 hover:bg-white/[0.05] rounded-lg transition text-[#8B9BB4] hover:text-[#E1E2EC]"
                    >
                      {copiedField === 'email' ? <Check size={14} className="text-[#1FD18B]" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/[0.04] pt-3 flex flex-col gap-1.5 relative">
                  <span className="text-[10px] text-[#8B9BB4] font-bold uppercase tracking-wider">Secure Access Password</span>
                  <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded-xl">
                    <span className="text-sm font-mono font-bold text-[#1FD18B]">{successData.passwordText}</span>
                    <button 
                      type="button" 
                      onClick={() => handleCopy(successData.passwordText, 'password')}
                      className="p-1.5 hover:bg-white/[0.05] rounded-lg transition text-[#8B9BB4] hover:text-[#E1E2EC]"
                    >
                      {copiedField === 'password' ? <Check size={14} className="text-[#1FD18B]" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopy(`Email: ${successData.email}\nPassword: ${successData.passwordText}\nRole: ${successData.role}`, 'all')}
                  className="h-12 w-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] text-[#E1E2EC] rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check size={16} className="text-[#1FD18B]" />
                      Copied All Credentials!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy Credentials Packet
                    </>
                  )}
                </button>

                {successData.workspaceId && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/super-admin/workspaces?workspaceId=${encodeURIComponent(successData.workspaceId!)}`;
                    }}
                    className="h-12 w-full bg-[#4F8CFF]/10 border border-[#4F8CFF]/25 hover:bg-[#4F8CFF]/15 text-[#E1E2EC] rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2"
                  >
                    <ArrowRight size={16} />
                    Open Workspace
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSuccessClose}
                  className="h-12 w-full bg-[#1FD18B] hover:brightness-105 text-white rounded-2xl font-bold text-sm shadow-[0_8px_20px_rgba(31,209,139,0.25)] transition flex items-center justify-center"
                >
                  Return to User Management
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Step indicator */}
              <div className="flex px-6 pt-4 shrink-0">
                 <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-[#4F8CFF]' : 'bg-white/[0.1]'}`} />
                 <div className="w-2" />
                 <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-[#4F8CFF]' : 'bg-white/[0.1]'}`} />
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                      
                      <div>
                        <label className="text-[11px] font-bold text-[#C2C6D6] uppercase tracking-wider mb-2.5 block">1. Operational Mode Layer</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {(['Individual', 'Owner', 'Staff', 'BranchManager', 'SuperAdmin'] as const).map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleRoleSelect(r)}
                              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 text-center shrink-0 ${
                                selectedRole === r 
                                  ? 'bg-[#4F8CFF]/10 border-[#4F8CFF]/40 text-[#E1E2EC] shadow-md' 
                                  : 'bg-[#0B1015] border-white/[0.05] text-[#C2C6D6] hover:border-white/[0.15]'
                              }`}
                            >
                              <input type="radio" name="targetRole" value={r} checked={selectedRole === r} className="sr-only" readOnly />
                              {r === 'Individual' && <User size={20} className="text-[#C2C6D6]/70" />}
                              {r === 'Owner' && <Building2 size={20} className="text-emerald-400" />}
                              {r === 'Staff' && <User size={20} className="text-blue-400" />}
                              {r === 'BranchManager' && <Network size={20} className="text-purple-400" />}
                              {r === 'SuperAdmin' && <Shield size={20} className="text-pink-400" />}
                              <span className="text-xs font-bold">{r === 'BranchManager' ? 'Branch Mgr' : r}</span>
                              <span className="text-[9px] font-medium opacity-50">
                                {r === 'Individual' && 'Standalone'}
                                {r === 'Owner' && 'Org Owner'}
                                {r === 'Staff' && 'Org Staff'}
                                {r === 'BranchManager' && 'Branch lead'}
                                {r === 'SuperAdmin' && 'Full Access'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic mapping based on selected role */}
                      {selectedRole !== 'Individual' && selectedRole !== 'SuperAdmin' && (
                        <div className="space-y-3.5">
                          <label className="text-[11px] font-bold text-[#C2C6D6] uppercase tracking-wider block">2. Organizational Bounds</label>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="relative">
                               <Network className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C2C6D6]/40 h-4 w-4" />
                               <select 
                                  name="orgId" 
                                  value={selectedOrgId}
                                  required
                                  onChange={(e) => {
                                    setSelectedOrgId(e.target.value);
                                    setSelectedBranchId('');
                                  }}
                                  className="w-full h-11 pl-9 pr-8 bg-[#0B1015] border border-white/[0.05] rounded-xl text-sm font-bold text-[#E1E2EC] outline-none appearance-none cursor-pointer focus:border-[#4F8CFF]/40"
                               >
                                  <option value="">Select Organization (Required)</option>
                                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                               </select>
                            </div>
                            
                            {(selectedRole === 'Staff' || selectedRole === 'BranchManager') && (
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C2C6D6]/40 h-4 w-4" />
                                    <select 
                                      name="branchId" 
                                      value={selectedBranchId}
                                      required={selectedRole === 'BranchManager'}
                                      onChange={(e) => setSelectedBranchId(e.target.value)}
                                      className="w-full h-11 pl-9 pr-8 bg-[#0B1015] border border-white/[0.05] rounded-xl text-xs font-medium text-[#E1E2EC] outline-none appearance-none cursor-pointer focus:border-[#4F8CFF]/40"
                                    >
                                       <option value="">{selectedRole === 'BranchManager' ? 'Select Branch (Req.)' : 'Default Branch'}</option>
                                       {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                 </div>
                                 <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C2C6D6]/40 h-4 w-4" />
                                    <select name="department" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full h-11 pl-9 pr-8 bg-[#0B1015] border border-white/[0.05] rounded-xl text-xs font-medium text-[#E1E2EC] outline-none appearance-none cursor-pointer focus:border-[#4F8CFF]/40">
                                       <option value="">General Dept.</option>
                                       <option value="Finance">Finance</option>
                                       <option value="Operations">Operations</option>
                                       <option value="Executive">Executive</option>
                                       <option value="Sales">Sales</option>
                                    </select>
                                 </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[#C2C6D6] uppercase tracking-wider block">
                          3. Initial Workspace Container
                        </label>
                        <input 
                          name="workspaceName"
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          placeholder={selectedRole === 'Individual' ? 'e.g. Surag Workspace' : selectedRole === 'SuperAdmin' ? 'e.g. Master Admin Ledger' : 'e.g. Primary Income Ledger'}
                          required
                          className="w-full h-11 px-4 bg-[#0B1015] border border-white/[0.05] rounded-xl text-sm font-medium text-[#E1E2EC] outline-none focus:border-[#4F8CFF]/40"
                        />
                        {errors.workspaceName && <p className="mt-1 text-[11px] font-bold text-red-400">{errors.workspaceName}</p>}
                        {errors.orgId && <p className="mt-1 text-[11px] font-bold text-red-400">{errors.orgId}</p>}
                        {errors.branchId && <p className="mt-1 text-[11px] font-bold text-red-400">{errors.branchId}</p>}
                      </div>

                      <div className="pt-4 border-t border-white/[0.04]">
                         <button type="button" onClick={handleNext} className="w-full h-12 bg-[#4F8CFF] text-white rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                           Define Identity Credentials <ArrowRight size={16} />
                         </button>
                      </div>

                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#C2C6D6] uppercase tracking-wider">Operator Legal Name</label>
                        <input name="fullName" required placeholder="John Doe" className="w-full h-11 px-4 bg-[#0B1015] border border-white/[0.05] rounded-xl text-sm font-medium text-[#E1E2EC] outline-none focus:border-[#4F8CFF]/40" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#C2C6D6] uppercase tracking-wider">Authorization Email</label>
                        <input name="email" type="email" required placeholder="name@domain.com" className="w-full h-11 px-4 bg-[#0B1015] border border-white/[0.05] rounded-xl text-sm font-medium text-[#E1E2EC] outline-none focus:border-[#4F8CFF]/40" />
                      </div>

                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-[#C2C6D6] uppercase tracking-wider">Account Security Key</label>
                        <input 
                          name="password" 
                          type={showPassword ? "text" : "password"} 
                          required
                          minLength={8}
                          placeholder="Minimum 8 characters"
                          className="w-full h-11 px-4 bg-[#0B1015] border border-white/[0.05] rounded-xl text-sm font-medium text-[#E1E2EC] outline-none focus:border-[#4F8CFF]/40" 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[28px] text-[#C2C6D6] hover:text-white">
                          {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      </div>

                      {apiError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs font-bold text-red-400 flex gap-2 items-center">
                          <X size={14} />
                          {apiError}
                        </div>
                      )}

                      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/[0.04] text-[11px] text-[#C2C6D6] leading-relaxed">
                         System locks into secure commit. Data generated directly resolves encryption layers instantly. Account becomes operational immediately upon successful response.
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.04]">
                         <button type="button" onClick={handleBack} className="h-12 bg-white/[0.05] text-[#E1E2EC] rounded-2xl font-bold text-sm hover:bg-white/[0.08] transition-all">Go Back</button>
                         <button type="submit" disabled={submitting} className="h-12 bg-[#22C55E] text-white rounded-2xl font-bold text-sm shadow-[0_8px_20px_-5px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                           {submitting ? <Loader2 size={16} className="animate-spin"/> : 'Finalize Deployment'}
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
