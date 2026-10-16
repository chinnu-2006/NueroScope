import {
  Component,
  FileCode2,
  Database,
  Zap,
  Cog,
  Wrench,
  FlaskConical,
  Globe,
  Package,
  Settings2,
  FileText,
  Boxes,
  Route,
  Folder,
  FolderTree,
  Home,
  Anchor,
  Library,
  Archive,
} from 'lucide-react';

/**
 * Visual buckets — used by graph nodes AND filter dropdowns.
 * Order + naming mirrors the reference design's legend.
 */
export const CATEGORIES = {
  // React-specific fine-grained buckets (from the reference)
  component:   { id: 'component',   label: 'Component', color: '#22c55e', icon: Component },   // green
  hook:        { id: 'hook',        label: 'Hook',      color: '#06b6d4', icon: Anchor },      // cyan/teal
  service:     { id: 'service',     label: 'Service',   color: '#f97316', icon: Cog },         // orange
  utility:     { id: 'utility',     label: 'Utility',   color: '#84cc16', icon: Wrench },      // lime
  page:        { id: 'page',        label: 'Page',      color: '#a855f7', icon: FileText },    // purple
  context:     { id: 'context',     label: 'Context',   color: '#8b5cf6', icon: Package },     // violet
  library:     { id: 'library',     label: 'Library',   color: '#14b8a6', icon: Library },     // teal
  store:       { id: 'store',       label: 'Store',     color: '#ef4444', icon: Archive },     // red

  // Broader buckets used across other modes
  frontend:     { id: 'frontend',     label: 'Frontend',     color: 'var(--node-frontend)', icon: Component },
  api:          { id: 'api',          label: 'API',          color: 'var(--node-api)',      icon: Route },
  db:           { id: 'db',           label: 'Database',     color: 'var(--node-db)',       icon: Database },
  cache:        { id: 'cache',        label: 'Cache',        color: 'var(--node-cache)',    icon: Zap },
  test:         { id: 'test',         label: 'Test',         color: 'var(--accent-amber)',  icon: FlaskConical },
  external:     { id: 'external',     label: 'External',     color: 'var(--node-external)', icon: Globe },
  package:      { id: 'package',      label: 'Package',      color: 'var(--accent-purple)', icon: Package },
  config:       { id: 'config',       label: 'Config',       color: 'var(--accent-amber)',  icon: Settings2 },
  docs:         { id: 'docs',         label: 'Docs',         color: 'var(--ink-muted)',     icon: FileText },
  module:       { id: 'module',       label: 'Module',       color: 'var(--node-backend)',  icon: FileCode2 },
  asset:        { id: 'asset',        label: 'Asset',        color: 'var(--ink-muted)',     icon: Boxes },
  folder:       { id: 'folder',       label: 'Folder',       color: 'var(--accent-blue-strong)', icon: Folder },
  folder_root:  { id: 'folder_root',  label: 'Root',         color: 'var(--accent-purple)', icon: Home },
  module_group: { id: 'module_group', label: 'Module Group', color: 'var(--node-backend)',  icon: FolderTree },
};

/** Bottom-of-canvas legend — mirrors the reference. */
export const LEGEND = ['component', 'hook', 'service', 'utility', 'page', 'context', 'library', 'store'];

/** Chips available in the "All Types" filter dropdown. */
export const FILTER_CATEGORIES = [
  'component', 'hook', 'service', 'utility', 'page', 'context', 'library', 'store',
  'api', 'db', 'test', 'config', 'docs',
];

const p = (x) => (x || '').toLowerCase();

/**
 * Derive a category for a node.
 *  1. explicit backend `kind` if it maps to a known category
 *  2. path heuristic (React-specific → generic)
 *  3. language fallback
 */
export function deriveCategory(node) {
  const kind = node.kind;
  if (kind && CATEGORIES[kind]) return CATEGORIES[kind];

  const path = p(node.path);
  const lang = node.language;

  // React-specific bucketing by folder name (works for src/ layouts and nested)
  if (/(?:^|\/)components?\//.test(path)) return CATEGORIES.component;
  if (/(?:^|\/)hooks?\//.test(path))       return CATEGORIES.hook;
  if (/(?:^|\/)services?\//.test(path))    return CATEGORIES.service;
  if (/(?:^|\/)(utils?|helpers?)\//.test(path)) return CATEGORIES.utility;
  if (/(?:^|\/)pages?\//.test(path))       return CATEGORIES.page;
  if (/(?:^|\/)contexts?\//.test(path))    return CATEGORIES.context;
  if (/(?:^|\/)(lib|libs)\//.test(path))   return CATEGORIES.library;
  if (/(?:^|\/)(store|stores|state|redux|slices)\//.test(path)) return CATEGORIES.store;

  // Non-code assets first
  if (lang === 'Markdown') return CATEGORIES.docs;
  if (lang === 'JSON' || lang === 'YAML') return CATEGORIES.config;
  if (lang === 'CSS' || lang === 'HTML') return CATEGORIES.component;

  if (kind === 'init') return CATEGORIES.package;
  if (kind === 'script') return CATEGORIES.config;
  if (kind === 'test') return CATEGORIES.test;

  // Broader path heuristics (Python-ish repos)
  if (/(?:^|\/)tests?\//.test(path) || /_test\.py$/.test(path)) return CATEGORIES.test;
  if (/(?:^|\/)(api|routes|handlers|endpoints|routers?)\//.test(path)) return CATEGORIES.api;
  if (/(?:^|\/)(models?|db|database|schemas?)\//.test(path)) return CATEGORIES.db;

  // Language fallback
  if (lang === 'TypeScript' || lang === 'JavaScript') return CATEGORIES.component;
  if (lang === 'Python') return CATEGORIES.module;

  return CATEGORIES.asset;
}

/**
 * Append an alpha channel to a category color for use in inline styles.
 * Hex colors (`#22c55e`) take the hex alpha suffix directly. CSS custom
 * properties (`var(--node-backend)`) can't — `var(--x)bb` is invalid CSS
 * and gets silently dropped by the browser — so those route through
 * color-mix() instead.
 */
export function withAlpha(color, alphaHex) {
  if (!color) return color;
  if (color.startsWith('#')) return `${color}${alphaHex}`;
  const pct = Math.round((parseInt(alphaHex, 16) / 255) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/** Language → short letter tag shown on file nodes (JS, TS, PY, etc.). */
export function languageTag(lang) {
  if (lang === 'TypeScript') return 'TS';
  if (lang === 'JavaScript') return 'JS';
  if (lang === 'Python')     return 'PY';
  if (lang === 'Java')       return 'JV';
  if (lang === 'Go')         return 'GO';
  if (lang === 'CSS')        return 'CSS';
  if (lang === 'HTML')       return 'HTML';
  if (lang === 'Markdown')   return 'MD';
  if (lang === 'JSON')       return '{}';
  if (lang === 'YAML')       return 'YML';
  return lang?.slice(0, 2)?.toUpperCase() ?? '••';
}
