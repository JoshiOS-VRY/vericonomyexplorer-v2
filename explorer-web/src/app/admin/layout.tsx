import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Admin',
  description: 'Vericonomy Explorer administration.',
  path: '/admin',
  noIndex: true,
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
