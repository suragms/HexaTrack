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
      className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none"
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
      }}
    >
      <nav
        className="mx-auto w-full max-w-md grid grid-cols-5 items-end select-none pointer-events-auto"
        style={{ height: 78, paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Mobile Bottom Navigation"
      >
        <NavItem active={activeScreen === 'dashboard'} icon={Home} label="Home" onClick={() => onNavigate('dashboard')} />
        <NavItem active={activeScreen === 'reports'} icon={BarChart3} label="Reports" onClick={() => onNavigate('reports')} />
 
        {/* ── CENTER FAB ── */}
        <div className="relative flex items-center justify-center pointer-events-none" style={{ height: 78 }}>
          {/* Enhanced Soft Glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 72, height: 72,
              background: 'rgba(108, 99, 255, 0.2)',
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
              background: 'linear-gradient(135deg, #6C63FF 0%, #00D4FF 100%)',
              boxShadow: '0 10px 30px rgba(108, 99, 255, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              touchAction: 'manipulation',
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
      className="relative flex flex-col items-center justify-end gap-1.5 w-full h-full pb-[10px] outline-none pointer-events-auto" aria-label={label}>
      {active && (
        <motion.div layoutId="nav-indicator" className="absolute top-0 inset-x-3 h-[2px] rounded-b-full"
          style={{ background: '#6C63FF', boxShadow: '0 2px 8px rgba(108, 99, 255, 0.4)' }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }} />
      )}
      <motion.div animate={{ y: active ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        style={{ color: active ? '#6C63FF' : '#CBD5E1' }}>
        <Icon size={22} strokeWidth={1.75} />
      </motion.div>
      <span className="leading-none font-bold" style={{ fontSize: 11, color: active ? '#6C63FF' : '#CBD5E1', letterSpacing: 0 }}>{label}</span>
    </motion.button>
  );
}
