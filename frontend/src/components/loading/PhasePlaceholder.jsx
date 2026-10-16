import Badge from '../ui/Badge.jsx';

/**
 * Nicely designed "coming in phase X" placeholder used for pages
 * that will be wired up in later phases. Keeps the app fully
 * navigable and demoable from day one.
 */
export default function PhasePlaceholder({ icon: Icon, title, subtitle, phase }) {
  return (
    <div className="p-8 h-full flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl grid place-items-center
                        bg-gradient-primary shadow-glow mb-6">
          {Icon ? <Icon size={26} className="text-white" strokeWidth={1.75} /> : null}
        </div>
        <h1 className="text-2xl font-semibold text-ink-primary tracking-tight">{title}</h1>
        <p className="text-sm text-ink-secondary mt-2 leading-relaxed">{subtitle}</p>
        {phase && (
          <div className="mt-6 inline-flex">
            <Badge variant="blue" dot>
              {phase} — coming next
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
