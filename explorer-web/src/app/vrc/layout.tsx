import type { Metadata } from 'next';
import { chainSectionMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = chainSectionMetadata('vrc');

export default function VrcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
