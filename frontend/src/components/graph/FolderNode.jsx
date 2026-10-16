import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { withAlpha } from '../../utils/nodeCategories.js';

/**
 * Folder node — colored folder-icon tile on the left, name + path.
 * Optional collapse chevron when `data.onToggleCollapse` is provided.
 *
 * data: { raw, category, title, subtitle, dimmed, highlighted,
 *         collapsed?, onToggleCollapse? }
 */
function FolderNode({ data, selected }) {
  const Icon = data.category.icon;
  const color = data.category.color;
  const dim = data.dimmed;
  const hl = data.highlighted || selected;
  const collapsible = typeof data.onToggleCollapse === 'function';
  const Chevron = data.collapsed ? ChevronRight : ChevronDown;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-2.5 py-2 rounded-md',
        'border transition-all duration-fast ease-out w-[152px] h-[52px]',
        dim ? 'opacity-20' : 'opacity-100',
        hl ? 'scale-[1.03]' : 'hover:scale-[1.02]',
      )}
      style={{
        background: `linear-gradient(135deg, ${withAlpha(color, '18')}, ${withAlpha(color, '05')})`,
        borderColor: hl ? color : withAlpha(color, '44'),
        boxShadow: hl
          ? `0 0 0 1px ${color}, 0 10px 26px ${withAlpha(color, '55')}`
          : `0 4px 14px rgba(0,0,0,0.35)`,
      }}
    >
      <span
        className="h-8 w-8 shrink-0 rounded-md grid place-items-center"
        style={{ background: withAlpha(color, '28'), color }}
      >
        <Icon size={15} strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-ink-primary truncate leading-tight">
          {data.title || '/'}
        </div>
        <div className="text-[10px] text-ink-muted font-mono truncate mt-0.5">
          {data.subtitle}
        </div>
      </div>

      {collapsible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse();
          }}
          className="shrink-0 h-5 w-5 rounded grid place-items-center text-ink-muted
                     hover:text-ink-primary hover:bg-white/10 transition-colors"
          aria-label={data.collapsed ? 'Expand' : 'Collapse'}
        >
          <Chevron size={13} />
        </button>
      )}

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

export default memo(FolderNode);
