import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

const BUCKET_COLORS = {
  '1-3': 'var(--accent-emerald)',
  '4-6': 'var(--accent-blue)',
  '7-10': 'var(--accent-amber)',
  '11+': 'var(--accent-red)',
};

const AXIS_LABEL = 'rgba(148,163,184,0.7)';


export default function ComplexityHistogram({ data = [] }) {
  return (
    <ChartCard
      title="Function Complexity"
      subtitle="Distribution by cyclomatic complexity"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="bucket" stroke={AXIS_LABEL} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis stroke={AXIS_LABEL} tickLine={false} axisLine={false} fontSize={11} />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<HistTooltip />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={BUCKET_COLORS[d.bucket] || 'var(--accent-blue)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function HistTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs">
      <div className="font-semibold text-ink-primary">Complexity {p.bucket}</div>
      <div className="text-ink-muted num">{p.count} function{p.count === 1 ? '' : 's'}</div>
    </div>
  );
}
