import { FileCode2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/** A small pill that shows a cited file and its extract. */
export default function CitationChip({ citation, onClick, className }) {
  const path = citation.file_path || '';
  const name = path.split('/').pop() || path;
  const extract = citation.extract || citation.chunk_type;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group inline-flex items-center gap-2 text-left px-2.5 h-7 rounded-md',
        'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06]',
        'transition-colors duration-fast ease-out',
        className,
      )}
      title={path}
    >
      <FileCode2 size={13} className="text-ink-muted group-hover:text-ink-primary shrink-0" />
      <span className="text-[12px] font-mono font-medium text-ink-primary max-w-[180px] truncate">
        {name}
      </span>
      {extract && (
        <span className="text-[11px] text-ink-muted max-w-[240px] truncate">– {extract}</span>
      )}
      {citation.score != null && (
        <span className="text-[10px] text-ink-muted num ml-1">{citation.score.toFixed(2)}</span>
      )}
    </button>
  );
}
