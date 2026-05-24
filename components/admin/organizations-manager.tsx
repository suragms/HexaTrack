'use client';

import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  GitBranch,
  Users,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Activity,
  Globe,
  CreditCard,
  Zap,
  Trash2,
  Edit,
  ArrowUpRight,
  X,
  CheckCircle2,
  Smartphone,
  Clock,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hexaTrackApi } from '@/lib/api';
import { 
  OrganizationListItem, 
  AdminOrganizationAnalytics,
  OrgPlan,
  LightBranch,
} from '@/lib/types';

export default function OrganizationsManager() {
  const [activeModal, setActiveModal] = useState<'org' | 'branch' | 'owner' | 'staff' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFabOpen, setIsFabOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrganizationListItem[]>([]);
  const [analytics, setAnalytics] = useState<AdminOrganizationAnalytics | null>(null);
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
         hexaTrackApi.admin.organizations(searchQuery, page, 20),
         hexaTrackApi.admin.organizationAnalytics()
      ]);
      setOrgs(listRes.items);
      setAnalytics(statsRes);
    } catch (e) {
      console.error('Failed to load real organization data:', e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
     void loadData();
  }, [loadData]);

  const stats = [
    { label: 'Total Organizations', value: analytics?.totalOrganizations.toString() ?? '0', icon: Building2, trend: 'Realtime', color: 'text-blue-400' },
    { label: 'Active Owners', value: analytics?.totalOwners.toString() ?? '0', icon: ShieldCheck, trend: 'Realtime', color: 'text-emerald-400' },
    { label: 'Total Staff', value: analytics?.totalStaff.toLocaleString() ?? '0', icon: Users, trend: 'Realtime', color: 'text-violet-400' },
    { label: 'Active Branches', value: analytics?.activeBranches.toString() ?? '0', icon: GitBranch, trend: 'Realtime', color: 'text-amber-400' },
    { label: 'Monthly Revenue', value: `$${analytics?.totalMrr.toLocaleString() ?? '0'}`, icon: TrendingUp, trend: 'Est', color: 'text-green-400' },
    { label: 'Operational Nodes', value: ((analytics?.totalOrganizations || 0) + (analytics?.activeBranches || 0)).toString(), icon: Activity, trend: 'Active', color: 'text-pink-400' },
  ];

  return (
    <div className="min-h-full relative pb-20 md:pb-0">
      {/* Sticky Desktop Header */}
      <div className="sticky top-0 z-30 bg-[#0B1015]/90 backdrop-blur-md border-b border-white/[0.04] px-6 py-3 flex items-center justify-between hidden md:flex">
        <div className="flex items-center gap-2 text-xs font-medium text-[#8B9BB4]">
          {loading ? <Loader2 size={14} className="animate-spin text-[#4F8CFF]" /> : <ShieldCheck size={14} className="text-[#4F8CFF]" />}
          <span>{loading ? 'Syncing Data Core...' : 'Operational Core Enabled'}</span>
        </div>
        
        <QuickAdminActions onAction={(type) => setActiveModal(type as any)} />
      </div>

      <main className="p-6 space-y-6">
        {/* Page Title Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
           <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                 Organizations Center
                 <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">Database Active</span>
              </h1>
              <p className="text-[#8B9BB4] text-sm mt-1">Monitor structure, scale instances, and manage entity hierarchy globally.</p>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
                 <input 
                   type="text" 
                   placeholder="Search database..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && loadData()}
                   className="w-full h-10 pl-10 pr-4 bg-[#121A22] border border-white/[0.06] rounded-xl text-sm outline-none focus:border-[#4F8CFF]/50 transition-all"
                 />
              </div>
              <button type="button" onClick={() => loadData()} className="h-10 w-10 flex items-center justify-center bg-[#121A22] border border-white/[0.06] rounded-xl hover:bg-white/5 transition-colors">
                 <Filter size={16} className="text-[#8B9BB4]"/>
              </button>
           </div>
        </div>

        {/* Admin Analytics Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((s, idx) => (
            <div key={idx} className="bg-[#121A22] border border-white/[0.05] p-4 rounded-2xl relative overflow-hidden group hover:border-white/[0.1] transition-all">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <s.icon size={48} className={s.color} />
               </div>
               <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wider text-[#8B9BB4] mb-1">
                  <s.icon size={14} className={s.color} />
                  {s.label}
               </div>
               <div className="text-2xl font-bold text-white tracking-tight">{s.value}</div>
               <div className="text-[10px] font-bold text-[#8B9BB4]/80 flex items-center gap-0.5 mt-1">
                  <Activity size={10} className="text-[#4F8CFF]"/> {s.trend}
               </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Middle Column - Main Operations Table */}
          <div className="xl:col-span-3 space-y-6">
             <div className="bg-[#121A22] border border-white/[0.05] rounded-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
                   <div>
                      <h3 className="font-bold text-white tracking-tight">Corporate Registry</h3>
                      <p className="text-xs text-[#8B9BB4] mt-0.5">
                        {loading ? 'Loading registry records...' : `Displaying ${orgs.length} actual persistence objects`}
                      </p>
                   </div>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => loadData()} className="px-3 py-1.5 text-[11px] font-bold bg-white/[0.04] border border-white/[0.05] rounded-lg hover:bg-white/[0.08] transition-colors">REFRESH</button>
                   </div>
                </div>
                
                {loading && orgs.length === 0 ? (
                   <div className="py-20 flex flex-col items-center justify-center text-[#8B9BB4] gap-2">
                      <Loader2 className="animate-spin text-[#4F8CFF]" />
                      <span className="text-xs font-medium">Reading database stream...</span>
                   </div>
                ) : orgs.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                     <div className="w-20 h-20 bg-[#4F8CFF]/5 rounded-3xl flex items-center justify-center border border-[#4F8CFF]/20 mb-4">
                        <Building2 size={32} className="text-[#4F8CFF]" />
                     </div>
                     <h4 className="font-bold text-white text-lg">Registry is empty</h4>
                     <p className="text-sm text-[#8B9BB4] max-w-xs mt-1">No database records exist yet. Initiate the first organization node below.</p>
                     <button 
                       onClick={() => setActiveModal('org')}
                       className="mt-6 px-6 py-2.5 bg-[#4F8CFF] text-white font-bold text-sm rounded-xl shadow-[0_8px_20px_-5px_rgba(79,140,255,0.4)] hover:translate-y-[-2px] transition-all active:translate-y-0 flex items-center gap-2"
                     >
                        <Plus size={16} /> Start Initialization
                     </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="text-[11px] font-bold uppercase tracking-wider text-[#8B9BB4] bg-white/[0.02]">
                           <tr>
                              <th className="px-6 py-4">Organization</th>
                              <th className="px-6 py-4">Structure</th>
                              <th className="px-6 py-4">Staff Count</th>
                              <th className="px-6 py-4">Active Plan</th>
                              <th className="px-6 py-4">Est. Revenue</th>
                              <th className="px-6 py-4">Lifecycle</th>
                              <th className="px-6 py-4 text-right">Control</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                           {orgs.map(org => (
                             <tr key={org.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-primary flex items-center justify-center text-white font-bold shadow-inner shadow-white/20">
                                         {org.name.charAt(0)}
                                      </div>
                                      <div>
                                         <div className="font-bold text-white group-hover:text-[#4F8CFF] transition-colors">{org.name}</div>
                                         <div className="text-xs text-[#8B9BB4]">/org/{org.slug || 'pending'}</div>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                                         <GitBranch size={12} className="text-[#8B9BB4]" /> {org.branchCount} Branches
                                      </div>
                                      <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                                         <ShieldCheck size={12} className="text-[#8B9BB4]" /> {org.ownerCount} Owners
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-white font-medium">
                                   {org.staffCount.toLocaleString()} staff
                                </td>
                                <td className="px-6 py-4">
                                   <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                                      org.plan.toLowerCase().includes('enterprise') ? 'bg-primary/10 border-primary/30 text-primary' : 
                                      org.plan.toLowerCase().includes('pro') ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                      'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                   }`}>
                                      {org.plan.toUpperCase()}
                                   </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-white">
                                   ${org.estimatedMrr.toLocaleString()} <span className="text-[10px] font-medium text-[#8B9BB4]">/mo</span>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                                      <span className={`text-xs font-bold ${org.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                                         {org.status}
                                      </span>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Link href={`/admin/organizations/${org.id}`} className="h-8 px-3 flex items-center gap-1.5 bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 rounded-lg text-xs font-bold text-[#4F8CFF] hover:bg-[#4F8CFF] hover:text-white transition-all">
                                         Manage <ArrowUpRight size={12}/>
                                      </Link>
                                      <button type="button" className="p-2 hover:bg-white/10 rounded-lg text-[#8B9BB4] hover:text-white"><MoreHorizontal size={14}/></button>
                                   </div>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                )}
             </div>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-1 space-y-6">
              <SubscriptionUsageCard analytics={analytics} onRefresh={loadData} />
              <FeatureTogglePanel />
          </div>
        </div>
      </main>

      {/* Mobile FAB menu */}
      <div className="fixed bottom-20 right-4 z-[9999] md:hidden flex flex-col items-end gap-3">
         <AnimatePresence>
           {isFabOpen && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 10 }} 
               className="flex flex-col items-end gap-3 mb-1"
             >
                {[
                  { label: 'Add Staff', type: 'staff', icon: Users },
                  { label: 'Add Owner', type: 'owner', icon: ShieldCheck },
                  { label: 'Create Branch', type: 'branch', icon: GitBranch },
                  { label: 'Create Org', type: 'org', icon: Building2 },
                ].map((act) => (
                  <button 
                    key={act.type}
                    type="button"
                    onClick={() => { setActiveModal(act.type as any); setIsFabOpen(false); }}
                    className="flex items-center gap-2 bg-[#1A232E] border border-white/[0.1] text-white shadow-2xl px-4 py-2 rounded-xl font-bold text-xs hover:scale-105 transition-transform active:scale-95"
                  >
                    {act.label}
                    <act.icon size={14} />
                  </button>
                ))}
             </motion.div>
           )}
         </AnimatePresence>
         <button 
           onClick={() => setIsFabOpen(!isFabOpen)} 
           type="button"
           className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_12px_24px_-4px_rgba(79,140,255,0.5)] text-white transition-all duration-300 ${
             isFabOpen ? 'bg-red-500 rotate-45' : 'bg-[#4F8CFF]'
           }`}
         >
            <Plus size={24} />
         </button>
      </div>

      {/* Modals - Re-loading triggers automated reload on commit */}
      <AnimatePresence>
         {activeModal === 'org' && <CreateOrganizationModal onClose={() => setActiveModal(null)} onComplete={loadData} />}
         {activeModal === 'branch' && <CreateBranchModal onClose={() => setActiveModal(null)} onComplete={loadData} organizations={orgs} />}
         {activeModal === 'owner' && <AddOwnerModal onClose={() => setActiveModal(null)} onComplete={loadData} organizations={orgs} />}
         {activeModal === 'staff' && <AddStaffModal onClose={() => setActiveModal(null)} onComplete={loadData} organizations={orgs} />}
      </AnimatePresence>
    </div>
  );
}

function QuickAdminActions({ onAction }: { onAction: (id: string) => void }) {
  const items = [
    { id: 'org', label: 'Create Organization', icon: Building2 },
    { id: 'branch', label: 'Create Branch', icon: GitBranch },
    { id: 'owner', label: 'Add Owner', icon: ShieldCheck },
    { id: 'staff', label: 'Add Staff', icon: Users },
  ];

  return (
    <div className="flex items-center gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onAction(it.id)}
          className="h-9 px-3.5 flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-xs font-bold text-white hover:bg-white/[0.08] transition-all"
        >
          <it.icon size={13} className="text-[#8B9BB4]" />
          {it.label}
        </button>
      ))}
    </div>
  );
}

