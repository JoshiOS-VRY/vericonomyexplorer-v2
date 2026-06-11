import type { Metadata } from 'next';
import { PeersPageView } from '@/components/explorer/PeersPageView';
import { pageMetadata, staticPageSeo } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata(staticPageSeo.vrcPeers);

export default function VrcPeersPage() {
  return <PeersPageView chainId="vrc" coinName="Vericoin" />;
}
