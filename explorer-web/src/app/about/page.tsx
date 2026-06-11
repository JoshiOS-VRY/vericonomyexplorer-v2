import type { Metadata } from 'next';
import { StaticInfoPage } from '@/components/legacy/LegacyViews';
import { pageMetadata, staticPageSeo } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata(staticPageSeo.about);

export default function AboutPage() {
  return (
    <StaticInfoPage title="About VeriConomy Explorer">
      <p>VeriConomy Explorer is a self-hosted blockchain explorer for VeriCoin and Verium.</p>
    </StaticInfoPage>
  );
}
