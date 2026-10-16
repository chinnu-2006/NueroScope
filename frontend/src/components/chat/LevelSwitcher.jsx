import { cn } from '../../lib/cn.js';

const LEVELS = [
  { id: 'beginner',     label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'senior',       label: 'Senior' },
  { id: 'interview',    label: 'Interview' },
];

export default function LevelSwitcher({ value, onChange, className }) {
  return (
    <div className={cn('inline-flex p-1 rounded-md bg-surface-elevated hairline', className)}>
      {LEVELS.map((l) => {
        const active = value === l.id;
        return (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            className={cn(
              'h-7 px-2.5 rounded text-[12px] font-medium transition-colors duration-fast ease-out',
              active
                ? 'bg-[color:var(--accent-purple)]/15 text-[color:var(--accent-purple)] shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]'
                : 'text-ink-secondary hover:text-ink-primary',
            )}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
