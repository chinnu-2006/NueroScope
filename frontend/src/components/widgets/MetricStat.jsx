import { cn } from '../../lib/cn.js';

/**
 * MetricStat — large-number stat tile used throughout the Overview
 * and Metrics pages.
 */
export default function MetricStat({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  accent = 'blue',
  className,
}) {
  const accentClass = {
    blue: 'text-[color:var(--accent-blue-strong)] bg-[color:var(--accent-blue)]/12',
    emerald: 'text-[color:var(--accent-emerald)] bg-[color:var(--accent-emerald)]/12',
    amber: 'text-[color:var(--accent-amber)] bg-[color:var(--accent-amber)]/12',
    purple: 'text-[color:var(--accent-purple)] bg-[color:var(--accent-purple)]/12',
    cyan: 'text-[color:var(--accent-cyan)] bg-[color:var(--accent-cyan)]/12',
    red: 'text-[color:var(--accent-red)] bg-[color:var(--accent-red)]/12',
  }[accent];

  return (
    <div className={cn('card p-5 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'h-9 w-9 rounded-md grid place-items-center',
            accentClass,
          )}
        >
          {Icon ? <Icon size={16} /> : null}
        </span>
        {trend && (
          <span className="text-xs font-medium text-ink-muted num">{trend}</span>
        )}
      </div>
      <div>
        <div className="text-2xl font-semibold text-ink-primary num leading-none">{value}</div>
        <div className="text-xs text-ink-muted mt-1.5">{label}</div>
        {hint && <div className="text-[11px] text-ink-muted/80 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
