'use client';

import { BarChart3, Clock3, History, Home, Plus, Settings, Wallet, LogOut } from 'lucide-react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { BrandMark } from '@/components/ui/brand';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { useAuthStore } from '@/store/auth-store';

export type ScreenKey = 'dashboard' | 'transaction' | 'history' | 'reports' | 'recurring' | 'wallets' | 'settings' | 'assistant';

const primaryNav = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: Home },
  { key: 'wallets' as const, label: 'Wallets', icon: Wallet },
  { key: 'history' as const, label: 'Transactions', icon: History },
  { key: 'reports' as const, label: 'Analytics', icon: BarChart3 },
  { key: 'settings' as const, label: 'Profile', icon: Settings },
];

const secondaryNav = [{ key: 'recurring' as const, label: 'Recurring', icon: Clock3 }];

type AppShellProps = {
  activeScreen: ScreenKey;
  transactionCount: number;
  children: React.ReactNode;
  onNavigate: (screen: ScreenKey) => void;
  onAddTransaction: () => void;
};

export function AppShell({ activeScreen, children, onAddTransaction, onNavigate, transactionCount }: AppShellProps) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <>
      {/* ─── DESKTOP LAYOUT (md+): sidebar + full-height main ─── */}
      <div className="hidden md:flex min-h-screen w-full max-w-[1440px] mx-auto bg-background relative font-sans">
        {/* Desktop glows */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 blur-[140px] opacity-40 rounded-full -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/5 blur-[120px] opacity-20 rounded-full pointer-events-none" />

        <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-white/[0.05] bg-[#0E152B]/50 px-5 py-8 backdrop-blur-xl flex flex-col z-10">
          <div className="flex items-center gap-3 px-2 mb-8">
            <BrandMark tone="dark" className="h-7 w-auto text-primary" />
            <span className="font-headline text-xl font-bold tracking-tight text-on-surface">HexaTrack</span>
          </div>

          <div className="px-1 mb-8">
            <WorkspaceSwitcher />
          </div>

          <nav className="space-y-2 flex-1">
            <div className="px-2 text-[10px] font-black tracking-[0.15em] text-on-surface-variant/40 uppercase font-label-caps mb-2">Workspace</div>
            {[...primaryNav].map((item) => {
              const Icon = item.icon;
              const active = activeScreen === item.key;
              return (
                <button
                  key={item.key}
                  className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-semibold font-sans tracking-wide transition-all duration-250 group relative ${
                    active
                      ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)] shadow-sm'
                      : 'text-on-surface-variant hover:bg-white/[0.03] hover:text-on-surface'
                  }`}
                  onClick={() => onNavigate(item.key)}
                  type="button"
                >
                  <Icon size={18} className={active ? 'text-primary' : 'text-on-surface-variant opacity-50 group-hover:opacity-90 transition-opacity'} />
                  {item.label}
                  {active && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  )}
                </button>
              );
            })}

            <div className="pt-4 px-2 text-[10px] font-black tracking-[0.15em] text-on-surface-variant/40 uppercase font-label-caps mb-2">Manage</div>
            {[...secondaryNav].map((item) => {
              const Icon = item.icon;
              const active = activeScreen === item.key;
              return (
                <button
                  key={item.key}
                  className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-semibold font-sans tracking-wide transition-all duration-250 group relative ${
                    active
                      ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]'
                      : 'text-on-surface-variant hover:bg-white/[0.03] hover:text-on-surface'
                  }`}
                  onClick={() => onNavigate(item.key)}
                  type="button"
                >
                  <Icon size={18} className={active ? 'text-primary' : 'text-on-surface-variant opacity-50 group-hover:opacity-90 transition-opacity'} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-white/[0.05] mt-auto">
            <button
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.04] bg-[#0E152B] px-4 py-3.5 text-[13px] font-semibold font-sans text-danger transition-all hover:bg-error-container/20 active:scale-[0.98]"
              onClick={logout}
              type="button"
            >
              <LogOut size={18} className="opacity-80" />
              Disconnect
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-8 py-8 overflow-y-auto relative z-0">
          {children}
        </main>


      </div>

      {/* ─── MOBILE LAYOUT (below md): fixed shell with scroll area ─── */}
      <div className="md:hidden flex flex-col bg-background" style={{ height: '100dvh' }}>

        {/* SCROLLABLE CONTENT AREA — fills all space between top safe-area and bottom nav */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 'max(env(safe-area-inset-top), 16px)',
            /* Bottom padding = nav height 78px + safe area + extra buffer */
            paddingBottom: 'calc(78px + env(safe-area-inset-bottom) + 24px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </main>

        {/* FIXED BOTTOM NAVIGATION */}
        <BottomNav activeScreen={activeScreen} onAddTransaction={onAddTransaction} onNavigate={onNavigate} />
      </div>
    </>
  );
}
