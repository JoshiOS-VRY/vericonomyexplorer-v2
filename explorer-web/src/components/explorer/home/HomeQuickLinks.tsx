import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const LINKS = [
  { label: 'Verium rich list', href: '/vrm/richlist' },
  { label: 'Activity leaderboard', href: '/vrm/leaderboard?period=month&sort=activity' },
  { label: 'Network insights', href: '/insights' },
  { label: 'API reference', href: '/api/docs' },
];

export function HomeQuickLinks() {
  return (
    <nav className="home-links" aria-label="Explore further">
      <span className="home-links__label">Go deeper</span>
      <ul className="home-links__list">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} prefetch className="home-links__item">
              {link.label}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
