import { useState } from 'react';
import { Search, FileCode2, Sparkles } from 'lucide-react';

import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import PhasePlaceholder from '../components/loading/PhasePlaceholder.jsx';
import AIReadinessBanner from '../components/panels/AIReadinessBanner.jsx';
import { useSearch } from '../hooks/useSearch.js';

const EXAMPLES = [
  'user authentication',
  'database connection',
  'error handling',
  'unit tests',
  'API routing',
];

export default function SemanticSearch() {
  const { query, hits, loading, error, run, hasRepo } = useSearch();
  const [input, setInput] = useState('');

  if (!hasRepo) {
    return (
      <PhasePlaceholder
        icon={Search}
        title="Semantic Search"
        subtitle="Search by meaning, not just keywords. Analyze a repository first."
      />
    );
  }

  const onSubmit = (e) => {
    e?.preventDefault?.();
    run(input);
  };

  const kickExample = (q) => {
    setInput(q);
    run(q);
  };

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
        <Search size={22} className="text-[color:var(--accent-blue-strong)]" />
        Semantic Search
      </h1>
      <p className="text-sm text-ink-secondary mt-1">
        Ask in natural language — results are ranked by meaning, not just filename matches.
      </p>

      <div className="mt-6">
        <AIReadinessBanner />
      </div>

      {/* Search input */}
      <form onSubmit={onSubmit} className="mt-2">
        <div className="flex items-center gap-2 h-12 px-4 rounded-lg bg-surface-elevated hairline
                        focus-within:border-[color:var(--accent-blue)]
                        focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]">
          <Sparkles size={16} className="text-[color:var(--accent-blue-strong)]" />
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try "where is authentication handled?"'
            className="flex-1 bg-transparent outline-none text-sm text-ink-primary placeholder:text-ink-muted"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary h-8 px-4 text-sm font-medium disabled:opacity-40"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {/* Examples */}
      {hits.length === 0 && !loading && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-muted mr-1">Try:</span>
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => kickExample(q)}
              className="text-xs h-7 px-2.5 rounded-md hairline text-ink-secondary
                         hover:text-ink-primary hover:bg-surface-hover transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && (
        <Card className="mt-6 border-[color:var(--accent-red)]/30">
          <p className="text-sm text-[color:var(--accent-red)]">{error}</p>
        </Card>
      )}

      {hits.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-secondary">
              <span className="text-ink-primary font-semibold">{hits.length}</span> match{hits.length === 1 ? '' : 'es'} for{' '}
              <span className="font-mono text-ink-primary">"{query}"</span>
            </p>
          </div>
          <div className="space-y-3">
            {hits.map((h) => (
              <ResultCard key={h.file_id + h.chunk_type + h.name} hit={h} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ hit }) {
  const path = hit.file_path;
  const name = path.split('/').pop();
  return (
    <Card className="hover:border-[color:var(--accent-blue)]/40 transition-colors cursor-default">
      <div className="flex items-start gap-3">
        <span className="h-9 w-9 rounded-md grid place-items-center shrink-0
                         bg-[color:var(--accent-blue)]/12 text-[color:var(--accent-blue-strong)]">
          <FileCode2 size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink-primary truncate">{name}</div>
              <div className="text-[11px] text-ink-muted font-mono truncate mt-0.5">{path}</div>
            </div>
            <ScorePill score={hit.score} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
            <Badge variant="subtle">{hit.chunk_type}</Badge>
            {hit.name && (
              <span className="font-mono text-ink-secondary">{hit.name}</span>
            )}
          </div>
          {hit.extract && (
            <p className="mt-3 text-sm text-ink-secondary leading-relaxed">{hit.extract}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ScorePill({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const variant =
    pct >= 65 ? 'emerald' : pct >= 45 ? 'blue' : 'default';
  return <Badge variant={variant}>{pct}% match</Badge>;
}
