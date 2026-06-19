import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="explorer-state-page">
      <p className="explorer-state-page__code">404</p>
      <h1 className="explorer-state-page__title">Page not found</h1>
      <p className="explorer-state-page__message">
        This block, transaction, or address doesn&apos;t exist — or the route may have moved. Search
        both chains or return home.
      </p>
      <div className="explorer-state-page__actions">
        <Link href="/" className="action-btn">
          <Home className="h-3.5 w-3.5" aria-hidden />
          Home
        </Link>
        <Link href="/search" className="action-btn">
          <Search className="h-3.5 w-3.5" aria-hidden />
          Search
        </Link>
      </div>
    </div>
  );
}
