'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, Sparkles, User, Briefcase, Users, ChevronRight } from 'lucide-react';
import { AppShell, type ScreenKey } from '@/components/layout/app-shell';
import { PremiumFintechDashboard } from '@/components/dashboard/premium-fintech-dashboard';
import { AddTransactionSheet } from '@/components/transactions/add-transaction-sheet';
import { CreateWorkspaceModal } from '@/components/workspace/create-workspace-modal';
import { BrandMark } from '@/components/ui/brand';
import { useAuthStore } from '@/store/auth-store';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { Workspace } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuthStore();
  const hydrateWorkspace = useWorkspaceStore((s) => s.hydrate);
  const wsHydrated = useWorkspaceStore((s) => s.hydrated);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const refreshWorkspaces = useWorkspaceStore((s) => s.refreshWorkspaces);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const loadWorkspace = useFinanceStore((s) => s.loadWorkspace);
  const transactions = useFinanceStore((s) => s.transactions);
  const loading = useFinanceStore((s) => s.loading);

  const [activeTxSheet, setActiveTxSheet] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('dashboard');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (hydrated && user && !wsHydrated) hydrateWorkspace();
  }, [hydrated, hydrateWorkspace, user, wsHydrated]);

  useEffect(() => {
    if (hydrated && !user) router.replace('/');
  }, [hydrated, router, user]);

  useEffect(() => {
    if (hydrated && user && wsHydrated) {
      void loadWorkspace();
    }
  }, [hydrated, wsHydrated, loadWorkspace, user]);

  if (!hydrated || !user) return null;

  // Show loading spinner if workspace hydration has not occurred yet or if we are actively loading the initial workspace state
  if (!wsHydrated || (loading && workspaces.length === 0)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] hero-gradient text-[#F5F7FA]">
        <div className="flex flex-col items-center gap-4">
          <BrandMark tone="dark" compact />
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald/20 border-t-emerald" />
          <p className="text-sm font-medium text-[#8B9BB4] tracking-wide">Syncing secure vault...</p>
        </div>
      </div>
    );
  }

  const handleNavigate = (screen: ScreenKey) => {
    setActiveScreen(screen);
    if (screen === 'transaction') setActiveTxSheet(true);
  };

  const handleCreated = async (created: Workspace) => {
    setActiveWorkspaceId(created.id);
    await refreshWorkspaces();
    await loadWorkspace();
  };

  // If there are zero workspaces, show a beautiful onboarding setup page in fintech dark theme
  if (workspaces.length === 0) {
    return (
      <>
        <div className="flex min-h-screen flex-col bg-[#050816] hero-gradient text-[#F5F7FA] overflow-y-auto">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-white/[0.05]">
            <BrandMark tone="dark" />
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs font-semibold text-[#8B9BB4] transition hover:bg-white/[0.06] hover:text-[#F5F7FA] active:scale-95"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </header>

          {/* Body Content */}
          <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-6 py-12">
            <div className="w-full text-center space-y-3 mb-10 max-w-xl animate-rise-in">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald accent-glow">
                <Sparkles size={12} />
                Get Started
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-b from-[#F5F7FA] to-[#8B9BB4] bg-clip-text text-transparent">
                Create your Workspace
              </h1>
              <p className="text-sm sm:text-base text-[#8B9BB4] leading-relaxed">
                Choose a workspace category to structure your financial dashboard. Personal, Business, or Family workspaces pre-configured with starter categories, accounts, and optimization engines.
              </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-12 animate-rise-in" style={{ animationDelay: '100ms' }}>
              {/* Personal Card */}
              <button
                onClick={() => setCreateOpen(true)}
                className="group relative flex flex-col text-left justify-between rounded-3xl border border-white/[0.06] bg-[#0E152B]/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald/30 hover:bg-[#0E152B]/85 hover:shadow-[0_12px_24px_rgba(16,185,129,0.05)]"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/10 text-emerald transition-colors group-hover:bg-emerald/20">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F5F7FA]">Personal</h3>
                    <p className="mt-1 text-xs text-[#8B9BB4] leading-relaxed">
                      Optimize personal expenses, single-user tracking, budgets, and bank account reconciliation.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-[11px] font-semibold text-emerald opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Create Workspace</span>
                  <ChevronRight size={12} />
                </div>
              </button>

              {/* Business Card */}
              <button
                onClick={() => setCreateOpen(true)}
                className="group relative flex flex-col text-left justify-between rounded-3xl border border-white/[0.06] bg-[#0E152B]/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-cyan/30 hover:bg-[#0E152B]/85 hover:shadow-[0_12px_24px_rgba(6,182,212,0.05)]"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/10 text-cyan transition-colors group-hover:bg-cyan/20">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F5F7FA]">Business</h3>
                    <p className="mt-1 text-xs text-[#8B9BB4] leading-relaxed">
                      Manage freelance operations, business expenses, cashflow analysis, and branch organization contexts.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-[11px] font-semibold text-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Create Workspace</span>
                  <ChevronRight size={12} />
                </div>
              </button>

              {/* Family Card */}
              <button
                onClick={() => setCreateOpen(true)}
                className="group relative flex flex-col text-left justify-between rounded-3xl border border-white/[0.06] bg-[#0E152B]/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:bg-[#0E152B]/85 hover:shadow-[0_12px_24px_rgba(245,158,11,0.05)]"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500/20">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#F5F7FA]">Family</h3>
                    <p className="mt-1 text-xs text-[#8B9BB4] leading-relaxed">
                      Shared budgeting, joint household accounts, multi-member tracking, and group spending structures.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-[11px] font-semibold text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Create Workspace</span>
                  <ChevronRight size={12} />
                </div>
              </button>
            </div>

            {/* CTA Button */}
            <div className="animate-rise-in" style={{ animationDelay: '200ms' }}>
              <button
                onClick={() => setCreateOpen(true)}
                className="primary-button flex items-center gap-2 px-8 py-4 text-base tracking-wide rounded-2xl animate-none"
              >
                <Plus size={20} />
                <span>Create Workspace</span>
              </button>
            </div>
          </main>

          {/* Footer */}
          <footer className="h-12 shrink-0 flex items-center justify-center border-t border-white/[0.05] text-[11px] text-[#8B9BB4]">
            &copy; {new Date().getFullYear()} HexaTrack. All rights reserved.
          </footer>
        </div>

        <CreateWorkspaceModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />
      </>
    );
  }

  return (
    <>
      <AddTransactionSheet 
        open={activeTxSheet} 
        onOpenChange={(open) => {
          setActiveTxSheet(open);
          if (!open && activeScreen === 'transaction') {
            setActiveScreen('dashboard');
          }
        }} 
      />
      <AppShell
        activeScreen={activeScreen}
        isTxSheetOpen={activeTxSheet}
        transactionCount={transactions.length}
        onNavigate={handleNavigate}
        onAddTransaction={() => setActiveTxSheet(true)}
      >
        <PremiumFintechDashboard roleLabel="Individual User" onAddTransaction={() => setActiveTxSheet(true)} onNavigate={(screen) => handleNavigate(screen as ScreenKey)} />
      </AppShell>
    </>
  );
}

