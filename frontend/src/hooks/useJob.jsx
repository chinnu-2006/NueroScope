import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { getJobStatus, startAnalysis } from '../services/analysisApi.js';
import { useRepo } from './useRepo.jsx';
import { useToast } from './useToast.jsx';

const POLL_MS = 800;
const JobContext = createContext(null);

// Sidebar-friendly labels, mirroring the mockup.
const LABELS = {
  clone: 'Cloned',
  parse: 'Parsed',
  graph: 'Graph Built',
  ai: 'AI Analysis',
};

const emptyStages = Object.entries(LABELS).map(([id, label]) => ({
  id,
  label,
  detail: '',
  state: 'pending',
}));

export function JobProvider({ children }) {
  const { setRepo } = useRepo();
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const startedAt = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const analyze = useCallback(
    async (repoUrl) => {
      setError(null);
      setRunning(true);
      stopPolling();
      setStatus({ state: 'queued', progress: 0, stages: emptyStages });
      startedAt.current = Date.now();

      try {
        const { repo_id, job_id } = await startAnalysis(repoUrl);
        setRepo({ repoId: null, jobId: job_id, repoUrl });
        toast({ variant: 'info', title: 'Analysis started', text: 'Cloning + parsing + indexing…' });

        pollRef.current = setInterval(async () => {
          try {
            const s = await getJobStatus(job_id);
            const stages = s.stages.map((st) => ({ ...st, label: LABELS[st.id] ?? st.label }));
            setStatus({ ...s, stages });
            if (s.state === 'complete') {
              stopPolling();
              setRunning(false);
              setRepo({ repoId: repo_id, jobId: job_id, repoUrl });
              const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
              toast({ variant: 'success', title: 'Analysis complete', text: `Ready to explore — ${secs}s` });
            } else if (s.state === 'error') {
              stopPolling();
              setRunning(false);
              setError(s.error || 'Analysis failed');
              toast({ variant: 'error', title: 'Analysis failed', text: s.error || 'Unknown error' });
            }
          } catch (e) {
            stopPolling();
            setRunning(false);
            const msg = e?.message || 'Status poll failed';
            setError(msg);
            toast({ variant: 'error', title: 'Lost the analysis job', text: 'The backend may have restarted. Try analyzing again.' });
          }
        }, POLL_MS);
      } catch (e) {
        setRunning(false);
        setStatus(null);
        const msg = e?.response?.data?.detail || e?.message || 'Failed to start analysis';
        setError(msg);
        toast({ variant: 'error', title: 'Could not start analysis', text: msg });
      }
    },
    [setRepo, stopPolling, toast],
  );

  return (
    <JobContext.Provider value={{ analyze, running, status, error }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJob must be used inside <JobProvider>');
  return ctx;
}