function SubscriptionUsageCard({ analytics, onRefresh }: { analytics: AdminOrganizationAnalytics | null; onRefresh: () => void }) {
  return (
    <div className="bg-gradient-to-br from-[#1A232E] to-[#121A22] border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500 opacity-10 blur-3xl rounded-full" />
      
      <div className="flex items-center gap-2 mb-4">
         <CreditCard size={16} className="text-[#4F8CFF]" />
         <h3 className="font-bold text-white text-sm">Node Utilization Gauge</h3>
      </div>

      <div className="space-y-4">
         <ProgressBar label="Owners Active" cur={analytics?.totalOwners || 0} max={100} color="bg-blue-500" />
         <ProgressBar label="Scale Limit (Branches)" cur={analytics?.activeBranches || 0} max={200} color="bg-primary" />
         <ProgressBar label="Scale Limit (Staff)" cur={analytics?.totalStaff || 0} max={5000} color="bg-emerald-500" />
      </div>

      <button type="button" onClick={onRefresh} className="w-full mt-5 h-10 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2">
         Refresh Telemetry
      </button>
    </div>
  );
}

function ProgressBar({ label, cur, max, suffix, color }: { label: string; cur: number; max: number; suffix?: string; color: string }) {
  const pct = Math.min(100, (cur / max) * 100);
  return (
    <div>
       <div className="flex justify-between text-[10px] font-bold mb-1.5">
          <span className="text-[#8B9BB4] uppercase">{label}</span>
          <span className="text-white">{cur}{suffix ?? ''} / {max}{suffix ?? ''}</span>
       </div>
       <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
       </div>
    </div>
  );
}

