'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

let toastListeners: Array<(toast: ToastItem) => void> = [];

/** Show a toast notification from anywhere in the app. */
export function showToast(type: ToastType, message: string) {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    message,
  };
  toastListeners.forEach((fn) => fn(item));
}

/**
 * Toast container – render once in your layout.
 * Listens for imperative showToast() calls and renders animated notifications.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (toast: ToastItem) => {
      setToasts((prev) => [...prev, toast]);
      // Auto dismiss after 4s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    toastListeners.push(handler);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== handler);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
            )}
            <span className="text-xs font-bold text-white/90 flex-1 leading-tight">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              type="button"
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
