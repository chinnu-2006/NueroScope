import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Waypoints,
  MessagesSquare,
  ShieldAlert,
  Search,
  BarChart3,
  Settings,
} from 'lucide-react';

import { cn } from '../../lib/cn.js';
import StatusRail from '../widgets/StatusRail.jsx';
import ArchitectureSummary from '../widgets/ArchitectureSummary.jsx';
import { repositoryStatus, architectureSummary } from '../../utils/mockData.js';
import { useJob } from '../../hooks/useJob.jsx';
import { useOverview } from '../../hooks/useOverview.js';
import { withCommas } from '../../utils/formatters.js';

const NAV = [
  { to: '/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/graph', label: 'Graph Visualization', icon: Waypoints },
  { to: '/assistant', label: 'AI Assistant', icon: MessagesSquare },
  { to: '/risks', label: 'Risk Analysis', icon: ShieldAlert },
  { to: '/search', label: 'Semantic Search', icon: Search },
  { to: '/metrics', label: 'Project Metrics', icon: BarChart3 },
];

export default function Sidebar() {
  const { status } = useJob();
  const { data: overview } = useOverview();

  const rail = status?.stages ?? repositoryStatus;
  const summary = overview
    ? [
        { label: 'Services', value: overview.stats.services },
        { label: 'Python Files', value: overview.stats.pythonFiles },
        { label: 'Total Lines', value: withCommas(overview.stats.totalLines) },
        { label: 'Dependencies', value: overview.stats.dependencies },
      ]
    : architectureSummary;

  return (
    <aside
      className="w-[248px] shrink-0 border-r border-hairline-subtle bg-surface-base
                 overflow-y-auto no-scrollbar"
    >
      <nav className="p-3 pt-4">
        <ul className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] transition-colors duration-fast ease-out',
                    isActive
                      ? 'bg-[color:var(--bg-active)] text-[color:var(--accent-blue-strong)] font-semibold shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                      : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-4">
          <StatusRail items={rail} />
          <ArchitectureSummary items={summary} />
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'mt-6 flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] transition-colors duration-fast ease-out',
              isActive
                ? 'bg-[color:var(--bg-active)] text-[color:var(--accent-blue-strong)] font-semibold'
                : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
            )
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
