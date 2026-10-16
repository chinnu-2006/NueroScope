import { BarChart3, FileCode2, GitFork, Layers } from 'lucide-react';

import LanguageDonut from '../components/charts/LanguageDonut.jsx';
import ComplexityHistogram from '../components/charts/ComplexityHistogram.jsx';
import HorizontalBar from '../components/charts/HorizontalBar.jsx';
import Card, { CardHeader } from '../components/ui/Card.jsx';
import PhasePlaceholder from '../components/loading/PhasePlaceholder.jsx';
import Skeleton from '../components/loading/Skeleton.jsx';
import { useMetrics } from '../hooks/useMetrics.js';

const truncateLabel = (s, max = 34) => (s.length > max ? '…' + s.slice(-(max - 1)) : s);


export default function ProjectMetrics() {
  const { data, loading, hasRepo } = useMetrics();

  if (!hasRepo) {
    return (
      <PhasePlaceholder
        icon={BarChart3}
        title="Project Metrics"
        subtitle="Analyze a repository to see its language mix, complexity distribution, and dependency hotspots."
      />
    );
  }

  if (loading || !data) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 size={22} className="text-[color:var(--accent-blue-strong)]" />
          Project Metrics
        </h1>
        <div className="grid xl:grid-cols-2 gap-6 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  const largestFiles = (data.largest_files || []).map((f) => ({
    label: truncateLabel(f.path),
    value: f.lines,
  }));
  const mostConnected = (data.most_connected || []).map((f) => ({
    label: truncateLabel(f.path),
    value: f.connections,
  }));
  const dirDist = (data.file_distribution || []).map((d) => ({
    label: d.dir,
    value: d.count,
  }));

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
        <BarChart3 size={22} className="text-[color:var(--accent-blue-strong)]" />
        Project Metrics
      </h1>
      <p className="text-sm text-ink-secondary mt-1">
        Everything the analyzer extracted, visualized. Hover any bar or slice for details.
      </p>

      <div className="grid xl:grid-cols-2 gap-6 mt-6">
        <LanguageDonut data={data.languages || []} />
        <ComplexityHistogram data={data.complexity_histogram || []} />
      </div>

      <div className="grid xl:grid-cols-2 gap-6 mt-6">
        <HorizontalBar
          title={<span className="flex items-center gap-2"><FileCode2 size={14} className="text-[color:var(--accent-red)]" />Largest Files</span>}
          subtitle="Top files by line count"
          data={largestFiles}
          valueUnit="lines"
          color="var(--accent-red)"
        />
        <HorizontalBar
          title={<span className="flex items-center gap-2"><GitFork size={14} className="text-[color:var(--accent-blue-strong)]" />Most Connected Files</span>}
          subtitle="Fan-in + fan-out per file"
          data={mostConnected}
          valueUnit="deps"
          color="var(--accent-blue-strong)"
        />
      </div>

      <div className="mt-6">
        <HorizontalBar
          title={<span className="flex items-center gap-2"><Layers size={14} className="text-[color:var(--accent-emerald)]" />File Distribution</span>}
          subtitle="Files per top-level directory"
          data={dirDist}
          valueUnit="files"
          color="var(--accent-emerald)"
        />
      </div>
    </div>
  );
}
