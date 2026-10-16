import {
  FileCode2,
  Boxes,
  FunctionSquare,
  Component,
  GitFork,
  Type,
  Sparkles,
  Activity,
  Gauge,
  ShieldAlert,
} from 'lucide-react';

import Badge from '../components/ui/Badge.jsx';
import MetricStat from '../components/widgets/MetricStat.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import { sampleRepo } from '../utils/mockData.js';
import { withCommas, relativeTime } from '../utils/formatters.js';
import { useOverview } from '../hooks/useOverview.js';

export default function Overview() {
  const { data, loading, hasRepo } = useOverview();
  const overview = data ?? sampleRepo;
  const s = overview.stats;
  const isReal = Boolean(data);

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-ink-muted font-mono">{overview.owner}/</p>
            {!isReal && !hasRepo && (
              <Badge variant="subtle">Sample data — analyze a repo to see real data</Badge>
            )}
            {loading && <Badge variant="blue" dot>Loading…</Badge>}
          </div>
          <h1 className="text-[28px] font-semibold text-ink-primary mt-1 leading-tight">
            {overview.name}
          </h1>
          <p className="text-ink-secondary mt-2 max-w-2xl text-sm leading-relaxed">
            {overview.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 max-w-md">
          {overview.languages.slice(0, 5).map((l) => (
            <Badge key={l.name} variant="subtle" dot>
              {l.name}
              <span className="text-ink-muted num ml-1">{l.share}%</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricStat icon={FileCode2} label="Files" value={withCommas(s.files)} accent="blue" />
        <MetricStat icon={Boxes} label="Services" value={s.services} accent="cyan" />
        <MetricStat icon={FunctionSquare} label="Functions" value={withCommas(s.functions)} accent="emerald" />
        <MetricStat icon={Component} label="Classes" value={s.classes} accent="purple" />
        <MetricStat icon={GitFork} label="Dependencies" value={s.dependencies} accent="amber" />
        <MetricStat icon={Type} label="Total Lines" value={withCommas(s.totalLines)} accent="red" />
      </div>

      {/* Two-column: AI summary + activity */}
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <AISummaryCard summary={overview.aiSummary} isReal={isReal} />
          <LanguageDistribution languages={overview.languages} />
          <ScoresRow complexity={overview.complexityScore} risk={overview.riskLevel} />
        </div>

        <RecentActivity items={overview.recentActivity} />
      </div>
    </div>
  );
}

function AISummaryCard({ summary, isReal }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles size={16} className="text-[color:var(--accent-purple)]" />
            AI Summary
          </span>
        }
        subtitle={isReal ? 'Generated from parsed structure' : 'Generated from parsed structure (sample)'}
        right={<Badge variant="purple">Learning: Intermediate</Badge>}
      />
      <p className="text-sm text-ink-secondary leading-relaxed">{summary}</p>
    </Card>
  );
}

function LanguageDistribution({ languages }) {
  if (!languages?.length) return null;
  return (
    <Card>
      <CardHeader title="Languages" subtitle="Share of source lines" />
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        {languages.map((l) => (
          <div
            key={l.name}
            style={{ width: `${l.share}%`, background: l.color }}
            title={`${l.name} · ${l.share}%`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {languages.slice(0, 8).map((l) => (
          <li key={l.name} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            <span className="text-ink-secondary">{l.name}</span>
            <span className="ml-auto text-ink-muted num">{l.share}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ScoresRow({ complexity, risk }) {
  const riskMeta = {
    low: { label: 'Low Risk', variant: 'emerald' },
    moderate: { label: 'Moderate Risk', variant: 'amber' },
    high: { label: 'High Risk', variant: 'red' },
  }[risk] ?? { label: 'Unknown', variant: 'default' };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Gauge size={16} className="text-[color:var(--accent-blue-strong)]" />
              Complexity Score
            </span>
          }
        />
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-semibold num">
              {complexity.toFixed(1)}
              <span className="text-lg text-ink-muted ml-1">/10</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">Median function complexity</p>
          </div>
          <div className="w-32 h-2 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[color:var(--accent-emerald)] via-[color:var(--accent-amber)] to-[color:var(--accent-red)]"
              style={{ width: `${(complexity / 10) * 100}%` }}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-[color:var(--accent-amber)]" />
              Risk Level
            </span>
          }
        />
        <div className="flex items-end justify-between">
          <div>
            <Badge variant={riskMeta.variant}>{riskMeta.label}</Badge>
            <p className="text-xs text-ink-muted mt-3">
              Detailed detectors arrive in Phase 5
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RecentActivity({ items }) {
  if (!items?.length) {
    return (
      <Card className="h-fit">
        <CardHeader
          title={<span className="flex items-center gap-2"><Activity size={16} className="text-[color:var(--accent-emerald)]" />Recent Activity</span>}
        />
        <p className="text-sm text-ink-muted">No commit history yet.</p>
      </Card>
    );
  }
  return (
    <Card className="h-fit">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Activity size={16} className="text-[color:var(--accent-emerald)]" />
            Recent Activity
          </span>
        }
        subtitle="From cloned commits"
      />
      <ol className="space-y-3.5">
        {items.slice(0, 8).map((it, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--accent-blue)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-ink-primary leading-snug">{it.text}</p>
              <p className="text-xs text-ink-muted mt-0.5">{relativeTime(it.at)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
