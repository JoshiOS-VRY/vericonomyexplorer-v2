import Link from "next/link";
import { VrmAddressLink } from "@/components/explorer/address/VrmAddressLink";
import { chainAddressPath, type ChainId } from "@/lib/chainDisplay";
import { cn, ellipsizeMiddle } from "@/lib/utils";

export function ChainAddressLink({
  chainId,
  address,
  maxLength = 24,
  className,
  prefetch,
  showFullAddress = false,
}: {
  chainId: ChainId;
  address: string;
  maxLength?: number;
  className?: string;
  prefetch?: boolean;
  showFullAddress?: boolean;
}) {
  if (chainId === "vrm") {
    return (
      <VrmAddressLink
        address={address}
        maxLength={maxLength}
        className={className}
        prefetch={prefetch}
        showFullAddress={showFullAddress}
      />
    );
  }

  return (
    <Link
      href={chainAddressPath(chainId, address)}
      title={address}
      prefetch={prefetch}
      className={cn(
        "text-sm font-medium text-accent hover:underline hash-mono",
        className,
      )}
    >
      {showFullAddress ? address : ellipsizeMiddle(address, maxLength)}
    </Link>
  );
}
