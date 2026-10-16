import { useCallback, useState } from 'react';
import { chat as chatApi } from '../services/searchApi.js';
import { useRepo } from './useRepo.jsx';

/**
 * Simple single-turn chat with client-side history.
 * `messages` is an array of `{role: 'user' | 'ai', text, citations?, level?}`.
 */
export function useChat() {
  const { repoId } = useRepo();
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(
    async (text, level = 'intermediate') => {
      const query = (text ?? '').trim();
      if (!repoId || !query) return;
      setError(null);
      setMessages((prev) => [...prev, { role: 'user', text: query, level }]);
      setPending(true);
      try {
        const res = await chatApi(repoId, query, level);
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: res.answer,
            citations: res.citations || [],
            level,
            provider: res.provider,
          },
        ]);
      } catch (e) {
        const msg = e?.response?.data?.detail || e?.message || 'Chat failed';
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: `Sorry — ${msg}.`, citations: [], level, error: true },
        ]);
      } finally {
        setPending(false);
      }
    },
    [repoId],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, pending, error, send, reset, hasRepo: Boolean(repoId) };
}
