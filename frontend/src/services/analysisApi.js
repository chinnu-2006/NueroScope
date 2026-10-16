import { api } from './api.js';

export async function startAnalysis(repoUrl) {
  const { data } = await api.post('/analyze', { repo_url: repoUrl });
  return data; // { repo_id, job_id }
}

export async function getJobStatus(jobId) {
  const { data } = await api.get(`/analyze/${jobId}/status`);
  return data;
}

/** Convert backend snake_case → frontend camelCase for the overview shape. */
function normalizeOverview(d) {
  return {
    ...d,
    primaryLanguage: d.primary_language,
    complexityScore: d.complexity_score,
    riskLevel: d.risk_level,
    aiSummary: d.ai_summary,
    recentActivity: d.recent_activity,
  };
}

export async function getOverview(repoId) {
  const { data } = await api.get(`/repos/${repoId}`);
  return normalizeOverview(data);
}

export async function getMetrics(repoId) {
  const { data } = await api.get(`/repos/${repoId}/metrics`);
  return data;
}

export async function getRisks(repoId) {
  const { data } = await api.get(`/repos/${repoId}/risks`);
  return data;
}

export async function getGraph(repoId, mode = 'file') {
  const { data } = await api.get(`/repos/${repoId}/graph`, { params: { mode } });
  return data;
}

export async function getFileDetail(repoId, fileId, level = 'intermediate') {
  const { data } = await api.get(`/repos/${repoId}/files/${fileId}`, {
    params: { level },
  });
  return data;
}
