import { MousePointer2, Hand, ZoomIn, Maximize, Repeat } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * Left-side icon toolbar overlaid on the canvas — pointer / pan / zoom-in /
 * fit-view / re-layout. Only fit + re-layout have real handlers; the tool-
 * mode buttons are decorative for now (React Flow controls pan/zoom itself
 * via mouse gestures).
 */
export default function GraphIconToolbar({
  mode,
  onMode,
  onZoomIn,
  onFitView,
  onRelayout,
}) {
  const TOOLS = [
    { id: 'select', icon: MousePointer2, title: 'Select', onClick: () => onMode?.('select') },
    { id: 'pan',    icon: Hand,          title: 'Pan',    onClick: () => onMode?.('pan') },
    { id: 'zoom',   icon: ZoomIn,        title: 'Zoom in',onClick: onZoomIn },
    { id: 'fit',    icon: Maximize,      title: 'Fit view', onClick: onFitView },
    { id: 'relay',  icon: Repeat,        title: 'Re-layout', onClick: onRelayout },
  ];

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col p-1 rounded-md
                    bg-surface-elevated/90 backdrop-blur border border-hairline-subtle
                    shadow-card">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const isActive = mode === t.id;
        return (
          <button
            key={t.id}
            onClick={t.onClick}
            title={t.title}
            className={cn(
              'h-8 w-8 rounded grid place-items-center transition-colors',
              isActive
                ? 'bg-[color:var(--accent-purple)]/15 text-[color:var(--accent-purple)]'
                : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
            )}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