function FeatureTogglePanel() {
  return (
    <div className="bg-[#121A22] border border-white/[0.05] rounded-2xl p-5">
       <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-amber-400" />
          <h3 className="font-bold text-white text-sm">Gate Override</h3>
       </div>
       <p className="text-xs text-[#8B9BB4] font-medium">System gates are currently managed via standard Feature Flag overrides controller.</p>
    </div>
  );
}

export function ModalWrapper({ title, desc, onClose, children }: { title: string; desc: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
       <motion.div 
         initial={{ scale: 0.95, opacity: 0 }} 
         animate={{ scale: 1, opacity: 1 }} 
         exit={{ scale: 0.95, opacity: 0 }}
         className="w-full max-w-md bg-[#121A22] border border-white/[0.08] rounded-[24px] shadow-2xl overflow-hidden"
       >
          <div className="p-6 border-b border-white/[0.05] flex justify-between items-center">
             <div>
                <h3 className="font-bold text-xl text-white tracking-tight">{title}</h3>
                <p className="text-xs text-[#8B9BB4] mt-0.5 font-medium">{desc}</p>
             </div>
             <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/[0.05] rounded-full text-[#8B9BB4] hover:text-white hover:bg-white/[0.1] transition-all">
                <X size={16} />
             </button>
          </div>
          <div className="p-6">
             {children}
          </div>
       </motion.div>
    </div>
  );
}

function CreateOrganizationModal({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    currency: 'USD',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    plan: 'Enterprise' as OrgPlan,
    maxBranches: '10',
    maxStaff: '50'
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hexaTrackApi.admin.createOrganization({
        ...formData,
        maxBranches: parseInt(formData.maxBranches),
        maxStaff: parseInt(formData.maxStaff),
      });
      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="New Organization" desc="Provision fully-featured corporate container" onClose={onClose}>
       <form className="space-y-4" onSubmit={onSubmit}>
          <FormInput label="Organization Legal Name" required value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Acme Corp Global" />
          <div className="grid grid-cols-2 gap-4">
             <FormInput label="Identity Slug" required value={formData.slug} onChange={(e:any) => setFormData({...formData, slug: e.target.value})} placeholder="acme-corp" />
             <FormSelect label="Base Currency" value={formData.currency} onChange={(e:any) => setFormData({...formData, currency: e.target.value})} options={['USD', 'EUR', 'AED', 'INR']} />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <FormInput label="Owner Name" required value={formData.ownerName} onChange={(e:any) => setFormData({...formData, ownerName: e.target.value})} placeholder="John Doe" />
             <FormInput label="Owner Email" required type="email" value={formData.ownerEmail} onChange={(e:any) => setFormData({...formData, ownerEmail: e.target.value})} placeholder="john@acme.com" />
          </div>
          <FormInput label="Initial Master Password" required type="password" value={formData.ownerPassword} onChange={(e:any) => setFormData({...formData, ownerPassword: e.target.value})} placeholder="••••••••" />
          <FormSelect label="Platform Licensing" value={formData.plan} onChange={(e:any) => setFormData({...formData, plan: e.target.value as OrgPlan})} options={['Enterprise', 'ProMax', 'Growth', 'Basic']} />
          
          <div className="pt-4 flex items-center gap-3 border-t border-white/[0.05]">
             <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-white/[0.08] text-white font-bold text-sm hover:bg-white/[0.05]">Cancel</button>
             <button type="submit" disabled={saving} className="flex-1 h-11 rounded-xl bg-[#4F8CFF] text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin"/> : <>Commit Record <ArrowUpRight size={14}/></>}
             </button>
          </div>
       </form>
    </ModalWrapper>
  );
}

