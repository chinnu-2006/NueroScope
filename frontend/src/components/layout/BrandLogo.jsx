/** NeuroScope brand mark — a connected-nodes glyph with the brand gradient. */
export default function BrandLogo({ size = 34, showWordmark = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ns-brand" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f472b6" />
            <stop offset="0.35" stopColor="#a78bfa" />
            <stop offset="0.7" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="ns-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" stopOpacity="0.7" />
            <stop offset="1" stopColor="#60a5fa" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <line x1="10" y1="10" x2="30" y2="16" stroke="url(#ns-line)" strokeWidth="1.6" />
        <line x1="10" y1="10" x2="14" y2="30" stroke="url(#ns-line)" strokeWidth="1.6" />
        <line x1="30" y1="16" x2="14" y2="30" stroke="url(#ns-line)" strokeWidth="1.6" />
        <line x1="30" y1="16" x2="30" y2="30" stroke="url(#ns-line)" strokeWidth="1.6" />
        <line x1="14" y1="30" x2="30" y2="30" stroke="url(#ns-line)" strokeWidth="1.6" />

        <circle cx="10" cy="10" r="4.5" fill="url(#ns-brand)" />
        <circle cx="30" cy="16" r="3.8" fill="#34d399" />
        <circle cx="14" cy="30" r="3.5" fill="#fbbf24" />
        <circle cx="30" cy="30" r="3.5" fill="#f472b6" />
      </svg>

      {showWordmark && (
        <span className="text-[1.35rem] font-bold tracking-tight gradient-text">
          NeuroScope
        </span>
      )}
    </div>
  );
}
