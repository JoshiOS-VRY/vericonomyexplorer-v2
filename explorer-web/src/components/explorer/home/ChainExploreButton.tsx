import Link from 'next/link';
import { CHAIN_EXPLORERS } from '@/lib/chainDisplay';
import { cn } from '@/lib/utils';

type ChainExploreButtonProps = {
  chainId: 'vrm' | 'vrc';
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
};

export function ChainExploreButton({
  chainId,
  label,
  size = 'md',
  className,
}: ChainExploreButtonProps) {
  const config = CHAIN_EXPLORERS[chainId];

  if (!config.exploreHref) {
    return null;
  }

  return (
    <Link
      href={config.exploreHref}
      prefetch
      className={cn(
        'chain-explore-btn rounded-lg',
        chainId === 'vrm' ? 'chain-explore-btn-vrm' : 'chain-explore-btn-vrc',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        className
      )}
    >
      {label ?? `Explore ${config.name}`}
    </Link>
  );
}
