import { Search, X } from 'lucide-react';
import { CATEGORIES, FILTER_CATEGORIES } from '../../utils/nodeCategories.js';
import { cn } from '../../lib/cn.js';

/**
 * Row containing:
 *  - live search input (filters node visibility as user types)
 *  - toggleable category chips (with per-category counts)
 */
export default function GraphSearchBar({
  query,
  onQueryChange,
  onSubmit,
  matchCount,
  activeSet,
  onToggleCategory,
  counts = {},
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
        className="flex-1 min-w-[260px] max-w-md"
      >
        <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-surface-elevated hairline focus-within:border-[color:var(--accent-blue)] focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">
          <Search size={14} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search files, folders, classes…"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none text-sm text-ink-primary placeholder:text-ink-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="text-ink-muted hover:text-ink-primary"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          {query && (
            <span className="text-[11px] text-ink-muted num shrink-0">{matchCount} match{matchCount === 1 ? '' : 'es'}</span>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_CATEGORIES.map((id) => {
          const c = CATEGORIES[id];
          const active = activeSet.has(id);
          const count = counts[id] || 0;
          if (count === 0 && !active) return null;
          return (
            <button
              key={id}
              onClick={() => onToggleCategory(id)}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[11px] font-medium border transition-all duration-fast ease-out',
                active
                  ? 'text-ink-primary'
                  : 'text-ink-muted opacity-60 hover:opacity-100',
              )}
              style={{
                background: active ? `${c.color}18` : 'transparent',
                borderColor: active ? `${c.color}55` : 'var(--border-subtle)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: active ? c.color : 'var(--ink-muted)' }}
              />
              {c.label}
              <span className="num text-ink-muted">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
