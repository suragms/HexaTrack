'use client';

import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import React from 'react';

type AppScreenProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppScreen({ children, className = '' }: AppScreenProps) {
  return <div className={`mx-auto w-full max-w-5xl space-y-4 pb-4 sm:space-y-5 ${className}`}>{children}</div>;
}

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy: string;
  /** If true, the sheet fills most of the viewport (used for full transaction forms) */
  fullHeight?: boolean;
};

export function BottomSheet({ open, onClose, children, labelledBy, fullHeight = false }: BottomSheetProps) {
  
  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 100;
    const velocityThreshold = 400;
    if (info.offset.y > threshold || info.velocity.y > velocityThreshold) {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="sheet-backdrop fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm touch-none"
            aria-hidden="true"
          />

          {/* Panel Container */}
          <div 
            className="fixed inset-0 z-[99999] flex items-end justify-center overflow-x-hidden overflow-y-visible pointer-events-none pt-8 sm:items-center sm:pt-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
          >
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.05}
              onDragEnd={handleDragEnd}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ 
                type: 'spring', 
                damping: 36, 
                stiffness: 380,
                mass: 0.6 
              }}
              className={`bottom-sheet-panel pointer-events-auto relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border shadow-[0_-18px_55px_rgba(16,42,67,0.16)] sm:rounded-[32px] ${
                fullHeight ? 'h-[96dvh]' : 'h-auto max-h-[92dvh]'
              }`}
            >
              {/* Visual Drag Handle */}
              <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing z-20">
                 <div className="bottom-sheet-handle h-1.5 w-12 rounded-full" />
              </div>
              
              {/* Component Payload */}
              <div className="flex flex-col flex-1 overflow-hidden pt-4 pb-[env(safe-area-inset-bottom,24px)]">
                 {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
