import { useEffect, useState } from 'react';

import { getGraph } from '../services/analysisApi.js';
import { useRepo } from './useRepo.jsx';

export function useGraph(mode = 'file') {
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
    getGraph(repoId, mode)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message || 'Failed to fetch graph'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoId, mode]);

  return { data, loading, error, hasRepo: Boolean(repoId) };
}
