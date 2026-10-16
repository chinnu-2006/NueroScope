/** Compact humanized number (1234 → "1.2K", 89231 → "89K"). */
export function compactNumber(n) {
  if (n == null) return '—';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`.replace('.0', '');
  return `${(n / 1_000_000).toFixed(1)}M`.replace('.0', '');
}

/** "1,248" style thousands-separated. */
export function withCommas(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}

/** Relative time — "2 minutes ago". */
export function relativeTime(iso) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.max(1, Math.round((now - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
