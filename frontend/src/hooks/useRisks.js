import { useEffect, useState } from 'react';
import { getRisks } from '../services/analysisApi.js';
import { useRepo } from './useRepo.jsx';

export function useRisks() {
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
    getRisks(repoId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message || 'Failed to fetch risks'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  return { data, loading, error, hasRepo: Boolean(repoId) };
}
