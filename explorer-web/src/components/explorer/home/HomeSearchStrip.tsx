'use client';

import { SearchForm } from '@/components/explorer/SearchForm';
import { useSearchRecentBlocks } from '@/components/explorer/SearchRecentBlocksContext';

export function HomeSearchStrip() {
  const recentBlocks = useSearchRecentBlocks();

  return (
    <section className="home-search" aria-labelledby="home-search-title">
      <div className="home-search__head">
        <p id="home-search-title" className="home-search__title">
          Explore both chains instantly
        </p>
        <p className="home-search__subtitle">
          Search by block, transaction, or address across Verium and VeriCoin.
        </p>
      </div>
      <SearchForm variant="blockchair" recentBlocks={recentBlocks ?? undefined} inputId="home-explorer-search" />
    </section>
  );
}
