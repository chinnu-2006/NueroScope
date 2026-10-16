import { api } from './api.js';

export async function semanticSearch(repoId, query, topK = 6) {
  const { data } = await api.post(`/repos/${repoId}/search`, { query, top_k: topK });
  return data;
}

export async function chat(repoId, query, level = 'intermediate') {
  const { data } = await api.post(`/repos/${repoId}/chat`, { query, level });
  return data;
}

export async function getAIStatus(repoId) {
  const { data } = await api.get(`/repos/${repoId}/ai/status`);
  return data;
}
