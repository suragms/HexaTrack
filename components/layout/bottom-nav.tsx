'use client';

import { BarChart3, History as HistoryIcon, Home, Plus, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ScreenKey } from '@/components/layout/app-shell';

type BottomNavProps = {
  activeScreen: ScreenKey;
  isTxSheetOpen?: boolean;
  onAddTransaction: () => void;
  onNavigate: (screen: ScreenKey) => void;
};

export function BottomNav({ activeScreen, isTxSheetOpen = false, onAddTransaction, onNavigate }: BottomNavProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-auto"
      style={{
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(229, 231, 235, 0.8)',
        boxShadow: '0 -10px 40px rgba(16, 42, 67, 0.04)',
        touchAction: 'none',
      }}
    >
      <nav
        className="mx-auto w-full max-w-md grid grid-cols-5 items-end select-none"
        style={{ height: 78, paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Mobile Bottom Navigation"
      >
        <NavItem active={activeScreen === 'dashboard'} icon={Home} label="Home" onClick={() => onNavigate('dashboard')} />
        <NavItem active={activeScreen === 'reports'} icon={BarChart3} label="Reports" onClick={() => onNavigate('reports')} />
 
        {/* ── CENTER FAB ── */}
        <div className="relative flex items-center justify-center" style={{ height: 78, pointerEvents: 'none' }}>
          {/* Enhanced Soft Glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 72, height: 72,
              background: 'rgba(16, 185, 129, 0.15)',
              filter: 'blur(16px)',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -58%)',
            }}
          />
          <motion.button
            aria-label="Add Transaction"
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 600, damping: 25 }}
            onClick={onAddTransaction}
            type="button"
            className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center justify-center rounded-full overflow-hidden group pointer-events-auto"
            style={{
              width: 72,
              height: 72,
              bottom: 'calc(28px + env(safe-area-inset-bottom))',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <motion.div
              initial={false}
              animate={{ rotate: isTxSheetOpen ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Plus size={32} strokeWidth={2.5} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
            </motion.div>
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/20 pointer-events-none" />
          </motion.button>
        </div>
 
        <NavItem active={activeScreen === 'history'} icon={HistoryIcon} label="History" onClick={() => onNavigate('history')} />
        <NavItem active={activeScreen === 'settings' || activeScreen === 'assistant'} icon={UserCircle} label="Profile" onClick={() => onNavigate('settings')} />
      </nav>
    </div>
  );
}
 
function NavItem({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.92 }}
      className="relative flex flex-col items-center justify-end gap-1.5 w-full h-full pb-[10px] outline-none" aria-label={label}>
      {active && (
        <motion.div layoutId="nav-indicator" className="absolute top-0 inset-x-3 h-[2px] rounded-b-full"
          style={{ background: '#10B981', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }} />
      )}
      <motion.div animate={{ y: active ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{ color: active ? '#10B981' : '#6B7280' }}>
        <Icon size={22} strokeWidth={1.75} />
      </motion.div>
      <span className="leading-none font-bold" style={{ fontSize: 11, color: active ? '#10B981' : '#6B7280', letterSpacing: 0 }}>{label}</span>
    </motion.button>
  );
}
