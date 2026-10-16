import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const KEY = 'neuroscope.repo';
const RepoContext = createContext(null);

export function RepoProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { repoId: null, jobId: null, repoUrl: '' };
    } catch {
      return { repoId: null, jobId: null, repoUrl: '' };
    }
  });

  useEffect(() => {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const setRepo = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearRepo = useCallback(() => {
    setState({ repoId: null, jobId: null, repoUrl: '' });
  }, []);

  return (
    <RepoContext.Provider value={{ ...state, setRepo, clearRepo }}>
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error('useRepo must be used inside <RepoProvider>');
  return ctx;
}
