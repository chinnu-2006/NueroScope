import { AlertCircle, Rocket, Sparkles } from 'lucide-react';

import Button from '../ui/Button.jsx';
import { useAIStatus } from '../../hooks/useAIStatus.js';
import { useJob } from '../../hooks/useJob.jsx';
import { useRepo } from '../../hooks/useRepo.jsx';

/**
 * Compact status banner shown at the top of the AI Assistant and
 * Semantic Search pages. Explains why the index might not be ready and
 * offers a one-click re-analyze.
 */
export default function AIReadinessBanner() {
  const { indexReady, chunkable, provider } = useAIStatus();
  const { repoUrl } = useRepo();
  const { analyze, running } = useJob();

  // Index on disk and provider live → nothing to show.
  if (indexReady) return null;

  // Not yet loaded → don't flash a banner.
  if (indexReady === undefined) return null;

  const needsReanalyze = !chunkable;
  const color = needsReanalyze ? 'var(--accent-amber)' : 'var(--accent-blue-strong)';
  const Icon = needsReanalyze ? AlertCircle : Sparkles;

  return (
    <div
      className="mb-6 rounded-lg px-4 py-3 flex items-start gap-3 border"
      style={{ background: `${color}10`, borderColor: `${color}40` }}
    >
      <span
        className="h-8 w-8 rounded-md grid place-items-center shrink-0 mt-0.5"
        style={{ background: `${color}20`, color }}
      >
        <Icon size={16} />
      </span>
      <div className="flex-1 min-w-0">
        {needsReanalyze ? (
          <>
            <p className="text-sm font-semibold text-ink-primary">
              This repository needs to be re-analyzed
            </p>
            <p className="text-[13px] text-ink-secondary mt-1 leading-relaxed">
              It was analyzed before the deep JS/TS parser was added, so no
              embeddings exist yet. Click <em>Re-analyze</em> below to parse the
              source and build the AI index (about a minute for a small repo).
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink-primary">
              First AI query may take a moment
            </p>
            <p className="text-[13px] text-ink-secondary mt-1 leading-relaxed">
              The search index for this repo hasn't been built yet — it'll get
              built on your first question. Subsequent questions are instant.
            </p>
          </>
        )}
      </div>
      {needsReanalyze && repoUrl && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => analyze(repoUrl)}
          disabled={running}
          className="shrink-0"
        >
          <Rocket size={14} />
          Re-analyze
        </Button>
      )}
    </div>
  );
}
