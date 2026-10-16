import { useCallback, useState } from 'react';
import { semanticSearch } from '../services/searchApi.js';
import { useRepo } from './useRepo.jsx';

export function useSearch() {
  const { repoId } = useRepo();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (q, topK = 8) => {
      const query = (q ?? '').trim();
      if (!repoId || !query) return;
      setLoading(true);
      setError(null);
      try {
        const res = await semanticSearch(repoId, query, topK);
        setQuery(query);
        setHits(res.hits || []);
      } catch (e) {
        setError(e?.response?.data?.detail || e?.message || 'Search failed');
        setHits([]);
      } finally {
        setLoading(false);
      }
    },
    [repoId],
  );

  const clear = useCallback(() => {
    setQuery('');
    setHits([]);
    setError(null);
  }, []);

  return { query, hits, loading, error, run, clear, hasRepo: Boolean(repoId) };
}
