import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../lib/cn.js';

const ToastContext = createContext(null);
let _id = 0;

const VARIANTS = {
  success: { icon: CheckCircle2, color: 'var(--accent-emerald)' },
  info:    { icon: Info,         color: 'var(--accent-blue-strong)' },
  warning: { icon: AlertCircle,  color: 'var(--accent-amber)' },
  error:   { icon: XCircle,      color: 'var(--accent-red)' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts) => {
    const t = typeof opts === 'string' ? { text: opts } : opts || {};
    const id = ++_id;
    const entry = { id, variant: 'info', duration: 4200, ...t };
    setToasts((cur) => [...cur, entry]);
    if (entry.duration > 0) {
      setTimeout(() => dismiss(id), entry.duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed z-[60] bottom-6 right-6 flex flex-col gap-2 max-w-[380px] w-[calc(100vw-3rem)] pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }) {
  const v = VARIANTS[toast.variant] ?? VARIANTS.info;
  const Icon = v.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'pointer-events-auto card-elevated overflow-hidden',
        'flex items-start gap-3 pr-2 pl-4 py-3',
      )}
      style={{ borderColor: `${v.color}40` }}
    >
      <span
        className="h-7 w-7 rounded-md grid place-items-center mt-0.5 shrink-0"
        style={{ background: `${v.color}20`, color: v.color }}
      >
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        {toast.title && (
          <div className="text-sm font-semibold text-ink-primary leading-tight">
            {toast.title}
          </div>
        )}
        {toast.text && (
          <div className={cn('text-[13px] leading-snug', toast.title ? 'text-ink-secondary mt-0.5' : 'text-ink-primary')}>
            {toast.text}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 h-6 w-6 rounded text-ink-muted hover:text-ink-primary hover:bg-surface-hover
                   transition-colors grid place-items-center mt-0.5"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
