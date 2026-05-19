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
            className="fixed inset-0 z-[99] bg-[#102A43]/35 backdrop-blur-[12px]"
            aria-hidden="true"
          />

          {/* Panel Container */}
          <div 
            className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden pointer-events-none pt-8 sm:items-center sm:pt-0"
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
              className={`pointer-events-auto relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-[32px] border border-[#E5E7EB] shadow-[0_-18px_55px_rgba(16,42,67,0.16)] sm:rounded-[32px] ${
                fullHeight ? 'h-[96dvh]' : 'h-auto max-h-[92dvh]'
              }`}
              style={{ 
                background: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
              }}
            >
              {/* Visual Drag Handle */}
              <div className="absolute top-0 left-0 right-0 flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing z-20">
                 <div className="h-1.5 w-12 rounded-full bg-[#D1D5DB]" />
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
