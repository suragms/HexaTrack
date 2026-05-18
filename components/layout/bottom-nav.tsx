'use client';

import { CheckSquare, History as HistoryIcon, Home, Plus, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ScreenKey } from '@/components/layout/app-shell';

type BottomNavProps = {
  activeScreen: ScreenKey;
  onAddTransaction: () => void;
  onNavigate: (screen: ScreenKey) => void;
};

export function BottomNav({ activeScreen, onAddTransaction, onNavigate }: BottomNavProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50"
      style={{
        background: 'rgba(5,8,22,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(140,144,159,0.12)',
      }}
    >
      <nav
        className="mx-auto w-full max-w-md grid grid-cols-5 items-end select-none"
        style={{ height: 78, paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Mobile Bottom Navigation"
      >
        <NavItem active={activeScreen === 'dashboard'} icon={Home} label="Home" onClick={() => onNavigate('dashboard')} />
        <NavItem active={activeScreen === 'recurring'} icon={CheckSquare} label="Tasks" onClick={() => onNavigate('recurring')} />

        {/* ── CENTER FAB ── */}
        <div className="relative flex items-center justify-center" style={{ height: 78 }}>
          {/* Enhanced Soft Glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 72, height: 72,
              background: 'rgba(16,185,129,0.25)',
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
            className="relative z-10 flex items-center justify-center rounded-full overflow-hidden group"
            style={{
              width: 68, height: 68, marginBottom: 16,
              background: 'linear-gradient(145deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 12px 32px rgba(16,185,129,0.4), inset 0 2px 4px rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.2)',
            }}
          >
            <motion.div
              initial={false}
              animate={{ rotate: activeScreen === 'transaction' ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Plus size={32} strokeWidth={2.5} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
            </motion.div>
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/20 pointer-events-none" />
          </motion.button>
        </div>

        <NavItem active={activeScreen === 'history'} icon={HistoryIcon} label="History" onClick={() => onNavigate('history')} />
        <NavItem active={activeScreen === 'settings'} icon={Settings} label="Profile" onClick={() => onNavigate('settings')} />
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
          style={{ background: '#10B981', boxShadow: '0 2px 8px #10B981' }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }} />
      )}
      <motion.div animate={{ y: active ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{ color: active ? '#E1E2EC' : '#C2C6D6' }}>
        <Icon size={22} strokeWidth={1.75} style={active ? { filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' } : undefined} />
      </motion.div>
      <span className="leading-none font-medium" style={{ fontSize: 11, color: active ? '#E1E2EC' : '#C2C6D6', letterSpacing: '0.01em' }}>{label}</span>
    </motion.button>
  );
}
