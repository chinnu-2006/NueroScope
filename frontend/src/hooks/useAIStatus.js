import { useEffect, useState } from 'react';
import { getAIStatus } from '../services/searchApi.js';
import { useRepo } from './useRepo.jsx';

/**
 * Reports whether the AI features are ready for the current repo:
 *   provider    'gemini' | 'mock'
 *   indexReady  FAISS index exists on disk
 *   chunkable   we could rebuild the index from the persisted blob
 *
 * Refetches whenever the current repo changes.
 */
export function useAIStatus() {
  const { repoId } = useRepo();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAIStatus(repoId)
      .then((d) => {
        if (cancelled) return;
        setData({
          provider: d.provider,
          indexReady: !!d.index_ready,
          chunkable: !!d.chunkable,
        });
      })
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repoId]);

  return { ...(data ?? {}), loading };
}
