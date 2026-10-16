import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const stateVisual = {
  done: {
    ring: 'bg-[color:var(--accent-emerald)]/15 text-[color:var(--accent-emerald)]',
    icon: CheckCircle2,
  },
  running: {
    ring: 'bg-[color:var(--accent-blue)]/15 text-[color:var(--accent-blue-strong)]',
    icon: Loader2,
    spin: true,
  },
  pending: {
    ring: 'bg-white/[0.04] text-ink-muted',
    icon: Circle,
  },
};

/** Repository Status card — appears in sidebar, matches mockup. */
export default function StatusRail({ items = [], title = 'Repository Status' }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted mb-3">
        {title}
      </p>
      <ul className="space-y-3">
        {items.map((it) => {
          const v = stateVisual[it.state] ?? stateVisual.pending;
          const Icon = v.icon;
          return (
            <li key={it.id} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 h-7 w-7 rounded-md grid place-items-center shrink-0',
                  v.ring,
                )}
              >
                <Icon size={14} className={v.spin ? 'animate-spin' : ''} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-primary leading-tight">{it.label}</p>
                <p className="text-xs text-ink-muted mt-0.5 truncate">{it.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
