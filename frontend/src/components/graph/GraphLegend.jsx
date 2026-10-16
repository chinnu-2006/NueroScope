import { CATEGORIES, LEGEND } from '../../utils/nodeCategories.js';

/** Horizontal color-key row shown above the canvas. */
export default function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {LEGEND.map((id) => {
        const c = CATEGORIES[id];
        return (
          <span key={id} className="inline-flex items-center gap-2 text-xs text-ink-secondary">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: c.color }}
              aria-hidden="true"
            />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
