import type { Metadata } from "next";
import { PeersPageView } from "@/components/explorer/PeersPageView";
import { pageMetadata, staticPageSeo } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata(staticPageSeo.vrmPeers);

export default function VrmPeersPage() {
  return <PeersPageView chainId="vrm" coinName="Verium" />;
}
