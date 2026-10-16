import { useEffect, useState } from 'react';
import { getMetrics } from '../services/analysisApi.js';
import { useRepo } from './useRepo.jsx';

export function useMetrics() {
  const { repoId } = useRepo();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!repoId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMetrics(repoId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message || 'Failed to fetch metrics'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  return { data, loading, error, hasRepo: Boolean(repoId) };
}
