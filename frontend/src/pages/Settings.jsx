import { Settings as SettingsIcon, Sparkles, Palette, Cpu } from 'lucide-react';

import Card, { CardHeader } from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useTheme } from '../hooks/useTheme.js';

export default function Settings() {
  const { theme, toggle } = useTheme();

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon size={22} className="text-ink-secondary" />
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Palette size={16} className="text-[color:var(--accent-pink)]" />
              Appearance
            </span>
          }
          subtitle="Theme preference is saved to your browser."
        />
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-secondary">Current theme</p>
          <button
            onClick={toggle}
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-surface-elevated hairline hover:bg-surface-hover transition-colors"
          >
            {theme === 'dark' ? 'Dark' : 'Light'} — click to switch
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-[color:var(--accent-purple)]" />
              AI Provider
            </span>
          }
          subtitle="Set GEMINI_API_KEY in backend/.env to enable real AI."
        />
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-secondary">Provider status</p>
          <Badge variant="amber">Mock fallback active</Badge>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Cpu size={16} className="text-[color:var(--accent-blue-strong)]" />
              Embedding model
            </span>
          }
          subtitle="Downloaded once and cached locally."
        />
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-secondary">Model</p>
          <code className="text-xs font-mono text-ink-primary bg-white/[0.04] px-2 py-1 rounded">
            sentence-transformers/all-MiniLM-L6-v2
          </code>
        </div>
      </Card>
    </div>
  );
}
