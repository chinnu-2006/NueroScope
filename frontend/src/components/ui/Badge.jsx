import { cn } from '../../lib/cn.js';

/**
 * Badge — small pill used for tags, chip lists, tiny status indicators.
 * Variants use the design tokens (never hardcoded).
 */
export default function Badge({ variant = 'default', className, children, dot = false }) {
  const variants = {
    default:
      'bg-surface-elevated text-ink-secondary hairline',
    subtle:
      'bg-white/[0.03] text-ink-secondary border border-white/[0.06]',
    blue:
      'bg-[color:var(--accent-blue)]/12 text-[color:var(--accent-blue-strong)] border border-[color:var(--accent-blue)]/25',
    emerald:
      'bg-[color:var(--accent-emerald)]/12 text-[color:var(--accent-emerald)] border border-[color:var(--accent-emerald)]/25',
    amber:
      'bg-[color:var(--accent-amber)]/12 text-[color:var(--accent-amber)] border border-[color:var(--accent-amber)]/25',
    red:
      'bg-[color:var(--accent-red)]/12 text-[color:var(--accent-red)] border border-[color:var(--accent-red)]/25',
    purple:
      'bg-[color:var(--accent-purple)]/12 text-[color:var(--accent-purple)] border border-[color:var(--accent-purple)]/25',
  };
  const dotColor = {
    default: 'bg-ink-muted',
    subtle: 'bg-ink-muted',
    blue: 'bg-[color:var(--accent-blue)]',
    emerald: 'bg-[color:var(--accent-emerald)]',
    amber: 'bg-[color:var(--accent-amber)]',
    red: 'bg-[color:var(--accent-red)]',
    purple: 'bg-[color:var(--accent-purple)]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColor[variant])} />}
      {children}
    </span>
  );
}
