'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  cacheThemeMode,
  readCachedThemeMode,
  resolveTheme,
  type ResolvedTheme,
  type ThemeMode,
  THEME_STORAGE_KEY,
} from '@/lib/theme';

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    const cached = readCachedThemeMode() ?? 'system';
    const nextResolved = resolveTheme(cached);
    setModeState(cached);
    setResolved(nextResolved);
    applyTheme(nextResolved);
  }, []);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next = resolveTheme('system');
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    cacheThemeMode(next);
    const nextResolved = resolveTheme(next);
    setModeState(next);
    setResolved(nextResolved);
    applyTheme(nextResolved);
  }, []);

  return { mode, resolved, setMode, storageKey: THEME_STORAGE_KEY };
}
