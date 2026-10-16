import axios from 'axios';

// Vite proxies /api → http://localhost:8000 (see vite.config.js).
export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}
