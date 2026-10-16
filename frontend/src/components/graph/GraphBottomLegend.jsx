import { CATEGORIES, LEGEND } from '../../utils/nodeCategories.js';

/** Bottom-of-canvas legend row. Matches the reference. */
export default function GraphBottomLegend() {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10
                    flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-4 py-2
                    rounded-md bg-surface-elevated/90 backdrop-blur border border-hairline-subtle
                    shadow-card pointer-events-none">
      {LEGEND.map((id) => {
        const c = CATEGORIES[id];
        return (
          <span key={id} className="inline-flex items-center gap-1.5 text-[11px] text-ink-secondary">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: c.color, boxShadow: `0 0 6px ${c.color}88` }}
            />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
