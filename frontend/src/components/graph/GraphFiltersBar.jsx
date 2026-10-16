import { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { CATEGORIES, FILTER_CATEGORIES } from '../../utils/nodeCategories.js';
import { cn } from '../../lib/cn.js';

/**
 * The row of controls above the canvas:
 *   [ search input ]   [ All Types ▾ ]   [ All Layers ▾ ]
 *
 * "All Types" filters by category; "All Layers" filters by top-level
 * directory (derived from the current node set).
 */
export default function GraphFiltersBar({
  query, onQueryChange, onSubmit, matchCount,
  activeCategories, onToggleCategory,
  activeLayers, onToggleLayer, allLayers,
  counts = {}, layerCounts = {},
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
        className="flex-1 min-w-[240px] max-w-md"
      >
        <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-surface-elevated
                        hairline focus-within:border-[color:var(--accent-blue)]
                        focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">
          <Search size={14} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search in graph…"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none text-sm text-ink-primary placeholder:text-ink-muted"
          />
          {query && (
            <>
              <span className="text-[10px] text-ink-muted num shrink-0">{matchCount}</span>
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="text-ink-muted hover:text-ink-primary shrink-0"
                aria-label="Clear"
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      </form>

      <DropdownFilter
        label="Types"
        activeSet={activeCategories}
        options={FILTER_CATEGORIES.map((id) => ({ id, label: CATEGORIES[id].label, color: CATEGORIES[id].color, count: counts[id] || 0 }))}
        onToggle={onToggleCategory}
        allLabel="All Types"
      />

      <DropdownFilter
        label="Layers"
        activeSet={activeLayers}
        options={allLayers.map((dir) => ({ id: dir, label: dir, count: layerCounts[dir] || 0 }))}
        onToggle={onToggleLayer}
        allLabel="All Layers"
      />
    </div>
  );
}


function DropdownFilter({ label, allLabel, activeSet, options, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const total = options.length;
  const activeCount = options.filter((o) => activeSet.has(o.id)).length;
  const buttonLabel =
    activeCount === total || activeCount === 0 ? allLabel : `${activeCount}/${total} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 h-9 px-3 rounded-md text-[13px] font-medium',
          'bg-surface-elevated hairline text-ink-primary hover:border-hairline transition-colors',
        )}
      >
        {buttonLabel}
        <ChevronDown size={13} className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-56
                        card-elevated p-1.5 max-h-[320px] overflow-y-auto">
          {options.length === 0 && (
            <div className="text-xs text-ink-muted px-2 py-1.5">No options</div>
          )}
          {options.map((o) => {
            const active = activeSet.has(o.id);
            return (
              <button
                key={o.id}
                onClick={() => onToggle(o.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px]
                           text-ink-secondary hover:text-ink-primary hover:bg-surface-hover
                           transition-colors"
              >
                <span
                  className="h-3.5 w-3.5 rounded-sm grid place-items-center border shrink-0"
                  style={{
                    borderColor: active ? (o.color || 'var(--accent-blue-strong)') : 'var(--border-strong)',
                    background: active ? (o.color || 'var(--accent-blue-strong)') : 'transparent',
                  }}
                >
                  {active && <Check size={9} className="text-white" strokeWidth={3} />}
                </span>
                {o.color && (
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.color }} />
                )}
                <span className="flex-1 text-left truncate font-mono">{o.label}</span>
                <span className="text-[10px] text-ink-muted num shrink-0">{o.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
