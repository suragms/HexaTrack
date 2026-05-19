'use client';

import { PremiumFintechDashboard } from '@/components/dashboard/premium-fintech-dashboard';

export function DashboardScreen({ onAddTransaction, onNavigate }: { compact?: boolean; onAddTransaction: () => void; onNavigate?: (screen: any) => void }) {
  return (
    <PremiumFintechDashboard
      roleLabel="Finance Workspace"
      onAddTransaction={onAddTransaction}
      onNavigate={(screen) => onNavigate?.(screen)}
    />
  );
}
