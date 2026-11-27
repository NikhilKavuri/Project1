import { Dashboard } from '@/components/dashboard';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <Dashboard testMode={process.env.CLIPSPILL_ENGINE_TEST === '1'} />;
}
