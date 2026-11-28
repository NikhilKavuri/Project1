import { cookies } from 'next/headers';
import { Studio } from '@/components/studio';
import { liveReady } from '@/lib/preview/live';

export const dynamic = 'force-dynamic';

export default function Home() {
  const cookieStore = cookies();
  const initialLoggedIn = Boolean(cookieStore.get('clipspill-access')?.value || cookieStore.get('clipspill-refresh')?.value);
  return <Studio live={liveReady()} initialLoggedIn={initialLoggedIn} />;
}
