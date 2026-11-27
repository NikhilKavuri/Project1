import { Studio } from '@/components/studio';
import { liveReady } from '@/lib/preview/live';

export const dynamic = 'force-dynamic';

export default function Home() {
  return <Studio live={liveReady()} />;
}
