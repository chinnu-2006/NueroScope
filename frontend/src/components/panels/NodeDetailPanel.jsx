import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, FolderTree, FileCode2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Badge from '../ui/Badge.jsx';
import Card, { CardHeader } from '../ui/Card.jsx';
import { getFileDetail } from '../../services/analysisApi.js';
import { deriveCategory, languageTag, withAlpha } from '../../utils/nodeCategories.js';
import { withCommas } from '../../utils/formatters.js';

/**
 * Right slide-in panel with node details. Matches the reference layout:
 *   Header (badge + name + path + category chip)
 *   Stat rows (Lines, Complexity, Deps, Dependents)
 *   Description
 *   Dependencies list (JS icon + path)
 *   Dependents list (JS icon + path)
 *   AI Explanation card with a gradient "Ask AI about this file" CTA
 */
export default function NodeDetailPanel({ repoId, nodeMeta, onClose }) {
  const open = Boolean(nodeMeta);
  const isFile = Boolean(nodeMeta?.isFile);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="panel"
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-4 top-4 bottom-4 w-[380px] z-20
                     card-elevated flex flex-col overflow-hidden"
        >
          <header className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-semibold">Node Details</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md text-ink-secondary hover:bg-surface-hover hover:text-ink-primary
                         transition-colors"
              aria-label="Close"
            >
              <X size={16} className="mx-auto" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {isFile ? (
              <FilePanel repoId={repoId} nodeMeta={nodeMeta} />
            ) : (
              <GroupPanel nodeMeta={nodeMeta} />
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}


// ── FILE MODE ─────────────────────────────────────────────────────────
function FilePanel({ repoId, nodeMeta }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!repoId || !nodeMeta?.id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getFileDetail(repoId, nodeMeta.id, 'intermediate')
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setError(e?.message || 'Failed to load file'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoId, nodeMeta?.id]);

  const category = detail ? deriveCategory(detail) : nodeMeta?.category;
  const color = category?.color;
  const tag = languageTag(detail?.language ?? nodeMeta?.raw?.language ?? 'JavaScript');

  return (
    <>
      {/* Header block */}
      <div className="flex items-start gap-3">
        <span
          className="h-11 w-14 rounded-md grid place-items-center shrink-0 text-[11px] font-bold font-mono"
          style={{ background: withAlpha(color, '20'), color }}
        >
          {tag}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink-primary truncate">
            {detail?.name ?? nodeMeta?.title}
          </h3>
          <p className="text-[11px] text-ink-muted font-mono mt-0.5 truncate">
            {detail?.path ?? nodeMeta?.subtitle}
          </p>
          <div className="mt-2">
            <Badge
              variant="subtle"
              className="!bg-[color:var(--accent-purple)]/12 !text-[color:var(--accent-purple)] !border-[color:var(--accent-purple)]/30"
            >
              {category?.label ?? 'File'}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-[color:var(--accent-red)]/30">
          <p className="text-sm text-[color:var(--accent-red)]">{error}</p>
        </Card>
      )}

      {loading && !detail && <Skeletons />}

      {detail && (
        <>
          <StatRow label="Lines of Code"        value={withCommas(detail.lines)} />
          <StatRow label="Cyclomatic Complexity" value={detail.complexity.toFixed(1)} />
          <StatRow label="Dependencies"          value={detail.dependencies?.length ?? 0} />
          <StatRow label="Dependents"            value={detail.dependents?.length ?? 0} />

          <Section title="Description">
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              {detail.ai_explanation}
            </p>
          </Section>

          <FileLinkList
            title="Dependencies"
            items={detail.dependencies}
            emptyText="No outgoing imports."
          />
          <FileLinkList
            title="Dependents"
            items={detail.dependents}
            emptyText="Not imported by any file in this repo."
          />

          {/* AI Explanation card (reference-matching CTA) */}
          <Card className="!p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[color:var(--accent-purple)]" />
              <span className="text-sm font-semibold text-ink-primary">AI Explanation</span>
            </div>
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              {detail.ai_explanation}
            </p>
            <button
              onClick={() => navigate('/assistant')}
              className="btn-primary mt-3 w-full h-9 text-sm font-medium
                         inline-flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              Ask AI about this file
            </button>
          </Card>
        </>
      )}
    </>
  );
}


