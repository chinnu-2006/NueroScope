/** Small stat pairs shown in the sidebar under Repository Status. */
export default function ArchitectureSummary({ items = [], title = 'Architecture Summary' }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted mb-3">
        {title}
      </p>
      <dl className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between">
            <dt className="text-sm text-ink-secondary">{it.label}</dt>
            <dd className="text-sm font-semibold text-ink-primary num tabular-nums">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
