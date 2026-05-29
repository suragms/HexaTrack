'use client';

import { PremiumFintechDashboard } from '@/components/dashboard/premium-fintech-dashboard';
import type { TransactionType } from '@/lib/types';
import type { ScreenKey } from '@/components/layout/app-shell';

export function DashboardScreen({ onAddTransaction, onNavigate }: { compact?: boolean; onAddTransaction: (type?: TransactionType) => void; onNavigate?: (screen: ScreenKey) => void }) {
  return (
    <PremiumFintechDashboard
      onAddTransaction={(type?: TransactionType) => onAddTransaction(type)}
      onNavigate={(screen?: ScreenKey) => screen && onNavigate?.(screen)}
    />
  );
}
