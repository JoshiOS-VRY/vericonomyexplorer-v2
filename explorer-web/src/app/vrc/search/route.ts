import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { searchChain } from '@/lib/api/indexer';
import { sanitizeSearchQuery } from '@/lib/searchSuggestions';

export async function POST(request: Request) {
  const formData = await request.formData();
  const query = sanitizeSearchQuery(String(formData.get('query') || ''));

  if (!query) {
    const cookieStore = await cookies();
    cookieStore.set(
      'explorer_message',
      'Enter a VeriCoin block height, block hash, txid, or address.',
      {
        path: '/',
        maxAge: 60,
      }
    );
    redirect('/vrc');
  }

  try {
    const target = await searchChain('vrc', query);
    if (target) {
      redirect(target);
    }
    const cookieStore = await cookies();
    cookieStore.set('explorer_message', `No VeriCoin result found for query: ${query}`, {
      path: '/',
      maxAge: 60,
    });
    redirect('/vrc');
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    const cookieStore = await cookies();
    cookieStore.set(
      'explorer_message',
      `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { path: '/', maxAge: 60 }
    );
    redirect('/vrc');
  }
}
