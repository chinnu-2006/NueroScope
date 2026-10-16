import { Maximize2, LayoutDashboard, Minimize, Expand } from 'lucide-react';
import Button from '../ui/Button.jsx';

/** Fit-view / re-layout / expand-all / collapse-all toolbar (top-right). */
export default function GraphToolbar({
  onFitView,
  onLayout,
  onExpandAll,
  onCollapseAll,
  collapsible = false,
}) {
  return (
    <div className="flex items-center gap-2">
      {collapsible && (
        <>
          <Button variant="secondary" size="sm" onClick={onExpandAll}>
            <Expand size={13} />
            Expand All
          </Button>
          <Button variant="secondary" size="sm" onClick={onCollapseAll}>
            <Minimize size={13} />
            Collapse All
          </Button>
        </>
      )}
      <Button variant="secondary" size="sm" onClick={onFitView}>
        <Maximize2 size={13} />
        Fit View
      </Button>
      <Button variant="secondary" size="sm" onClick={onLayout}>
        <LayoutDashboard size={13} />
        Layout
      </Button>
    </div>
  );
}
