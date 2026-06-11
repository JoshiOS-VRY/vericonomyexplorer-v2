'use client';

import { useRelativeTimeTick } from '@/components/explorer/RelativeTimeProvider';
import { cn, formatBlockAge, formatUnixTime } from '@/lib/utils';
import { useEffect, useState } from 'react';

export type LiveRelativeTimeInterval = 'second' | 'minute';

export function LiveRelativeTime({
  time,
  className,
  interval = 'second',
  fixedWidth = false,
}: {
  time: number | null;
  className?: string;
  /** All block ages typically use "second". */
  interval?: LiveRelativeTimeInterval;
  /** Reserve fixed width in tables so adjacent columns do not shift. */
  fixedWidth?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const tick = useRelativeTimeTick(interval);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!time) {
    return <span className={className}>—</span>;
  }

  const title = formatUnixTime(time);
  const classes = cn(fixedWidth && 'bc-age-text', className);

  if (!mounted) {
    return (
      <span className={classes} title={title} aria-hidden="true">
        {'\u00a0'}
      </span>
    );
  }

  void tick;

  return (
    <span className={classes} title={title}>
      {formatBlockAge(time)}
    </span>
  );
}
