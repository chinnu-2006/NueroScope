import { useMemo, useState } from 'react';
import {
  ShieldAlert,
  FileCode2,
  Braces,
  Boxes,
  GitFork,
  Repeat,
  EyeOff,
  Gauge,
} from 'lucide-react';

import Badge from '../components/ui/Badge.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import LevelSwitcher from '../components/chat/LevelSwitcher.jsx';
import PhasePlaceholder from '../components/loading/PhasePlaceholder.jsx';
import Skeleton from '../components/loading/Skeleton.jsx';
import { useRisks } from '../hooks/useRisks.js';
import { cn } from '../lib/cn.js';

const CATEGORY_META = {
  large_file:          { label: 'Large Files',          icon: FileCode2, color: 'var(--accent-red)' },
  complex_function:    { label: 'Complex Functions',    icon: Braces,    color: 'var(--accent-amber)' },
  large_class:         { label: 'Large Classes',        icon: Boxes,     color: 'var(--accent-purple)' },
  high_coupling:       { label: 'High Coupling',        icon: GitFork,   color: 'var(--accent-blue-strong)' },
  circular_dependency: { label: 'Circular Dependencies', icon: Repeat,   color: 'var(--accent-red)' },
  unused_file:         { label: 'Unused Files',         icon: EyeOff,    color: 'var(--ink-muted)' },
};

const SEV_BADGE = {
  high:   { variant: 'red',     label: 'High' },
  medium: { variant: 'amber',   label: 'Medium' },
  low:    { variant: 'default', label: 'Low' },
};

const RISK_LEVEL_META = {
  low:      { label: 'Low Risk',      variant: 'emerald' },
  moderate: { label: 'Moderate Risk', variant: 'amber' },
  high:     { label: 'High Risk',     variant: 'red' },
};


export default function RiskAnalysis() {
  const { data, loading, hasRepo } = useRisks();
  const [level, setLevel] = useState('intermediate');
  const [filter, setFilter] = useState('all');

  if (!hasRepo) {
    return (
      <PhasePlaceholder
        icon={ShieldAlert}
        title="Risk Analysis"
        subtitle="Analyze a repository to surface large files, complex functions, coupling hotspots, cycles, and dead code."
      />
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldAlert size={22} className="text-[color:var(--accent-amber)]" />
          Risk Analysis
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const { score, level: risk_level, counts, findings } = data;
  const riskMeta = RISK_LEVEL_META[risk_level] ?? RISK_LEVEL_META.moderate;
  const filtered = filter === 'all' ? findings : findings.filter((f) => f.category === filter);

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldAlert size={22} className="text-[color:var(--accent-amber)]" />
            Risk Analysis
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Detected risks across the repository, with level-conditioned improvement suggestions.
          </p>
        </div>
        <LevelSwitcher value={level} onChange={setLevel} />
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Gauge size={14} className="text-[color:var(--accent-blue-strong)]" />Overall Risk</span>}
          />
          <div className="flex items-end gap-3">
            <div className="text-4xl font-semibold num">
              {score.toFixed(1)}
              <span className="text-lg text-ink-muted ml-1">/10</span>
            </div>
            <Badge variant={riskMeta.variant} className="mb-1.5">{riskMeta.label}</Badge>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[color:var(--accent-emerald)] via-[color:var(--accent-amber)] to-[color:var(--accent-red)]"
              style={{ width: `${Math.min(100, (score / 10) * 100)}%` }}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Findings" />
          <div className="text-4xl font-semibold num">{counts.total}</div>
          <div className="flex gap-2 mt-3">
            {['high', 'medium', 'low'].map((s) => (
              <Badge key={s} variant={SEV_BADGE[s].variant}>
                {counts.by_severity[s] || 0} {SEV_BADGE[s].label}
              </Badge>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Categories" subtitle="Click a chip to filter" />
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip
              id="all"
              label="All"
              count={counts.total}
              color="var(--ink-secondary)"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            {Object.entries(counts.by_category).map(([cat, n]) => {
              const meta = CATEGORY_META[cat] || { label: cat, color: 'var(--ink-muted)' };
              return (
                <CategoryChip
                  key={cat}
                  id={cat}
                  label={meta.label}
                  count={n}
                  color={meta.color}
                  active={filter === cat}
                  onClick={() => setFilter(cat)}
                />
              );
            })}
          </div>
        </Card>
      </div>

      {/* Findings list */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-ink-secondary">
            <span className="text-ink-primary font-semibold">{filtered.length}</span> finding{filtered.length === 1 ? '' : 's'}
            {filter !== 'all' && (
              <>
                {' '}in <span className="text-ink-primary">{CATEGORY_META[filter]?.label ?? filter}</span>
              </>
            )}
          </p>
        </div>

        {filtered.length === 0 && (
          <Card><p className="text-sm text-ink-muted">Nothing to report here. Clean.</p></Card>
        )}

        <div className="space-y-3">
          {filtered.map((f, i) => (
            <FindingCard key={i} finding={f} level={level} />
          ))}
        </div>
      </div>
    </div>
  );
}


function CategoryChip({ label, count, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium border transition-colors',
        active ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-primary',
      )}
      style={{
        background: active ? `${color}18` : 'transparent',
        borderColor: active ? `${color}55` : 'var(--border-subtle)',
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
      <span className="text-ink-muted num">{count}</span>
    </button>
  );
}


function FindingCard({ finding, level }) {
  const meta = CATEGORY_META[finding.category] ?? { label: finding.category, icon: ShieldAlert, color: 'var(--ink-muted)' };
  const Icon = meta.icon;
  const suggestion = finding.suggestions?.[level] || finding.suggestions?.intermediate;

  return (
    <Card className="hover:border-hairline-strong transition-colors">
      <div className="flex items-start gap-3">
        <span
          className="h-9 w-9 rounded-md grid place-items-center shrink-0"
          style={{ background: `${meta.color}20`, color: meta.color }}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink-primary">{meta.label}</span>
            <Badge variant={SEV_BADGE[finding.severity].variant}>
              {SEV_BADGE[finding.severity].label}
            </Badge>
            {finding.metric != null && finding.category !== 'unused_file' && (
              <span className="text-[11px] text-ink-muted num">metric: {finding.metric}</span>
            )}
          </div>
          <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
            {finding.description}
          </p>
          {suggestion && (
            <div
              className="mt-3 rounded-md px-3 py-2 text-[13px] leading-relaxed border"
              style={{
                background: `${meta.color}10`,
                borderColor: `${meta.color}30`,
                color: 'var(--text-primary)',
              }}
            >
              <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-1">
                Suggestion · {level}
              </div>
              {suggestion}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
