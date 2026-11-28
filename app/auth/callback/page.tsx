'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function finish() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      const errMsg = query.get('error_description') || hash.get('error_description');
      if (errMsg) {
        setError(errMsg);
        return;
      }

      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');
      const expires_in = Number(hash.get('expires_in') || 3600);

      if (!access_token || !refresh_token) {
        router.replace('/dashboard');
        return;
      }

      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'oauth_session', access_token, refresh_token, expires_in })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not complete Google sign-in.');
        return;
      }
      router.replace('/dashboard');
    }
    void finish();
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-[#f1f3f6] p-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-900/10 bg-white p-7 text-center shadow-xl">
        {error ? (
          <>
            <p className="text-sm font-semibold text-[#e85334]">{error}</p>
            <Link href="/login" className="mt-4 inline-block rounded-full bg-[#141518] px-5 py-2 text-xs font-semibold text-white">
              Back to Login
            </Link>
          </>
        ) : (
          <div className="space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#0b2545] text-white shadow-md"
            >
              <Sparkles size={18} className="text-[#e85334]" />
            </motion.div>
            <p className="text-sm font-semibold text-[#141518]">Signing you in…</p>
            <div className="mx-auto h-1.5 w-44 overflow-hidden rounded-full bg-[#f1f3f6]">
              <motion.div
                className="h-full w-1/2 rounded-full bg-[#e85334]"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
