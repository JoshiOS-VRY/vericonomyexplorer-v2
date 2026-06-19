import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const LINKS = [
  { label: 'Verium explorer', href: '/vrm', description: 'Blocks, miners, rich list' },
  { label: 'VeriCoin explorer', href: '/vrc', description: 'Blocks, staking, rich list' },
  { label: 'Network insights', href: '/insights', description: 'Hashrate, supply, market history' },
  { label: 'API reference', href: '/api/docs', description: 'REST endpoints for integrations' },
];

export function HomeQuickLinks() {
  return (
    <nav className="home-links-panel" aria-label="Explore further">
      <ul className="home-links-panel__grid">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} prefetch className="home-links-panel__item">
              <span className="home-links-panel__label">{link.label}</span>
              <span className="home-links-panel__desc">{link.description}</span>
              <ArrowUpRight className="home-links-panel__icon" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
