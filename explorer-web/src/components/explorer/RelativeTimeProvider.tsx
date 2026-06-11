'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Interval = 'second' | 'minute';

interface RelativeTimeContextValue {
  tick: number;
  registerInterval: (interval: Interval) => void;
  unregisterInterval: (interval: Interval) => void;
}

const RelativeTimeContext = createContext<RelativeTimeContextValue | null>(null);

export function RelativeTimeProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const [secondCount, setSecondCount] = useState(0);
  const [minuteCount, setMinuteCount] = useState(0);

  const registerInterval = useCallback((interval: Interval) => {
    if (interval === 'second') {
      setSecondCount((value) => value + 1);
    } else {
      setMinuteCount((value) => value + 1);
    }
  }, []);

  const unregisterInterval = useCallback((interval: Interval) => {
    if (interval === 'second') {
      setSecondCount((value) => Math.max(0, value - 1));
    } else {
      setMinuteCount((value) => Math.max(0, value - 1));
    }
  }, []);

  useEffect(() => {
    const intervalMs = secondCount > 0 ? 1_000 : minuteCount > 0 ? 60_000 : null;
    if (intervalMs == null) {
      return;
    }

    const id = window.setInterval(() => {
      setTick((value) => value + 1);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [minuteCount, secondCount]);

  const value = useMemo(
    () => ({ tick, registerInterval, unregisterInterval }),
    [registerInterval, tick, unregisterInterval]
  );

  return <RelativeTimeContext.Provider value={value}>{children}</RelativeTimeContext.Provider>;
}

export function useRelativeTimeTick(interval: Interval): number {
  const context = useContext(RelativeTimeContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.registerInterval(interval);
    return () => context.unregisterInterval(interval);
  }, [context, interval]);

  return context?.tick ?? 0;
}
