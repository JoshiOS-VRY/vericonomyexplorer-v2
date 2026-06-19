import Link from 'next/link';
import { ArrowUpRight, BookOpen, Trophy, Wallet } from 'lucide-react';
import { CHAIN_EXPLORERS } from '@/lib/chainDisplay';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    title: 'Verium rich list',
    description: 'Positive-balance VRM addresses ranked by balance and supply share.',
    href: '/vrm/richlist',
    hrefLabel: 'View rich list',
    icon: Wallet,
    accent: 'vrm' as const,
  },
  {
    title: 'Verium activity',
    description: 'Monthly transfer activity leaderboard by address.',
    href: '/vrm/leaderboard?period=month&sort=activity',
    hrefLabel: 'View leaderboard',
    icon: Trophy,
    accent: 'vrm' as const,
  },
  {
    title: 'API reference',
    description: 'REST endpoints for integrations, automation, and tooling.',
    href: '/api/docs',
    hrefLabel: 'Read API docs',
    icon: BookOpen,
    accent: 'neutral' as const,
  },
] as const;

type FeatureAccent = (typeof FEATURES)[number]['accent'];

export function VericonomyHomeStatic() {
  return (
    <section className="home-features" aria-labelledby="home-features-title">
      <div className="home-section-head">
        <div>
          <h2 id="home-features-title" className="home-section-head__title">
            Explore further
          </h2>
          <p className="home-section-head__subtitle">
            Rich lists, activity rankings, and developer resources.
          </p>
        </div>
      </div>

      <div className="home-features__grid">
        {FEATURES.map((feature) => (
          <HomeFeatureCard key={feature.href} {...feature} />
        ))}
      </div>
    </section>
  );
}

function HomeFeatureCard({
  title,
  description,
  href,
  hrefLabel,
  icon: Icon,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  hrefLabel: string;
  icon: typeof Wallet;
  accent: FeatureAccent;
}) {
  const chainAccent = accent === 'vrm' ? CHAIN_EXPLORERS.vrm.ticker : null;

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        'home-feature-card group',
        accent === 'vrm' && 'home-feature-card--vrm',
        accent === 'neutral' && 'home-feature-card--neutral'
      )}
    >
      <div className="home-feature-card__icon-wrap">
        <Icon className="home-feature-card__icon" aria-hidden />
      </div>
      <div className="home-feature-card__body">
        <div className="home-feature-card__head">
          <h3 className="home-feature-card__title">{title}</h3>
          {chainAccent ? (
            <span className="home-feature-card__badge">{chainAccent}</span>
          ) : null}
        </div>
        <p className="home-feature-card__desc">{description}</p>
        <span className="home-feature-card__link">
          {hrefLabel}
          <ArrowUpRight className="home-feature-card__link-icon" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
