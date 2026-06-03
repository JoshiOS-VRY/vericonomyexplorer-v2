import Link from "next/link";
import { chainAddressPath } from "@/lib/chainDisplay";
import {
  VERIUM_POOL_DISPLAY_NAME,
  isVeriumPoolPayoutAddress,
  veriumPoolPillClassName,
} from "@/lib/veriumPoolExtracted";
import { cn, ellipsizeMiddle } from "@/lib/utils";

export function VrmAddressLabel({
  address,
  maxLength = 18,
}: {
  address: string;
  maxLength?: number;
}) {
  if (isVeriumPoolPayoutAddress(address)) {
    return (
      <span className={veriumPoolPillClassName()}>{VERIUM_POOL_DISPLAY_NAME}</span>
    );
  }

  return <>{ellipsizeMiddle(address, maxLength)}</>;
}

export function VrmAddressLink({
  address,
  maxLength = 24,
  className,
  prefetch,
  showFullAddress = false,
}: {
  address: string;
  maxLength?: number;
  className?: string;
  prefetch?: boolean;
  /** Show full address instead of ellipsized (still uses pool pill when applicable). */
  showFullAddress?: boolean;
}) {
  const isPool = isVeriumPoolPayoutAddress(address);
  const display = isPool
    ? VERIUM_POOL_DISPLAY_NAME
    : showFullAddress
      ? address
      : ellipsizeMiddle(address, maxLength);

  return (
    <Link
      href={chainAddressPath("vrm", address)}
      title={address}
      prefetch={prefetch}
      className={cn(
        isPool
          ? veriumPoolPillClassName()
          : "text-sm font-medium text-accent hover:underline hash-mono",
        className,
      )}
    >
      {display}
    </Link>
  );
}
