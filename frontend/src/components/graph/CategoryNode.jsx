import { memo } from 'react';
import { Handle, Position } from 'reactflow';

import { cn } from '../../lib/cn.js';
import { languageTag, withAlpha } from '../../utils/nodeCategories.js';

/**
 * File node — compact card with a colored language badge on the left,
 * filename bold, path muted. Matches the reference design's file chips.
 *
 * data: { raw, category, title, subtitle, dimmed, highlighted }
 */
function CategoryNode({ data, selected }) {
  const color = data.category.color;
  const dim = data.dimmed;
  const hl = data.highlighted || selected;
  const tag = languageTag(data.raw?.language);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-2 py-1.5 rounded-md',
        'bg-surface-elevated border transition-all duration-fast ease-out',
        'w-[152px] h-[44px]',
        dim ? 'opacity-20' : 'opacity-100',
        hl ? 'scale-[1.03]' : 'hover:scale-[1.02] hover:border-hairline-strong',
      )}
      style={{
        borderColor: hl ? color : 'var(--border-subtle)',
        boxShadow: hl
          ? `0 0 0 1px ${color}, 0 8px 22px ${withAlpha(color, '55')}`
          : '0 1px 2px rgba(0,0,0,0.4)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span
        className="h-6 w-8 shrink-0 rounded grid place-items-center text-[10px] font-bold font-mono"
        style={{ background: withAlpha(color, '20'), color }}
      >
        {tag}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-ink-primary truncate leading-tight">
          {data.title}
        </div>
        <div className="text-[10px] text-ink-muted font-mono truncate leading-tight mt-0.5">
          {data.subtitle}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, width: 5, height: 5, border: 'none', opacity: 0.6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 5, height: 5, border: 'none', opacity: 0.6 }}
      />
    </div>
  );
}

export default memo(CategoryNode);
