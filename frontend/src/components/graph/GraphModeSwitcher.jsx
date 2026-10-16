import { GitFork, FolderTree, Boxes, TreePine, Workflow } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const MODES = [
  { id: 'file',     label: 'File Dependency',    icon: GitFork,   hint: 'Import graph across every source file' },
  { id: 'folder',   label: 'Folder Structure',   icon: FolderTree,hint: 'Directory tree — how the repo is laid out' },
  { id: 'module',   label: 'Module Architecture',icon: Boxes,     hint: 'High-level view with modules and their dependencies' },
  { id: 'tree',     label: 'Component Tree',     icon: TreePine,  hint: 'React component hierarchy — renders + hook usage' },
  { id: 'callgraph',label: 'Function Call Graph',icon: Workflow,  hint: 'Function/method-level call graph — who calls what' },
];

export default function GraphModeSwitcher({ value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            title={m.hint}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3 rounded-md text-[13px] font-medium',
              'border transition-all duration-fast ease-out',
              active
                ? 'bg-[color:var(--accent-purple)]/12 text-ink-primary border-[color:var(--accent-purple)]/40 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25)]'
                : 'bg-surface-elevated text-ink-secondary border-hairline-subtle hover:text-ink-primary hover:border-hairline',
            )}
          >
            <Icon
              size={14}
              strokeWidth={active ? 2.2 : 1.75}
              style={{ color: active ? 'var(--accent-purple)' : undefined }}
            />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
