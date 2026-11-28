'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export type ToastItem = {
  id: string;
  message: string;
  tone?: 'success' | 'error' | 'info';
};

export function SnackbarHost({
  toasts,
  onDismiss
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <SnackbarToast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function SnackbarToast({
  toast,
  onDismiss
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3600);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const tone = toast.tone ?? 'info';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      role="status"
      className={cn(
        'pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_20px_50px_-12px_rgba(11,37,69,0.35)] backdrop-blur-md',
        tone === 'error'
          ? 'border-[#e85334]/30 bg-[#1c1314]/95 text-white'
          : 'border-white/15 bg-[#141518]/95 text-white'
      )}
    >
      <span
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-xl',
          tone === 'success'
            ? 'bg-emerald-500/20 text-emerald-400'
            : tone === 'error'
              ? 'bg-[#e85334]/20 text-[#ff795c]'
              : 'bg-white/10 text-white/90'
        )}
      >
        {tone === 'success' ? (
          <CheckCircle2 size={15} />
        ) : tone === 'error' ? (
          <AlertCircle size={15} />
        ) : (
          <Info size={15} />
        )}
      </span>

      <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-white/95">
        {toast.message}
      </p>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
      >
        <X size={13} />
      </button>

      {/* Auto-dismiss progress bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 3.6, ease: 'linear' }}
        style={{ transformOrigin: 'left' }}
        className={cn(
          'absolute bottom-0 left-0 h-[2px] w-full',
          tone === 'success' ? 'bg-emerald-400' : tone === 'error' ? 'bg-[#e85334]' : 'bg-white/40'
        )}
      />
    </motion.div>
  );
}
