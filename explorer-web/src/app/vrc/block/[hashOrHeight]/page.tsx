import type { Metadata } from 'next';
import {
  BlockDetailPage,
  blockDetailSearchParams,
} from '@/components/explorer/pages/BlockDetailPage';
import { blockPageMetadata } from '@/lib/seo/dynamic';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hashOrHeight: string }>;
}): Promise<Metadata> {
  const { hashOrHeight } = await params;
  return blockPageMetadata('vrc', hashOrHeight);
}

export default async function VrcBlockPage({
  params,
  searchParams,
}: {
  params: Promise<{ hashOrHeight: string }>;
  searchParams: Promise<{ limit?: string; offset?: string }>;
}) {
  const { hashOrHeight } = await params;
  const { limit, offset } = blockDetailSearchParams(await searchParams);

  return (
    <BlockDetailPage chainId="vrc" hashOrHeight={hashOrHeight} limit={limit} offset={offset} />
  );
}
