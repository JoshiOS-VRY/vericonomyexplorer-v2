'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="explorer-state-page">
      <AlertTriangle className="mb-4 h-10 w-10 text-warning" aria-hidden />
      <p className="explorer-state-page__code">Error</p>
      <h1 className="explorer-state-page__title">Something went wrong</h1>
      <p className="explorer-state-page__message">
        The explorer hit an unexpected error. Your data is safe — try refreshing or return to the
        homepage.
      </p>
      <div className="explorer-state-page__actions">
        <button type="button" onClick={reset} className="action-btn">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Try again
        </button>
        <Link href="/" className="action-btn">
          <Home className="h-3.5 w-3.5" aria-hidden />
          Home
        </Link>
      </div>
    </div>
  );
}
