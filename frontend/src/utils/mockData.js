/**
 * Phase-1 realistic placeholder data.
 * Replaced by real API responses starting Phase 2.
 * Values chosen to match the reference mockup so the UI feels lived-in.
 */

export const sampleRepo = {
  id: 'ecommerce-platform',
  name: 'ecommerce-platform',
  owner: 'your-username',
  url: 'https://github.com/your-username/ecommerce-platform',
  description: 'Full-stack e-commerce reference app with FastAPI, React, and Postgres.',
  primaryLanguage: 'Python',
  languages: [
    { name: 'Python', share: 46, color: 'var(--accent-blue)' },
    { name: 'TypeScript', share: 38, color: 'var(--accent-cyan)' },
    { name: 'SQL', share: 9, color: 'var(--accent-amber)' },
    { name: 'CSS', share: 7, color: 'var(--accent-pink)' },
  ],
  stats: {
    files: 1248,
    pythonFiles: 284,
    classes: 87,
    functions: 1432,
    dependencies: 142,
    totalLines: 89231,
    services: 12,
  },
  complexityScore: 7.2,
  riskLevel: 'moderate',
  aiSummary:
    'A modular e-commerce platform composed of twelve internal services. The Auth Service acts as the central identity hub, coordinating with the Payment Service, Notification Service, and a shared Utils library. Data flows through a PostgreSQL primary and a Redis cache; third-party integrations include Stripe for payments and SendGrid for transactional email.',
  recentActivity: [
    { at: '2026-07-24T09:30:00Z', text: 'auth/jwt.py — refactored token refresh flow' },
    { at: '2026-07-23T14:12:00Z', text: 'payments/stripe.py — added idempotency keys' },
    { at: '2026-07-22T18:45:00Z', text: 'notifications/email.py — retry with backoff' },
    { at: '2026-07-21T11:02:00Z', text: 'db/migrations — new index on orders(created_at)' },
    { at: '2026-07-20T08:37:00Z', text: 'utils/logging.py — structured JSON output' },
  ],
};

export const repositoryStatus = [
  { id: 'clone', label: 'Cloned', detail: '2 minutes ago', state: 'done' },
  { id: 'parse', label: 'Parsed', detail: '1,248 files • Python', state: 'done' },
  { id: 'graph', label: 'Graph Built', detail: '156 nodes • 142 edges', state: 'done' },
  { id: 'ai', label: 'AI Analysis', detail: 'Complete', state: 'done' },
];

export const architectureSummary = [
  { label: 'Services', value: 12 },
  { label: 'Python Files', value: 284 },
  { label: 'Total Lines', value: '89K' },
  { label: 'Dependencies', value: 142 },
];
