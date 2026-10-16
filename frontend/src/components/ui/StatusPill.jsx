import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * StatusPill — used in the top nav ("Analysis Complete") and in the
 * Repository Status rail. State-driven color and icon.
 */
const config = {
  done: {
    icon: CheckCircle2,
    className:
      'bg-[color:var(--accent-emerald)]/12 text-[color:var(--accent-emerald)] ' +
      'border-[color:var(--accent-emerald)]/25',
  },
  running: {
    icon: Loader2,
    spin: true,
    className:
      'bg-[color:var(--accent-blue)]/12 text-[color:var(--accent-blue-strong)] ' +
      'border-[color:var(--accent-blue)]/25',
  },
  pending: {
    icon: Circle,
    className: 'bg-surface-elevated text-ink-muted border-hairline-subtle',
  },
  error: {
    icon: AlertCircle,
    className:
      'bg-[color:var(--accent-red)]/12 text-[color:var(--accent-red)] ' +
      'border-[color:var(--accent-red)]/25',
  },
};

export default function StatusPill({ state = 'done', children, className }) {
  const { icon: Icon, spin, className: pillClass } = config[state] ?? config.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 h-9 rounded-md border text-sm font-medium',
        pillClass,
        className,
      )}
    >
      <Icon size={16} className={spin ? 'animate-spin' : ''} />
      {children}
    </span>
  );
}
