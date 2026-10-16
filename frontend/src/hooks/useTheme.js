import { useCallback, useEffect, useState } from 'react';

const KEY = 'neuroscope.theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = typeof window !== 'undefined' && window.localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggle };
}
