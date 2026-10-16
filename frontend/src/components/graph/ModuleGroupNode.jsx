import { memo } from 'react';
import { Handle, Position } from 'reactflow';

import { cn } from '../../lib/cn.js';
import { withAlpha } from '../../utils/nodeCategories.js';

/**
 * A bigger, more architecture-diagram-looking node for Module Architecture
 * mode. Shows module name + dominant language + file count.
 */
function ModuleGroupNode({ data, selected }) {
  const Icon = data.category.icon;
  const color = data.category.color;
  const dim = data.dimmed;
  const hl = data.highlighted || selected;

  return (
    <div
      className={cn(
        'relative w-[260px] h-[96px] px-4 rounded-lg flex items-center gap-3',
        'bg-surface-elevated border transition-all duration-base ease-out',
        dim ? 'opacity-20' : 'opacity-100',
      )}
      style={{
        borderColor: hl ? color : 'var(--border-subtle)',
        boxShadow: hl
          ? `0 0 0 1px ${color}, 0 10px 30px ${withAlpha(color, '55')}`
          : `0 6px 18px rgba(0,0,0,0.35)`,
        background: `linear-gradient(135deg, ${withAlpha(color, '0d')}, transparent 60%), var(--bg-elevated)`,
      }}
    >
      <span
        className="h-11 w-11 rounded-lg grid place-items-center shrink-0"
        style={{ background: withAlpha(color, '22'), color }}
      >
        <Icon size={22} strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-ink-primary truncate leading-tight">
          {data.title}
        </div>
        <div className="text-[11px] text-ink-muted mt-1 flex items-center gap-1.5">
          <span className="font-mono">{data.language}</span>
          <span className="text-ink-muted/60">·</span>
          <span className="num">{data.fileCount ?? 0}</span>
          <span>files</span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, width: 10, height: 10, border: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, width: 10, height: 10, border: 'none' }}
      />
    </div>
  );
}

export default memo(ModuleGroupNode);