export function CreateBranchModal({ onClose, onComplete, organizations }: { onClose: () => void; onComplete: () => void; organizations: OrganizationListItem[] }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    organizationId: organizations[0]?.id || '',
    name: '',
    currency: 'USD',
    timezone: 'UTC',
    code: '',
  });

  useEffect(() => {
    if (organizations.length > 0 && !formData.organizationId) {
      setFormData(prev => ({ ...prev, organizationId: organizations[0].id }));
    }
  }, [organizations, formData.organizationId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationId) return;
    setSaving(true);
    try {
      await hexaTrackApi.admin.createBranch(formData);
      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Register Branch" desc="Establish operational local endpoint" onClose={onClose}>
       <form className="space-y-4" onSubmit={onSubmit}>
          <FormSelect 
            label="Target Organization" 
            value={formData.organizationId}
            onChange={(e:any) => setFormData({...formData, organizationId: e.target.value})}
            options={organizations.map(o => ({ label: o.name, value: o.id }))} 
          />
          <FormInput label="Branch Nickname" required value={formData.name} onChange={(e:any) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dubai Hub" />
          <div className="grid grid-cols-2 gap-4">
             <FormInput label="Unit Code" value={formData.code} onChange={(e:any) => setFormData({...formData, code: e.target.value})} placeholder="DXB-01" />
             <FormSelect label="Operating Currency" value={formData.currency} onChange={(e:any) => setFormData({...formData, currency: e.target.value})} options={['USD', 'AED', 'EUR']} />
          </div>
          <div className="pt-4">
             <button type="submit" disabled={saving || !formData.organizationId} className="w-full h-11 rounded-xl bg-[#4F8CFF] text-white font-bold text-sm shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center">
                {saving ? <Loader2 size={18} className="animate-spin"/> : 'Provision Branch Network'}
             </button>
          </div>
       </form>
    </ModalWrapper>
  );
}

export function AddOwnerModal({ onClose, onComplete, organizations }: { onClose: () => void; onComplete: () => void; organizations: OrganizationListItem[] }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    organizationId: organizations[0]?.id || '',
    fullName: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (organizations.length > 0 && !formData.organizationId) {
      setFormData(prev => ({ ...prev, organizationId: organizations[0].id }));
    }
  }, [organizations, formData.organizationId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationId) return;
    setSaving(true);
    try {
      await hexaTrackApi.admin.addOwner(formData);
      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Appoint Corporate Owner" desc="Elevated credential root authorization" onClose={onClose}>
       <form className="space-y-4" onSubmit={onSubmit}>
          <FormSelect 
            label="Target Entity" 
            value={formData.organizationId}
            onChange={(e:any) => setFormData({...formData, organizationId: e.target.value})}
            options={organizations.map(o => ({ label: o.name, value: o.id }))} 
          />
          <FormInput label="Operator Legal Name" required value={formData.fullName} onChange={(e:any) => setFormData({...formData, fullName: e.target.value})} placeholder="Jane Smith" />
          <FormInput label="Official Corporate Email" required type="email" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} placeholder="jane.smith@company.com" />
          <FormInput label="Access Password" required type="password" value={formData.password} onChange={(e:any) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
          <div className="pt-4">
             <button type="submit" disabled={saving || !formData.organizationId} className="w-full h-11 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg hover:bg-emerald-600 flex items-center justify-center">
                {saving ? <Loader2 size={18} className="animate-spin"/> : 'Commit & Authorize Owner'}
             </button>
          </div>
       </form>
    </ModalWrapper>
  );
}

