import { useState } from 'react';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import CitationChip from '../chat/CitationChip.jsx';
import { useSearch } from '../../hooks/useSearch.js';

/**
 * Inline AI Code Assistant that sits at the bottom of the graph page.
 * A single question → semantic search → chip list of hit files. Chip
 * click bubbles the file_id up so the graph page can select the matching
 * node in the canvas.
 */
export default function GraphAIAssistant({ onCitationClick }) {
  const { hits, loading, error, query, run, clear } = useSearch();
  const [input, setInput] = useState('Where is user authentication handled?');

  const onSubmit = (e) => {
    e?.preventDefault?.();
    run(input, 5);
  };

  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-md grid place-items-center
                         bg-[color:var(--accent-purple)]/15 text-[color:var(--accent-purple)]">
          <Sparkles size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-primary">AI Code Assistant</div>
          <div className="text-[11px] text-ink-muted">Ask about this codebase in natural language</div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Where is user authentication handled?"
          className="flex-1 h-10 px-3 rounded-md bg-surface-base hairline outline-none text-sm
                     text-ink-primary placeholder:text-ink-muted
                     focus:border-[color:var(--accent-blue)]
                     focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!input.trim() || loading}
          className="gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Search
        </Button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-[color:var(--accent-red)]">{error}</p>
      )}

      {!loading && hits.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2 text-[12px] text-ink-secondary">
            <CheckCircle2 size={13} className="text-[color:var(--accent-emerald)]" />
            Found <span className="text-ink-primary font-semibold">{hits.length}</span> relevant file{hits.length === 1 ? '' : 's'}:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hits.map((h, i) => (
              <CitationChip
                key={i}
                citation={h}
                onClick={() => onCitationClick?.(h)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
