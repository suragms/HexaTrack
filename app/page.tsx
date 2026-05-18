'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { AnimatePresence } from '@/components/ui/animate-presence';
import { StatusBanner } from '@/components/ui/status-banner';
import { AddTransactionSheet } from '@/components/transactions/add-transaction-sheet';
import { AppShell, type ScreenKey } from '@/components/layout/app-shell';
import { DashboardScreen } from '@/components/screens/dashboard-screen';
import { BrandMark } from '@/components/ui/brand';
import { useAuthStore } from '@/store/auth-store';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';

import { LandingPage } from '@/components/marketing/landing-page';

const WalletsScreen = dynamic(() => import('@/components/screens/wallets-screen').then((module) => module.WalletsScreen), { loading: () => <ScreenSkeleton /> });
const HistoryScreen = dynamic(() => import('@/components/screens/history-screen').then((module) => module.HistoryScreen), { loading: () => <ScreenSkeleton /> });
const RecurringScreen = dynamic(() => import('@/components/screens/recurring-screen').then((module) => module.RecurringScreen), { loading: () => <ScreenSkeleton /> });
const ReportsScreen = dynamic(() => import('@/components/screens/reports-screen').then((module) => module.ReportsScreen), { loading: () => <ScreenSkeleton />, ssr: false });
const SettingsScreen = dynamic(() => import('@/components/screens/settings-screen').then((module) => module.SettingsScreen), { loading: () => <ScreenSkeleton /> });
const AssistantScreen = dynamic(() => import('@/components/screens/assistant-screen').then((module) => module.AssistantScreen), { loading: () => <ScreenSkeleton /> });

type UnauthView = 'marketing' | 'auth';

export default function Home() {
  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [unauthView, setUnauthView] = useState<UnauthView>('marketing');
  const [mounted, setMounted] = useState(false);
  
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const transactions = useFinanceStore((state) => state.transactions);
  const loadWorkspace = useFinanceStore((state) => state.loadWorkspace);
  const loading = useFinanceStore((state) => state.loading);
  const error = useFinanceStore((state) => state.error);
  const clearError = useFinanceStore((state) => state.clearError);
  const setFinanceError = useFinanceStore((state) => state.setError);

  const hydrateWorkspace = useWorkspaceStore((state) => state.hydrate);
  const ensureActiveWorkspace = useWorkspaceStore((state) => state.ensureActiveWorkspace);

  useEffect(() => {
    setMounted(true);
    hydrate();
    hydrateWorkspace();
  }, [hydrate, hydrateWorkspace]);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'add-expense') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { type: 'Expense' } }));
        }, 800);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (action === 'add-income') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { type: 'Income' } }));
        }, 800);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (action === 'view-reports') {
        setScreen('reports');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (action === 'view-recurring') {
        setScreen('recurring');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [mounted]);

  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    
    // Handle explicit administrative overrides
    const isSuperAdmin = useAuthStore.getState().isSuperAdmin;
    if (isSuperAdmin) {
      router.replace('/admin');
      return;
    }

    const orgRole = user.organizationRole?.toLowerCase();
    if (orgRole === 'owner') {
      router.replace('/owner');
      return;
    }
    if (orgRole === 'staff') {
      router.replace('/staff/dashboard');
      return;
    }

    void (async () => {
      try {
        await ensureActiveWorkspace();
        await loadWorkspace();
      } catch (e) {
        setFinanceError(e instanceof Error ? e.message : 'Unable to load your workspace. Try signing in again.');
      }
    })();
  }, [ensureActiveWorkspace, loadWorkspace, setFinanceError, user, router]);

  useEffect(() => {
    if (error) {
      clearError();
    }
    // Intentionally clear any stale banners when switching screens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const content = useMemo(() => {
    switch (screen) {
      case 'dashboard':
        return <DashboardScreen onAddTransaction={() => window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { type: 'Expense' } }))} onNavigate={setScreen} />;
      case 'transaction':
        return <DashboardScreen onAddTransaction={() => window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { type: 'Expense' } }))} onNavigate={setScreen} compact />;
      case 'history':
        return <HistoryScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'recurring':
        return <RecurringScreen />;
      case 'wallets':
        return <WalletsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'assistant':
        return <AssistantScreen />;
    }
  }, [screen]);

  if (!mounted) {
    return null; // Completely suppress SSR output during static stage to bypass client hydration collision!
  }

  if (!hydrated) {

    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <div className="surface rounded-3xl p-6 flex flex-col items-center">
          <BrandMark tone="dark" />
          <div className="mt-6 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-center text-sm text-on-surface-variant">Initializing Workspace...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <>
        {unauthView === 'marketing' ? (
          <LandingPage 
            onGetStarted={() => setUnauthView('auth')} 
            onLogin={() => setUnauthView('auth')} 
          />
        ) : (
          <AuthPanel />
        )}
      </>
    );
  }

  return (
    <AppShell 
      activeScreen={screen} 
      onAddTransaction={() => {
        window.dispatchEvent(new CustomEvent('hexatrack:open-quick-add', { detail: { menu: true } }));
      }} 
      onNavigate={setScreen} 
      transactionCount={transactions.length}
    >
      <StatusBanner error={error} loading={loading} onDismiss={clearError} />
      <AnimatePresence animationKey={screen}>{content}</AnimatePresence>
    </AppShell>
  );
}


function ScreenSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-xl bg-white/10" />
      <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}