// ── FOLDER / MODULE MODE ──────────────────────────────────────────────
function GroupPanel({ nodeMeta }) {
  const category = nodeMeta?.category;
  const Icon = category?.icon;
  const g = nodeMeta?.groupInfo || {};
  const color = category?.color;

  return (
    <>
      <div className="flex items-start gap-3">
        <span
          className="h-11 w-11 rounded-lg grid place-items-center shrink-0"
          style={{ background: withAlpha(color, '20'), color }}
        >
          {Icon ? <Icon size={20} strokeWidth={2} /> : null}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink-primary truncate">
            {nodeMeta.title}
          </h3>
          <p className="text-[11px] text-ink-muted font-mono mt-0.5 truncate">
            {nodeMeta.subtitle || category?.label}
          </p>
          <div className="mt-2">
            <Badge variant="subtle">{category?.label}</Badge>
          </div>
        </div>
      </div>

      {g.fileCount != null && <StatRow label="Contained files" value={g.fileCount} />}
      {g.language && <StatRow label="Dominant language" value={g.language} />}
      {g.lines ? <StatRow label="Total lines" value={withCommas(g.lines)} /> : null}

      <Section title="Contents">
        {g.samplePaths?.length ? (
          <ul className="space-y-1.5 max-h-[240px] overflow-y-auto">
            {g.samplePaths.map((p) => (
              <li
                key={p}
                className="text-[11px] font-mono text-ink-secondary truncate"
                title={p}
              >
                {p}
              </li>
            ))}
            {g.fileCount > g.samplePaths.length && (
              <li className="text-[11px] text-ink-muted italic">
                + {g.fileCount - g.samplePaths.length} more
              </li>
            )}
          </ul>
        ) : (
          <p className="text-[12px] text-ink-muted">Click a file inside to see its details.</p>
        )}
      </Section>
    </>
  );
}


// ── shared bits ───────────────────────────────────────────────────────
function Skeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 rounded-md bg-white/[0.03] animate-pulse" />
      ))}
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-hairline-subtle last:border-b-0">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <span className="text-[13px] font-semibold text-ink-primary num">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function FileLinkList({ title, items, emptyText }) {
  const items_ = items || [];
  const shown = items_.slice(0, 5);
  const overflow = items_.length - shown.length;

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-2 flex items-center gap-2">
        {title}
        <span className="text-ink-muted num">({items_.length})</span>
      </div>
      {items_.length === 0 ? (
        <p className="text-[12px] text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((d, i) => {
            const path = d.path || '';
            const name = path.split('/').pop() || path;
            const parent = path.slice(0, path.length - name.length - 1);
            const tag = guessTag(name);
            return (
              <li key={d.id || i} className="flex items-start gap-2">
                <span
                  className="h-5 w-7 shrink-0 rounded grid place-items-center text-[9px] font-bold font-mono mt-0.5"
                  style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue-strong)' }}
                >
                  {tag}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-mono text-ink-primary truncate">{name}</div>
                  {parent && (
                    <div className="text-[10px] font-mono text-ink-muted truncate">{parent}</div>
                  )}
                </div>
              </li>
            );
          })}
          {overflow > 0 && (
            <li className="text-[11px] text-ink-muted pl-9">… and {overflow} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

function guessTag(filename) {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.tsx') || lower.endsWith('.ts')) return 'TS';
  if (lower.endsWith('.jsx') || lower.endsWith('.js') || lower.endsWith('.mjs')) return 'JS';
  if (lower.endsWith('.py')) return 'PY';
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'CSS';
  if (lower.endsWith('.json')) return '{}';
  if (lower.endsWith('.md')) return 'MD';
  return '••';
}
