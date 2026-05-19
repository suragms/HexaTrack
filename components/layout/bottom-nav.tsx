'use client';

import { BarChart3, History as HistoryIcon, Home, Plus, UserCircle } from 'lucide-react';
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
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(229,231,235,0.9)',
        boxShadow: '0 -18px 45px rgba(16,42,67,0.08)',
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
        <div className="relative flex items-center justify-center" style={{ height: 78 }}>
          {/* Enhanced Soft Glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 72, height: 72,
              background: 'rgba(15,157,138,0.22)',
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
              background: 'linear-gradient(145deg, #00BFA6 0%, #0F9D8A 55%, #0B6B61 100%)',
              boxShadow: '0 14px 34px rgba(15,157,138,0.42), inset 0 2px 4px rgba(255,255,255,0.22)',
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
          style={{ background: '#0F9D8A', boxShadow: '0 2px 8px rgba(15,157,138,0.45)' }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }} />
      )}
      <motion.div animate={{ y: active ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{ color: active ? '#0F9D8A' : '#6B7280' }}>
        <Icon size={22} strokeWidth={1.75} />
      </motion.div>
      <span className="leading-none font-bold" style={{ fontSize: 11, color: active ? '#0F9D8A' : '#6B7280', letterSpacing: 0 }}>{label}</span>
    </motion.button>
  );
}
