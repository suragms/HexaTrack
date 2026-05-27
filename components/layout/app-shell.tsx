'use client';

import { BarChart3, Bell, Clock3, History, Home, LogOut, Search, UserCircle, Wallet } from 'lucide-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { BrandMark } from '@/components/ui/brand';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { BranchSwitcher } from '@/components/branches/branch-switcher';
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
  isTxSheetOpen?: boolean;
  transactionCount: number;
  children: React.ReactNode;
  onNavigate: (screen: ScreenKey) => void;
  onAddTransaction: () => void;
};

export function AppShell({ activeScreen, isTxSheetOpen = false, transactionCount: _transactionCount, children, onAddTransaction, onNavigate }: AppShellProps) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const isOrgUser =
    user?.organizationRole?.toLowerCase() === 'owner' ||
    user?.organizationRole?.toLowerCase() === 'branchmanager' ||
    user?.organizationRole?.toLowerCase() === 'staff' ||
    user?.organizationRole?.toLowerCase() === 'superadmin';

  return (
    <>
      <div className="hidden min-h-screen w-full bg-[#0F172A] font-sans text-[#F8FAFC] md:flex">
        <aside className="sticky top-0 z-10 flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.04] bg-[#0E152B]/40 px-5 py-8 backdrop-blur-md relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#6C63FF]/20 to-transparent" />
          <div className="mb-8 flex items-center gap-3 px-2">
            <BrandMark tone="dark" className="h-7 w-auto" />
            <span className="text-xl font-black tracking-tight text-white">HexaTrack</span>
          </div>

          <div className="mb-8 px-1">
            <WorkspaceSwitcher />
          </div>

          <nav className="flex-1 space-y-2">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#CBD5E1]/60">Workspace</p>
            {primaryNav.map((item) => (
              <ShellNavItem key={item.key} active={activeScreen === item.key} icon={item.icon} label={item.label} onClick={() => onNavigate(item.key)} />
            ))}

            <p className="mb-2 px-2 pt-4 text-[10px] font-black uppercase tracking-[0.15em] text-[#CBD5E1]/60">Manage</p>
            {secondaryNav.map((item) => (
              <ShellNavItem key={item.key} active={activeScreen === item.key} icon={item.icon} label={item.label} onClick={() => onNavigate(item.key)} />
            ))}
          </nav>

          <div className="mt-auto border-t border-white/[0.04] pt-4">
            <button
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/[0.04] bg-[#0E152B]/20 px-4 py-3.5 text-[13px] font-bold text-[#CBD5E1] transition hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 active:scale-[0.98] shadow-inner"
              onClick={logout}
              type="button"
            >
              <LogOut size={18} />
              Disconnect
            </button>
          </div>
        </aside>

        <main className="relative z-0 min-w-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#0F172A]/80 px-8 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <WorkspaceSwitcher />
              {isOrgUser && <BranchSwitcher />}
              <div className="ml-auto flex items-center gap-2">
                <IconButton label="Search" icon={Search} />
                <IconButton label="Notifications" icon={Bell} hasBadge />
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-sm font-black text-white shadow-[0_8px_20px_rgba(108,99,255,0.25)] border border-white/[0.1]">
                  {(user?.displayName ?? 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>

      <div
        className="mx-auto flex w-full max-w-[430px] flex-col bg-[#0F172A] text-[#F8FAFC] md:hidden"
        style={{
          minHeight: '100dvh',
          overflowX: 'hidden',
          overflowY: 'visible',
          position: 'relative',
        }}
      >
        <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#0F172A]/90 px-4 py-3 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BrandMark tone="dark" className="h-6 w-auto shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="w-full max-w-[125px]">
                  <WorkspaceSwitcher />
                </div>
                {isOrgUser && (
                  <div className="w-full max-w-[125px]">
                    <BranchSwitcher />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <IconButton label="Search" icon={Search} />
              <IconButton label="Notifications" icon={Bell} hasBadge />
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4FF] text-xs font-black text-white shadow-[0_6px_15px_rgba(108,99,255,0.25)] border border-white/[0.1]">
                {(user?.displayName ?? 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main
          className="w-full"
          style={{
            paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </main>

        <BottomNav activeScreen={activeScreen} isTxSheetOpen={isTxSheetOpen} onAddTransaction={onAddTransaction} onNavigate={onNavigate} />
      </div>
    </>
  );
}

function ShellNavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-[13px] font-bold transition duration-200 ${
        active ? 'bg-[#0E152B] border border-white/[0.04] text-[#6C63FF] shadow-sm font-black' : 'text-[#CBD5E1] hover:bg-[#0E152B]/40 hover:text-white'
      }`}
      onClick={onClick}
      type="button"
    >
      {active && <div className="absolute left-2 w-1 h-4 rounded-full bg-[#6C63FF] shadow-[0_0_6px_#6C63FF]" />}
      <Icon size={18} className={`${active ? 'text-[#6C63FF] animate-pulse ml-1.5' : 'text-[#CBD5E1] group-hover:scale-105 transition-transform'}`} />
      <span className={active ? 'ml-1 tracking-wide' : 'tracking-wide'}>{label}</span>
    </button>
  );
}

function IconButton({ label, icon: Icon, hasBadge = false }: { label: string; icon: React.ElementType; hasBadge?: boolean }) {
  return (
    <button type="button" aria-label={label} className="relative grid h-10 w-10 place-items-center rounded-full bg-[#0E152B] text-[#CBD5E1] shadow-sm border border-white/[0.04] transition hover:text-[#6C63FF] hover:border-[#6C63FF]/30">
      <Icon size={18} />
      {hasBadge && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#6C63FF] ring-2 ring-[#0E152B]" />}
    </button>
  );
}
