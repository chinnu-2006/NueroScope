import { cn } from '../../lib/cn.js';

/**
 * Button — three variants, matching the design system.
 *   primary   → gradient CTA (use sparingly)
 *   secondary → dark elevated surface, hairline border
 *   ghost     → transparent, hover-only fill
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium select-none whitespace-nowrap ' +
    'rounded-md transition-all duration-fast ease-out disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };

  const variants = {
    primary: 'btn-primary',
    secondary:
      'bg-surface-elevated hairline text-ink-primary hover:bg-surface-hover ' +
      'active:translate-y-px',
    ghost: 'bg-transparent text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
    danger:
      'bg-[color:var(--accent-red)]/12 text-[color:var(--accent-red)] hairline ' +
      'hover:bg-[color:var(--accent-red)]/20',
  };

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