export function AddStaffModal({ onClose, onComplete, organizations }: { onClose: () => void; onComplete: () => void; organizations: OrganizationListItem[] }) {
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<LightBranch[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationId: organizations[0]?.id || '',
    branchId: '',
    fullName: '',
    email: '',
    department: 'Finance',
    password: '',
  });

  useEffect(() => {
    if (organizations.length > 0 && !formData.organizationId) {
      setFormData(prev => ({ ...prev, organizationId: organizations[0].id }));
    }
  }, [organizations, formData.organizationId]);

  useEffect(() => {
    if (!formData.organizationId) {
      setBranches([]);
      return;
    }

    let mounted = true;
    setBranchLoading(true);
    hexaTrackApi.admin.allBranches(formData.organizationId)
      .then((items) => {
        if (!mounted) return;
        setBranches(items);
        setFormData((current) => ({
          ...current,
          branchId: current.branchId && items.some((branch) => branch.id === current.branchId)
            ? current.branchId
            : items[0]?.id ?? '',
        }));
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setBranches([]);
      })
      .finally(() => {
        if (mounted) setBranchLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [formData.organizationId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationId || !formData.branchId) return;
    setSaving(true);
    try {
      await hexaTrackApi.admin.addStaff(formData);
      onComplete();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Recruit Staff Node" desc="Initialize member vector within operations" onClose={onClose}>
       <form className="space-y-4" onSubmit={onSubmit}>
          <FormSelect 
            label="Target Entity" 
            value={formData.organizationId}
            onChange={(e:any) => setFormData({...formData, organizationId: e.target.value, branchId: ''})}
            options={organizations.map(o => ({ label: o.name, value: o.id }))} 
          />
          <div className="grid grid-cols-2 gap-4">
             <FormInput label="Staff Node Name" required value={formData.fullName} onChange={(e:any) => setFormData({...formData, fullName: e.target.value})} placeholder="Alex Carter" />
             <FormInput label="Email Endpoint" required type="email" value={formData.email} onChange={(e:any) => setFormData({...formData, email: e.target.value})} placeholder="alex.c@comp.com" />
          </div>
          <FormSelect 
             label={branchLoading ? 'Loading Branches...' : 'Assigned Branch'} 
             value={formData.branchId} 
             onChange={(e:any) => setFormData({...formData, branchId: e.target.value})} 
             options={branches.length > 0 ? branches.map(branch => ({ label: branch.name, value: branch.id })) : [{ label: 'Create a branch first', value: '' }]} 
          />
          <FormSelect 
             label="Assigned Department" 
             value={formData.department} 
             onChange={(e:any) => setFormData({...formData, department: e.target.value})} 
             options={['Finance', 'Operations', 'HR', 'Sales', 'Tech']} 
          />
          <FormInput label="Access Password" required type="password" value={formData.password} onChange={(e:any) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
          <div className="pt-4">
             <button type="submit" disabled={saving || !formData.organizationId || !formData.branchId} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary flex items-center justify-center disabled:opacity-50">
                {saving ? <Loader2 size={18} className="animate-spin"/> : 'Finalize Node Deployment'}
             </button>
          </div>
       </form>
    </ModalWrapper>
  );
}

/** Form Components */
export function FormInput({ label, type = 'text', ...props }: { label: string; type?: string; [key: string]: any }) {
  return (
    <div className="space-y-1.5">
       <label className="text-[11px] font-bold text-[#8B9BB4] uppercase tracking-wider">{label}</label>
       <input 
         type={type}
         className="w-full h-11 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:border-[#4F8CFF]/50 outline-none transition-all"
         {...props} 
       />
    </div>
  );
}

export function FormSelect({ label, options, ...props }: { label: string; options: (string | {label: string, value: string})[]; [key: string]: any }) {
  return (
    <div className="space-y-1.5">
       <label className="text-[11px] font-bold text-[#8B9BB4] uppercase tracking-wider">{label}</label>
       <select 
          className="w-full h-11 px-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:border-[#4F8CFF]/50 outline-none appearance-none cursor-pointer"
          {...props}
       >
          {options.map((o, idx) => {
             const val = typeof o === 'string' ? o : o.value;
             const lab = typeof o === 'string' ? o : o.label;
             return <option key={idx} value={val} className="bg-[#121A22] text-white">{lab}</option>
          })}
       </select>
    </div>
  );
}
