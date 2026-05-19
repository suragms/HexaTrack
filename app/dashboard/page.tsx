'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, type ScreenKey } from '@/components/layout/app-shell';
import { PremiumFintechDashboard } from '@/components/dashboard/premium-fintech-dashboard';
import { AddTransactionSheet } from '@/components/transactions/add-transaction-sheet';
import { useAuthStore } from '@/store/auth-store';
import { useFinanceStore } from '@/store/finance-store';
import { useWorkspaceStore } from '@/store/workspace-store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const hydrateWorkspace = useWorkspaceStore((s) => s.hydrate);
  const wsHydrated = useWorkspaceStore((s) => s.hydrated);
  const loadWorkspace = useFinanceStore((s) => s.loadWorkspace);
  const transactions = useFinanceStore((s) => s.transactions);
  const [activeTxSheet, setActiveTxSheet] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('dashboard');

  useEffect(() => {
    if (hydrated && user && !wsHydrated) hydrateWorkspace();
  }, [hydrated, hydrateWorkspace, user, wsHydrated]);

  useEffect(() => {
    if (hydrated && !user) router.replace('/');
  }, [hydrated, router, user]);

  useEffect(() => {
    if (hydrated && user) void loadWorkspace();
  }, [hydrated, loadWorkspace, user]);

  if (!hydrated || !user) return null;

  const handleNavigate = (screen: ScreenKey) => {
    setActiveScreen(screen);
    if (screen === 'transaction') setActiveTxSheet(true);
  };

  return (
    <>
      <AddTransactionSheet open={activeTxSheet} onOpenChange={setActiveTxSheet} />
      <AppShell
        activeScreen={activeScreen}
        transactionCount={transactions.length}
        onNavigate={handleNavigate}
        onAddTransaction={() => setActiveTxSheet(true)}
      >
        <PremiumFintechDashboard roleLabel="Individual User" onAddTransaction={() => setActiveTxSheet(true)} onNavigate={(screen) => handleNavigate(screen as ScreenKey)} />
      </AppShell>
    </>
  );
}
