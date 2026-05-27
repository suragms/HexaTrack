'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useFinanceStore } from '@/store/finance-store';
import { TransactionType } from '@/lib/types';
import { BrandMark } from '@/components/ui/brand';
import { 
  LayoutDashboard, Users, Settings, LogOut, Bell, Search, 
  Building2, Network, Briefcase, TrendingUp, CreditCard, History, 
  PieChart, RefreshCcw, DollarSign, Wallet, Plus, ShieldAlert, ArrowUpRight, Tag,
  BarChart3, Home
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/* Custom Owner Pages */
import { OrganizationOverview } from '@/components/branches/organization-overview';
import { StaffManagementTable } from '@/components/branches/staff-management-table';
import { AssetManagement } from '@/components/branches/asset-management';
import { ConsolidatedLedger } from '@/components/branches/consolidated-ledger';
import { IntegrationsHub } from '@/components/branches/integrations-hub';
import { BranchSwitcher } from '@/components/branches/branch-switcher';

/* Shared Workspace Screens (Direct Re-use of Prebuilt Enterprise Tools) */
const DashboardScreen = dynamic(() => import('@/components/screens/dashboard-screen').then(m => m.DashboardScreen), { loading: () => <LoaderSkeleton /> });
const HistoryScreen = dynamic(() => import('@/components/screens/history-screen').then(m => m.HistoryScreen), { loading: () => <LoaderSkeleton /> });
const ReportsScreen = dynamic(() => import('@/components/screens/reports-screen').then(m => m.ReportsScreen), { loading: () => <LoaderSkeleton />, ssr: false });
const RecurringScreen = dynamic(() => import('@/components/screens/recurring-screen').then(m => m.RecurringScreen), { loading: () => <LoaderSkeleton /> });
const SettingsScreen = dynamic(() => import('@/components/screens/settings-screen').then(m => m.SettingsScreen), { loading: () => <LoaderSkeleton /> });

/* Modals / UI Utils */
import { AddTransactionSheet } from '@/components/transactions/add-transaction-sheet';
import { StatusBanner } from '@/components/ui/status-banner';

type OwnerView = 
  | 'overview' | 'staff' | 'assets' | 'ledger' | 'integrations' 
  | 'finance-dashboard' | 'transactions' | 'reports' | 'recurring' | 'settings';

export default function OwnerDashboard() {
  const router = useRouter();
  const { user, logout, hydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<OwnerView>('overview');
  const [txType, setTxType] = useState<TransactionType | 'Menu' | null>(null);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const loadFinanceWorkspace = useFinanceStore((s) => s.loadWorkspace);
  const { loading, error, clearError } = useFinanceStore();

  useEffect(() => {
    if (hydrated) {
      if (!user) {
        router.replace('/');
        return;
      }
      const role = user.organizationRole?.toLowerCase();
      if (role === 'staff') {
        router.replace('/staff/dashboard');
      }
    }
  }, [hydrated, user, router]);

  // Re-sync finance store anytime global workspaceId changes (e.g. via BranchSwitcher)
  useEffect(() => {
     if (activeWorkspaceId) {
        void loadFinanceWorkspace();
     }
  }, [activeWorkspaceId, loadFinanceWorkspace]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'add-expense') {
        setTimeout(() => {
          setTxType('Expense');
        }, 800);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (action === 'add-income') {
        setTimeout(() => {
          setTxType('Income');
        }, 800);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen bg-[#0B1015] flex items-center justify-center text-[#8B9BB4]">
        <div className="animate-pulse font-black tracking-widest text-xs uppercase">Synchronizing Global Access Keys...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const renderContent = () => {
     switch (activeTab) {
        case 'overview': return <OrganizationOverview />;
        case 'staff': return <StaffManagementTable />;
        case 'assets': return <AssetManagement />;
        case 'ledger': return <ConsolidatedLedger />;
        case 'integrations': return <IntegrationsHub />;
        
        /* Shared Branch Contextual Finance Screens */
        case 'finance-dashboard': return <DashboardScreen onAddTransaction={() => setTxType('Expense')} />;
        case 'transactions': return <HistoryScreen />;
        case 'reports': return <ReportsScreen />;
        case 'recurring': return <RecurringScreen />;
        case 'settings': return <SettingsScreen />;
        
        default: return <OrganizationOverview />;
     }
  };

  const needsWorkspace = !activeWorkspaceId && ['finance-dashboard', 'transactions', 'reports', 'recurring', 'settings'].includes(activeTab);

  return (
    <>
      {/* Dynamic Shared Components */}

      {/* ─── DESKTOP LAYOUT (md+) ─── */}
      <div className="hidden md:flex min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans selection:bg-[#6C63FF]/20">
        {/* Desktop Sidebar */}
        <aside className="w-[280px] border-r border-white/[0.05] bg-[#0B1015] flex flex-col sticky top-0 h-screen">
          <div className="h-20 flex items-center px-7 border-b border-white/[0.04]">
            <BrandMark tone="dark" />
            <div className="ml-3 px-2 py-0.5 rounded bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 text-[9px] font-black tracking-widest uppercase">Owner</div>
          </div>

          <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-20">
              <SidebarLabel>Command</SidebarLabel>
              <SideNavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={LayoutDashboard} label="Master Control" />
              <SideNavItem active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={Users} label="Workforce Registry" />
              <SideNavItem active={activeTab === 'ledger'} icon={History} label="Global Ledger" onClick={() => setActiveTab('ledger')} />

              <div className="h-4" />
              <SidebarLabel>Branch Finance</SidebarLabel>
              <SideNavItem active={activeTab === 'finance-dashboard'} onClick={() => setActiveTab('finance-dashboard')} icon={TrendingUp} label="Branch Monitor" />
              <SideNavItem active={false} onClick={() => router.push('/owner/income')} icon={DollarSign} label="Income" />
              <SideNavItem active={false} onClick={() => router.push('/owner/expenses')} icon={ArrowUpRight} label="Expenses" />
              <SideNavItem active={false} onClick={() => router.push('/owner/accounts')} icon={Wallet} label="Accounts" />
              <SideNavItem active={false} onClick={() => router.push('/owner/categories')} icon={Tag} label="Categories" />
              <SideNavItem active={activeTab === 'transactions'} onClick={() => router.push('/owner/transactions')} icon={CreditCard} label="Transactions" />
              <SideNavItem active={activeTab === 'reports'} onClick={() => router.push('/owner/analytics')} icon={PieChart} label="Financial Analytics" />
              <SideNavItem active={activeTab === 'recurring'} onClick={() => setActiveTab('recurring')} icon={RefreshCcw} label="Recurring Ledger" />

              <div className="h-4" />
              <SidebarLabel>Infrastructure</SidebarLabel>
              <SideNavItem active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={Briefcase} label="Asset Registry" />
              <SideNavItem active={activeTab === 'integrations'} icon={Network} label="Integrations" onClick={() => setActiveTab('integrations')} />

              <div className="h-4" />
              <SidebarLabel>System</SidebarLabel>
              <SideNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Local Controls" />
          </div>

          <div className="p-4 border-t border-white/[0.05]">
             <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.04] mb-3">
                <div className="flex items-center gap-3">
                   <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#2563EB] flex items-center justify-center font-black text-white shadow-lg border border-white/10 text-xs">
                     {user.displayName?.charAt(0).toUpperCase()}
                   </div>
                   <div className="min-w-0">
                      <p className="text-xs font-black text-[#E1E2EC] truncate">{user.displayName}</p>
                      <p className="text-[10px] font-bold text-[#C2C6D6] truncate opacity-60 uppercase tracking-wider">Executive ID</p>
                   </div>
                </div>
             </div>
             <button onClick={handleLogout} className="w-full h-10 rounded-xl border border-white/[0.06] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-[#C2C6D6] transition-all duration-200">
               <LogOut size={14} /> Finalize Session
             </button>
          </div>
        </aside>

        {/* Desktop Main */}
        <main className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#4F8CFF]/5 blur-[100px] pointer-events-none rounded-full z-0" />
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] pointer-events-none rounded-full z-0" />

           {error && <div className="sticky top-0 z-[99]"><StatusBanner error={error} loading={false} onDismiss={clearError} /></div>}

           <header className="h-20 flex items-center justify-between px-8 border-b border-white/[0.04] bg-[#0B1015]/80 backdrop-blur-xl sticky top-0 z-40">
              <div className="flex items-center gap-4 flex-1">
                 <BranchSwitcher />
                 <div className="flex items-center bg-[#0E152B] border border-white/[0.05] rounded-xl px-3.5 py-2 w-full max-w-xs transition-all focus-within:border-white/20">
                    <Search size={14} className="text-[#C2C6D6]/40 mr-2" />
                    <input type="text" placeholder="Global Audit Query..." className="bg-transparent border-none outline-none text-xs text-white placeholder:text-[#C2C6D6]/30 w-full font-medium" />
                 </div>
              </div>
              <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => setTxType('Expense')}
                    disabled={!activeWorkspaceId}
                    className="h-10 px-4 bg-[#4F8CFF] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#4F8CFF]/20 hover:brightness-105 transition-all active:scale-95 disabled:opacity-50"
                    type="button"
                  >
                     <Plus size={16} /> Record Feed
                  </button>
                 <button className="h-10 w-10 rounded-xl border border-white/[0.06] bg-[#0E152B] flex items-center justify-center text-[#C2C6D6] hover:text-white hover:border-white/20 transition-colors relative">
                    <Bell size={16} />
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 </button>
              </div>
           </header>

           <div className="flex-1 p-8 lg:p-10 max-w-7xl w-full mx-auto relative z-10">
              {needsWorkspace ? (
                 <div className="min-h-[400px] flex flex-col items-center justify-center text-center border border-dashed border-white/[0.08] rounded-[32px] bg-white/[0.01]">
                    <ShieldAlert size={40} className="text-yellow-500 opacity-40 mb-4" />
                    <h3 className="text-lg font-black text-white tracking-tight">Branch Node Required</h3>
                    <p className="text-xs text-[#C2C6D6] mt-1 max-w-xs font-bold leading-relaxed uppercase tracking-wide">Please initialize or select an active node using the switch vector located in the command header.</p>
                 </div>
              ) : (
                 <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeTab} 
                      initial={{ opacity: 0, y: 12 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -12 }} 
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                       {renderContent()}
                    </motion.div>
                 </AnimatePresence>
              )}
           </div>
        </main>
      </div>

      {/* ─── MOBILE LAYOUT (below md) ─── */}
      <div
        className="mx-auto md:hidden flex w-full max-w-[430px] flex-col bg-[#0F172A] text-[#F8FAFC] font-sans"
        style={{
          minHeight: '100dvh',
          overflowX: 'hidden',
          overflowY: 'visible',
          position: 'relative',
        }}
      >

        {/* Mobile Header — compact 72px */}
        <header className="shrink-0 flex items-center justify-between px-4 bg-[#050816]/90 backdrop-blur-xl border-b border-white/[0.05]" style={{ height: 72 }}>
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark tone="dark" className="h-6 w-auto shrink-0" />
            <div className="px-2 py-0.5 rounded-full bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 text-[8px] font-black tracking-widest uppercase shrink-0">Owner</div>
          </div>
          <div className="flex items-center gap-2">
            <BranchSwitcher />
            <button className="h-10 w-10 rounded-xl border border-white/[0.05] bg-[#0E152B] flex items-center justify-center text-[#C2C6D6] relative shrink-0">
              <Bell size={16} />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
            </button>
            <button 
              onClick={handleLogout}
              className="h-10 w-10 rounded-xl border border-white/[0.05] bg-[#0E152B] flex items-center justify-center text-[#FF5C75] shrink-0 active:scale-90 transition-transform"
            >
              <LogOut size={16} />
            </button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] flex items-center justify-center text-white text-xs font-bold border border-white/[0.1] shrink-0">
              {user.displayName?.charAt(0).toUpperCase() || 'O'}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main
          className="w-full"
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 16,
            paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
          }}
        >
          {error && <StatusBanner error={error} loading={false} onDismiss={clearError} />}
          {needsWorkspace ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <ShieldAlert size={32} className="text-yellow-500 opacity-40 mb-3" />
              <h3 className="text-sm font-black text-white">Select a Branch</h3>
              <p className="text-[11px] text-[#C2C6D6] mt-1 max-w-[240px]">Use the branch switcher above to connect to a workspace.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* ─── FIXED BOTTOM NAVIGATION ─── */}
        <div
          className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <nav
            className="mx-auto w-full max-w-md grid grid-cols-5 items-end select-none pointer-events-auto"
            style={{ height: 82, paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <OwnerNavItem
              active={activeTab === 'overview'}
              icon={Home}
              label="Home"
              onClick={() => setActiveTab('overview')}
            />
            <OwnerNavItem
              active={activeTab === 'reports'}
              icon={BarChart3}
              label="Reports"
              onClick={() => setActiveTab('reports')}
            />
            {/* Center FAB */}
            <div className="relative flex items-center justify-center pointer-events-none" style={{ height: 82 }}>
              <div className="absolute rounded-full pointer-events-none" style={{ width: 68, height: 68, background: 'rgba(108, 99, 255, 0.2)', filter: 'blur(14px)', top: '50%', left: '50%', transform: 'translate(-50%, -54%)' }} />
              <motion.button
                whileTap={{ scale: 0.90 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => setTxType('Menu')}
                disabled={!activeWorkspaceId}
                type="button"
                className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center justify-center rounded-full overflow-hidden disabled:opacity-50 pointer-events-auto"
                style={{
                  width: 72,
                  height: 72,
                  bottom: 'calc(28px + env(safe-area-inset-bottom))',
                  background: 'linear-gradient(135deg, #6C63FF 0%, #00D4FF 100%)',
                  boxShadow: '0 10px 30px rgba(108, 99, 255, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.22)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: txType !== null ? 45 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Plus size={28} strokeWidth={2} className="text-white" />
                </motion.div>
              </motion.button>
            </div>
            <OwnerNavItem
              active={activeTab === 'transactions' || activeTab === 'ledger'}
              icon={History}
              label="History"
              onClick={() => setActiveTab('ledger')}
            />
            <OwnerNavItem
              active={activeTab === 'settings'}
              icon={Settings}
              label="Profile"
              onClick={() => setActiveTab('settings')}
            />
          </nav>
        </div>
      </div>

      <AddTransactionSheet
        open={txType !== null}
        onOpenChange={(v) => { if (!v) setTxType(null); }}
        defaultType={(txType === 'Income' || txType === 'Expense') ? txType : undefined}
        initialStep="menu"
        onSaved={loadFinanceWorkspace}
      />
    </>
  );
}


/* ─── Helper Components ─── */

function OwnerNavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className="relative flex flex-col items-center justify-end gap-1.5 w-full h-full pb-[10px] outline-none pointer-events-auto"
    >
      {active && (
        <motion.div
          layoutId="owner-nav-indicator"
          className="absolute top-0 inset-x-3 h-[2px] rounded-b-full"
          style={{ background: '#6C63FF', boxShadow: '0 2px 8px rgba(108, 99, 255, 0.4)' }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        />
      )}
      <motion.div
        animate={{ y: active ? -1 : 0 }}
        style={{ color: active ? '#6C63FF' : '#CBD5E1' }}
      >
        <Icon size={22} strokeWidth={1.75} style={active ? { filter: 'drop-shadow(0 0 6px rgba(108,99,255,0.5))' } : undefined} />
      </motion.div>
      <span className="leading-none font-medium" style={{ fontSize: 11, color: active ? '#6C63FF' : '#CBD5E1' }}>
        {label}
      </span>
    </motion.button>
  );
}

function SidebarLabel({ children }: { children: React.ReactNode }) {
   return (
      <div className="px-4 py-2 mt-2">
         <p className="text-[10px] font-black text-[#C2C6D6]/50 uppercase tracking-[0.25em] antialiased select-none">{children}</p>
      </div>
   );
}

function SideNavItem({ icon: Icon, label, active, onClick }: { icon: React.ElementType, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
       onClick={onClick}
       className={`w-full h-11 rounded-xl flex items-center px-4 gap-3 transition-all duration-200 group relative ${
         active 
           ? 'bg-gradient-to-r from-[#4F8CFF]/10 to-[#4F8CFF]/5 text-[#4F8CFF] shadow-[inset_0_0_0_1px_rgba(79,140,255,0.25)] shadow-lg shadow-blue-500/5' 
           : 'text-[#C2C6D6] hover:bg-white/[0.03] hover:text-[#E1E2EC]'
       }`}
    >
       {active && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#4F8CFF] rounded-r shadow-[0_0_12px_#4F8CFF]" />}
       <Icon size={16} className={`${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity duration-200`} />
       <span className={`text-sm font-bold tracking-tight ${active ? 'font-black' : ''}`}>{label}</span>
    </button>
  );
}

function LoaderSkeleton() {
   return (
      <div className="space-y-5 w-full">
         <div className="h-8 bg-white/[0.03] w-1/4 rounded-xl animate-pulse" />
         <div className="grid grid-cols-3 gap-5">
            <div className="h-32 bg-white/[0.03] rounded-3xl animate-pulse" />
            <div className="h-32 bg-white/[0.03] rounded-3xl animate-pulse" />
            <div className="h-32 bg-white/[0.03] rounded-3xl animate-pulse" />
         </div>
         <div className="h-64 bg-white/[0.03] rounded-[32px] animate-pulse" />
      </div>
   );
}
