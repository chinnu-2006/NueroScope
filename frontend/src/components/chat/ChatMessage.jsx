import { Sparkles, User } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import CitationChip from './CitationChip.jsx';

/**
 * A single chat message. Left-aligned; role determined by avatar + color.
 * `msg` = { role, text, citations?, level?, provider?, error? }
 */
export default function ChatMessage({ msg, onCitationClick }) {
  const isUser = msg.role === 'user';
  const isError = msg.error;

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'h-8 w-8 rounded-md grid place-items-center shrink-0 mt-0.5',
          isUser
            ? 'bg-gradient-primary text-white'
            : 'bg-[color:var(--accent-purple)]/15 text-[color:var(--accent-purple)]',
        )}
      >
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-ink-primary">
            {isUser ? 'You' : 'NeuroScope AI'}
          </span>
          {msg.level && (
            <span className="text-[10px] uppercase tracking-wider text-ink-muted">
              {msg.level}
            </span>
          )}
          {msg.provider === 'mock' && !isUser && (
            <span className="text-[10px] text-[color:var(--accent-amber)]">mock fallback</span>
          )}
        </div>
        <div
          className={cn(
            'text-sm leading-relaxed whitespace-pre-wrap',
            isError ? 'text-[color:var(--accent-red)]' : 'text-ink-primary/95',
          )}
        >
          {msg.text}
        </div>
        {msg.citations?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {msg.citations.map((c, i) => (
              <CitationChip key={i} citation={c} onClick={() => onCitationClick?.(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
