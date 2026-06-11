import { cookies } from 'next/headers';
import { AlertBanner } from '@/components/explorer/ExplorerUi';

export async function UserMessageBanner() {
  const cookieStore = await cookies();
  const message = cookieStore.get('explorer_message')?.value;
  if (!message) return null;

  return (
    <>
      <AlertBanner title="Notice" tone="accent">
        {message}
      </AlertBanner>
      <script
        dangerouslySetInnerHTML={{
          __html: 'fetch("/api/session/clear-message",{method:"POST"}).catch(function(){});',
        }}
      />
    </>
  );
}
