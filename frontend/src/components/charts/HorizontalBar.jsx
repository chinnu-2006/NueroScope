import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard.jsx';

const AXIS_LABEL = 'rgba(148,163,184,0.7)';

/**
 * Reusable horizontal bar chart.
 *   data      [{ label, value }]
 *   valueUnit optional string ("lines", "deps", "files")
 *   color     bar color (defaults to var(--accent-blue))
 */
export default function HorizontalBar({
  title,
  subtitle,
  data = [],
  valueUnit = '',
  color = 'var(--accent-blue-strong)',
  height,
}) {
  const rowH = 26;
  const h = height ?? Math.max(180, data.length * rowH + 40);
  return (
    <ChartCard title={title} subtitle={subtitle} height={h}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" stroke={AXIS_LABEL} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            dataKey="label"
            type="category"
            stroke={AXIS_LABEL}
            tickLine={false}
            axisLine={false}
            width={190}
            fontSize={11}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={<HTooltip unit={valueUnit} />}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function HTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs">
      <div className="font-mono text-ink-primary">{p.label}</div>
      <div className="text-ink-muted num">{p.value.toLocaleString?.() ?? p.value} {unit}</div>
    </div>
  );
}
