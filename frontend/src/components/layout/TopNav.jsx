import { Github, Rocket, Sun, Moon, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import BrandLogo from './BrandLogo.jsx';
import Button from '../ui/Button.jsx';
import IconButton from '../ui/IconButton.jsx';
import Input from '../ui/Input.jsx';
import StatusPill from '../ui/StatusPill.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import { useJob } from '../../hooks/useJob.jsx';
import { useRepo } from '../../hooks/useRepo.jsx';

const DEFAULT_URL = 'https://github.com/your-username/ecommerce-platform';

export default function TopNav() {
  const { theme, toggle } = useTheme();
  const { analyze, running, status, error } = useJob();
  const { repoUrl } = useRepo();
  const [url, setUrl] = useState(repoUrl || DEFAULT_URL);

  const onAnalyze = () => {
    if (!url.trim() || running) return;
    analyze(url.trim());
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') onAnalyze();
  };

  return (
    <header
      className="h-[68px] shrink-0 border-b border-hairline-subtle bg-surface-base/85 backdrop-blur-md
                 sticky top-0 z-30"
    >
      <div className="h-full pl-5 pr-5 flex items-center gap-5">
        <div className="w-[220px] shrink-0">
          <BrandLogo />
        </div>

        <div className="flex-1 max-w-3xl">
          <Input
            prefix={<Github size={16} />}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="https://github.com/owner/repo"
            spellCheck={false}
            className="font-mono text-[13px]"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <AnalysisPill status={status} error={error} />

          <Button
            variant="primary"
            className="h-10 px-4 gap-2"
            onClick={onAnalyze}
            disabled={running || !url.trim()}
          >
            {running ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Rocket size={16} />
                Analyze Repository
              </>
            )}
          </Button>

          <div className="w-px h-6 bg-hairline mx-1" />

          <IconButton onClick={toggle} title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </IconButton>
          <IconButton title="Docs">
            <BookOpen size={16} />
          </IconButton>

          <button
            className="h-9 w-9 rounded-full grid place-items-center text-xs font-semibold
                       bg-gradient-primary text-white shadow-soft"
            title="Profile"
          >
            JD
          </button>
        </div>
      </div>
    </header>
  );
}

function AnalysisPill({ status, error }) {
  if (error) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 h-9 rounded-md border text-sm font-medium
                   bg-[color:var(--accent-red)]/12 text-[color:var(--accent-red)]
                   border-[color:var(--accent-red)]/25 max-w-[280px] truncate"
        title={error}
      >
        <AlertCircle size={16} />
        <span className="truncate">{error}</span>
      </span>
    );
  }
  if (!status) return <StatusPill state="done">Ready</StatusPill>;
  if (status.state === 'complete') return <StatusPill state="done">Analysis Complete</StatusPill>;
  if (status.state === 'error') return <StatusPill state="error">Analysis Failed</StatusPill>;
  return (
    <StatusPill state="running">
      Analyzing… {Math.round((status.progress || 0) * 100)}%
    </StatusPill>
  );
}
