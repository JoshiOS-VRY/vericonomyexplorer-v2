import type { Metadata } from "next";
import {
  AlertBanner,
  formatHeight,
} from "@/components/explorer/ExplorerUi";
import { BcPageHeader } from "@/components/explorer/BlockchairUi";
import { RichlistLiveTable } from "@/components/explorer/richlist/RichlistLiveTable";
import { getRichlist } from "@/lib/api/indexer";
import { formatExplorerUserMessage } from "@/lib/explorerCopy";
import { normalizeLimit, normalizeOffset } from "@/lib/utils";
import { pageMetadata, staticPageSeo } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata(staticPageSeo.vrcRichlist);

export const revalidate = 30;

export default async function VrcRichlistPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const limit = normalizeLimit(params.limit, 50);
  const offset = normalizeOffset(params.offset);

  let richlist;
  try {
    richlist = await getRichlist("vrc", { limit, offset });
  } catch {
    return (
      <AlertBanner title="Richlist Unavailable">
        Unable to load VRC richlist.
      </AlertBanner>
    );
  }

  if (!richlist.enabled && richlist.message) {
    return (
      <div className="space-y-6">
        <BcPageHeader
          title="Rich list"
          subtitle="Top VRC addresses by balance."
        />
        <AlertBanner title="Richlist Unavailable">
          {formatExplorerUserMessage(richlist.message)}
        </AlertBanner>
      </div>
    );
  }

  const paging = richlist.paging ?? {
    limit,
    offset,
    total: richlist.items.length,
    hasMore: false,
  };
  const from = paging.offset + 1;
  const to = Math.min(paging.offset + paging.limit, paging.total);

  return (
    <div className="space-y-6">
      <BcPageHeader
        title="Rich list"
        subtitle={`Showing ${formatHeight(from)}–${formatHeight(to)} of ${formatHeight(paging.total)} addresses`}
      />

      <RichlistLiveTable
        chainId="vrc"
        initialRichlist={richlist}
        basePath="/vrc/richlist"
        limit={limit}
        offset={offset}
      />
    </div>
  );
}
