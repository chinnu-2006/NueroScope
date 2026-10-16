import { Outlet } from 'react-router-dom';

import Sidebar from '../components/layout/Sidebar.jsx';
import TopNav from '../components/layout/TopNav.jsx';

export default function AppLayout() {
  return (
    <div className="h-full flex flex-col bg-surface-base text-ink-primary">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
