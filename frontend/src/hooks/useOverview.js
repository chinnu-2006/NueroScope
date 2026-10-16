import { useEffect, useState } from 'react';

import { getOverview } from '../services/analysisApi.js';
import { useRepo } from './useRepo.jsx';

/**
 * Fetch overview for the currently active repo.
 * Returns `{ data, loading, error, hasRepo }`.
 * When no repo is active, data is null — callers fall back to mockData.
 */
export function useOverview() {
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
    getOverview(repoId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message || 'Failed to fetch overview'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  return { data, loading, error, hasRepo: Boolean(repoId) };
}
