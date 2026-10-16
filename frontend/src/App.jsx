import { Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from './layouts/AppLayout.jsx';
import Overview from './pages/Overview.jsx';
import GraphVisualization from './pages/GraphVisualization.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
import SemanticSearch from './pages/SemanticSearch.jsx';
import RiskAnalysis from './pages/RiskAnalysis.jsx';
import ProjectMetrics from './pages/ProjectMetrics.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/graph" element={<GraphVisualization />} />
        <Route path="/assistant" element={<AIAssistant />} />
        <Route path="/search" element={<SemanticSearch />} />
        <Route path="/risks" element={<RiskAnalysis />} />
        <Route path="/metrics" element={<ProjectMetrics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
