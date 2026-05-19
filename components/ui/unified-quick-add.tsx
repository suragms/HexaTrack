'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, Landmark, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { usePathname } from 'next/navigation';
import { AddTransactionSheet } from '@/components/transactions/add-transaction-sheet';
import type { TransactionType } from '@/lib/types';

export function UnifiedQuickAdd() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const pathname = usePathname();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [selectedType, setSelectedType] = useState<TransactionType>('Expense');

  // Hide on public pages or when auth is not loaded
  const isAuthenticated = !!user;
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname.startsWith('/auth');

  // Keyboard shortcut: Pressing '+' opens the quick add menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' && !isPublicPage && isAuthenticated) {
        // Only trigger if not typing in inputs
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        setShowMenu(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPublicPage, isAuthenticated]);

  // Listen for global programmatic quick add events
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ type?: TransactionType; menu?: boolean }>;
      if (customEvent.detail?.menu) {
        setShowMenu(true);
        return;
      }

      const presetType = customEvent.detail?.type || 'Expense';
      setSelectedType(presetType);
      setShowSheet(true);
    };
    window.addEventListener('hexatrack:open-quick-add', handleOpenEvent);
    return () => window.removeEventListener('hexatrack:open-quick-add', handleOpenEvent);
  }, []);

  if (!hydrated || !isAuthenticated || isPublicPage) {
    return null;
  }

  const handleOpenSheet = (type: TransactionType) => {
    setSelectedType(type);
    setShowMenu(false);
    setShowSheet(true);
  };

  return (
    <>
      {/* ── FAB BUTTON ── */}
      <div className="fixed bottom-6 right-6 z-[9999] hidden pointer-events-auto md:flex md:bottom-8 md:right-8">
        <div className="absolute rounded-full pointer-events-none w-16 h-16 bg-primary/20 blur-md -translate-x-1 -translate-y-1" style={{ top: -4, left: -4 }} />
        <motion.button
          onClick={() => setShowMenu(!showMenu)}
          whileHover={{ scale: 1.08, boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)' }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="relative flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-emerald shadow-[0_8px_32px_rgba(16,185,129,0.3)] border border-white/20 text-white cursor-pointer select-none outline-none focus:outline-none"
          style={{ width: 58, height: 58 }}
          type="button"
          aria-label="Quick Add Menu"
        >
          <motion.div
            animate={{ rotate: showMenu ? 135 : 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="flex items-center justify-center"
          >
            <Plus size={28} strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      </div>

      {/* ── QUICK ACTION OVERLAY MENU ── */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-[#050816]/75 backdrop-blur-md z-[9997]"
            />

            {/* Float Menu Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              className="fixed inset-x-4 bottom-[calc(118px+env(safe-area-inset-bottom))] z-[9998] mx-auto w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0E152B]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl md:inset-x-auto md:bottom-28 md:right-8 md:mx-0 md:w-72"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black tracking-widest text-on-surface-variant uppercase font-label-caps opacity-60">
                  Quick Actions
                </span>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-on-surface-variant transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Add Income Option */}
                <button
                  onClick={() => handleOpenSheet('Income')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-primary/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <ArrowUpRight size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Add Income</p>
                      <p className="text-[10px] text-on-surface-variant/50">Credit incoming funds</p>
                    </div>
                  </div>
                </button>

                {/* Add Expense Option */}
                <button
                  onClick={() => handleOpenSheet('Expense')}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-danger/20 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center text-danger group-hover:scale-105 transition-transform">
                      <ArrowDownLeft size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Add Expense</p>
                      <p className="text-[10px] text-on-surface-variant/50">Debit outgoing money</p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TRANSACTION FORM SHEET ── */}
      <AddTransactionSheet
        open={showSheet}
        onOpenChange={setShowSheet}
        defaultType={selectedType}
        initialStep="form"
      />
    </>
  );
}
