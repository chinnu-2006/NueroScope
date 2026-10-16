import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard.jsx';

/**
 * Pie/donut chart of language share.
 * Expects `data = [{ name, share, color, files, lines }]`.
 */
export default function LanguageDonut({ data = [] }) {
  return (
    <ChartCard
      title="Language Mix"
      subtitle="By source lines of code"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="share"
            nameKey="name"
            innerRadius={64}
            outerRadius={96}
            stroke="var(--bg-panel)"
            strokeWidth={2}
            paddingAngle={1}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={<DonutTooltip />}
            cursor={{ fill: 'transparent' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
        {data.slice(0, 6).map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            <span className="text-ink-secondary">{d.name}</span>
            <span className="ml-auto text-ink-muted num">{d.share}%</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
        <span className="font-semibold text-ink-primary">{p.name}</span>
      </div>
      <div className="text-ink-muted num">
        {p.share}% · {p.files} files · {p.lines?.toLocaleString?.() ?? p.lines} lines
      </div>
    </div>
  );
}
