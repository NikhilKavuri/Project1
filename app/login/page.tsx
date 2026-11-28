import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthCard } from '@/components/auth-card';

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-white md:grid md:place-items-center md:bg-[#f1f3f6] md:px-4 md:py-6">
      <div className="w-full md:max-w-[880px]">
        <Link
          href="/"
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#141518] shadow-sm backdrop-blur-sm transition hover:bg-white md:static md:mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to home
        </Link>
        <AuthCard wide />
      </div>
    </main>
  );
}
