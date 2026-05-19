'use client';

import { BarChart3, Bell, Clock3, History, Home, LogOut, Search, UserCircle, Wallet } from 'lucide-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { BrandMark } from '@/components/ui/brand';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { useAuthStore } from '@/store/auth-store';

export type ScreenKey = 'dashboard' | 'transaction' | 'history' | 'reports' | 'recurring' | 'wallets' | 'settings' | 'assistant';

const primaryNav = [
  { key: 'dashboard' as const, label: 'Home', icon: Home },
  { key: 'reports' as const, label: 'Reports', icon: BarChart3 },
  { key: 'history' as const, label: 'History', icon: History },
  { key: 'wallets' as const, label: 'Wallets', icon: Wallet },
  { key: 'settings' as const, label: 'Profile', icon: UserCircle },
];

const secondaryNav = [{ key: 'recurring' as const, label: 'Recurring', icon: Clock3 }];

type AppShellProps = {
  activeScreen: ScreenKey;
  transactionCount: number;
  children: React.ReactNode;
  onNavigate: (screen: ScreenKey) => void;
  onAddTransaction: () => void;
};

export function AppShell({ activeScreen, children, onAddTransaction, onNavigate }: AppShellProps) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <div className="hidden min-h-screen w-full bg-[#F5F7F8] font-sans text-[#102A43] md:flex">
        <aside className="sticky top-0 z-10 flex h-screen w-64 shrink-0 flex-col border-r border-[#E5E7EB] bg-white px-5 py-8 shadow-[12px_0_35px_rgba(16,42,67,0.04)]">
          <div className="mb-8 flex items-center gap-3 px-2">
            <BrandMark tone="light" className="h-7 w-auto" />
            <span className="text-xl font-black tracking-tight text-[#102A43]">HexaTrack</span>
          </div>

          <div className="mb-8 px-1">
            <WorkspaceSwitcher />
          </div>

          <nav className="flex-1 space-y-2">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Workspace</p>
            {primaryNav.map((item) => (
              <ShellNavItem key={item.key} active={activeScreen === item.key} icon={item.icon} label={item.label} onClick={() => onNavigate(item.key)} />
            ))}

            <p className="mb-2 px-2 pt-4 text-[10px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Manage</p>
            {secondaryNav.map((item) => (
              <ShellNavItem key={item.key} active={activeScreen === item.key} icon={item.icon} label={item.label} onClick={() => onNavigate(item.key)} />
            ))}
          </nav>

          <div className="mt-auto border-t border-[#E5E7EB] pt-4">
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F5F7F8] px-4 py-3.5 text-[13px] font-bold text-[#EF4444] transition hover:bg-red-50 active:scale-[0.98]"
              onClick={logout}
              type="button"
            >
              <LogOut size={18} />
              Disconnect
            </button>
          </div>
        </aside>

        <main className="relative z-0 min-w-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-[#E5E7EB]/80 bg-[#F5F7F8]/90 px-8 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher />
              <div className="ml-auto flex items-center gap-2">
                <IconButton label="Search" icon={Search} />
                <IconButton label="Notifications" icon={Bell} hasBadge />
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#0F9D8A] to-[#00BFA6] text-sm font-black text-white shadow-[0_12px_26px_rgba(15,157,138,0.24)]">
                  {(user?.displayName ?? 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>

      <div
        className="mx-auto flex w-full max-w-[430px] flex-col bg-[#F5F7F8] text-[#102A43] md:hidden"
        style={{
          minHeight: '100dvh',
          overflowX: 'hidden',
          overflowY: 'auto',
          position: 'relative',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            paddingBottom: 'calc(110px + env(safe-area-inset-bottom))',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </main>

        <BottomNav activeScreen={activeScreen} onAddTransaction={onAddTransaction} onNavigate={onNavigate} />
      </div>
    </>
  );
}

function ShellNavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-[13px] font-bold transition ${
        active ? 'bg-[#EAF8F6] text-[#0F9D8A] shadow-sm' : 'text-[#6B7280] hover:bg-[#F5F7F8] hover:text-[#102A43]'
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon size={18} className={active ? 'text-[#0F9D8A]' : 'text-[#6B7280]'} />
      {label}
      {active && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-[#0F9D8A]" />}
    </button>
  );
}

function IconButton({ label, icon: Icon, hasBadge = false }: { label: string; icon: React.ElementType; hasBadge?: boolean }) {
  return (
    <button type="button" aria-label={label} className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-[#102A43] shadow-sm ring-1 ring-[#E5E7EB] transition hover:text-[#0F9D8A]">
      <Icon size={18} />
      {hasBadge && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-white" />}
    </button>
  );
}
