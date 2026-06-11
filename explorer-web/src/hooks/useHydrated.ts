'use client';

import { useEffect, useState } from 'react';

/** True after the client has mounted — use to defer SSR/client-only UI differences. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
