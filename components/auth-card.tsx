'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { BlurFade } from './magicui/blur-fade';
import { ShimmerButton } from './magicui/shimmer-button';
import { cn } from '@/lib/utils';

export function AuthCard({
  onSuccess,
  wide = false
}: {
  onSuccess?: () => void;
  wide?: boolean;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('');
    setIsError(false);
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Authentication failed.');
      if (data.email) {
        if (onSuccess) onSuccess();
        else window.location.href = '/dashboard';
      } else {
        setStatus(data.message ?? 'Check your email to confirm your account, then sign in.');
      }
    } catch (error) {
      setIsError(true);
      setStatus(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    if (busy) return;
    setBusy(true);
    setStatus('');
    setIsError(false);
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'google' })
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Google sign-in is unavailable.');
      window.location.href = data.url;
    } catch (error) {
      setIsError(true);
      setStatus(error instanceof Error ? error.message : 'Google sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <BlurFade className={wide ? 'w-full md:w-auto' : undefined}>
      <div
        className={cn(
          'mx-auto w-full overflow-hidden bg-white',
          wide
            ? 'flex min-h-screen flex-col md:grid md:min-h-0 md:max-w-[880px] md:grid-cols-12 md:rounded-[28px] md:border md:border-slate-900/[0.08] md:shadow-[0_28px_70px_-18px_rgba(11,37,69,0.22)]'
            : 'max-w-[420px] rounded-[28px] border border-slate-900/[0.08] shadow-[0_28px_70px_-18px_rgba(11,37,69,0.22)]'
        )}
      >
        {/* Creative curved geometric header / left desktop panel */}
        <div
          className={cn(
            'relative overflow-hidden bg-[#f1f3f6]',
            wide ? 'h-48 shrink-0 md:col-span-5 md:flex md:h-auto md:flex-col md:justify-between md:p-8' : 'h-40'
          )}
        >
          <div className="absolute -left-10 -top-12 h-48 w-56 rounded-full bg-[#e85334]" />
          <div className={cn(
            'absolute rounded-full bg-[#0b2545]',
            wide ? '-right-10 -top-8 h-44 w-48 md:-bottom-32 md:-right-20 md:top-auto md:h-52 md:w-52 md:opacity-95' : '-right-8 -top-10 h-44 w-52'
          )} />

          {!wide && (
            <svg
              aria-hidden="true"
              viewBox="0 0 400 48"
              preserveAspectRatio="none"
              className="absolute bottom-0 left-0 h-10 w-full fill-white"
            >
              <path d="M0,24 C120,54 280,0 400,28 L400,48 L0,48 Z" />
            </svg>
          )}
          {wide && (
            <svg
              aria-hidden="true"
              viewBox="0 0 400 48"
              preserveAspectRatio="none"
              className="absolute bottom-0 left-0 h-10 w-full fill-white md:hidden"
            >
              <path d="M0,24 C120,54 280,0 400,28 L400,48 L0,48 Z" />
            </svg>
          )}

          {/* Brand badge */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className={cn(
              'z-10 grid h-14 w-14 place-items-center rounded-2xl border border-slate-900/[0.06] bg-white shadow-lg',
              wide
                ? 'absolute bottom-3 left-1/2 -translate-x-1/2 md:static md:translate-x-0'
                : 'absolute bottom-3 left-1/2 -translate-x-1/2'
            )}
          >
            <svg className="h-8 w-8" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <rect width="64" height="64" rx="16" fill="#141518" />
              <path
                d="M18 22.5C18 19.4624 20.4624 17 23.5 17H40.5C43.5376 17 46 19.4624 46 22.5V35.5C46 38.5376 43.5376 41 40.5 41H28L20 47V41H23.5C20.4624 41 18 38.5376 18 35.5V22.5Z"
                fill="white"
              />
              <path d="M29 24L38 29L29 34V24Z" fill="#e85334" />
              <circle cx="47" cy="47" r="4" fill="#e85334" />
            </svg>
          </motion.div>

          {wide && (
            <div className="relative z-10 hidden rounded-2xl bg-white/90 p-4 shadow-sm backdrop-blur-sm md:block">
              <h2 className="text-xl font-bold tracking-tight text-[#141518]">
                Turn comments into{' '}
                <span className="text-[#e85334]">daily Shorts</span>
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#4b5563]">
                Unlock all 3 viewer-backed scripts, competitor comment spy, and automated delivery on your schedule.
              </p>
              <div className="mt-3.5 rounded-xl border border-slate-900/10 bg-[#f8f9fb] p-3">
                <p className="text-[11px] font-bold text-[#0b2545]">Included with your account</p>
                <p className="mt-1 text-[11px] text-[#646975]">
                  Unlimited script unlocks · Reply sticker PNGs · 48h / 72h / Weekly sync
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={cn('px-6 pb-8 pt-3', wide && 'flex flex-1 flex-col justify-center md:col-span-7 md:p-9')}>
          <div className={cn('text-center', wide && 'md:text-left')}>
            <h1 className="text-xl font-bold tracking-tight text-[#141518] sm:text-2xl">
              Clip<span className="text-[#e85334]">Spill</span>
            </h1>
            <p className="mt-1 text-xs text-[#646975]">
              {mode === 'signin' ? 'Sign in to unlock all 3 scripts & automation' : 'Create your creator account'}
            </p>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            <label className="grid gap-1 text-xs font-medium text-[#646975]">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@creator.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-900/15 bg-white px-3.5 py-2.5 text-sm text-[#141518] placeholder:text-slate-400 focus:border-[#0b2545] focus:outline-none"
              />
            </label>

            <label className="grid gap-1 text-xs font-medium text-[#646975]">
              <span>Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="8+ characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-900/15 bg-white py-2.5 pl-3.5 pr-10 text-sm text-[#141518] placeholder:text-slate-400 focus:border-[#0b2545] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#646975] hover:text-[#141518]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {status && (
              <p className={`rounded-xl px-3 py-2 text-xs font-medium ${isError ? 'bg-[#e85334]/10 text-[#c93f22]' : 'bg-emerald-50 text-emerald-700'}`}>
                {status}
              </p>
            )}

            {busy && (
              <div className="space-y-2 rounded-xl bg-[#f8f9fb] p-3 text-center">
                <div className="mx-auto h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full w-1/2 rounded-full bg-[#e85334]"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 1.0, ease: 'easeInOut' }}
                  />
                </div>
                <p className="text-[11px] font-medium text-[#646975]">Signing in…</p>
              </div>
            )}

            <ShimmerButton
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-[#0b2545] text-xs font-semibold shadow-md hover:bg-[#123663]"
            >
              <Sparkles size={13} className={busy ? 'animate-spin text-[#e85334]' : 'text-[#e85334]'} />
              <span>{busy ? 'Signing in…' : mode === 'signin' ? 'Login' : 'Create Account'}</span>
            </ShimmerButton>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-900/10" />
            <span className="text-[11px] font-medium text-[#646975]">or</span>
            <span className="h-px flex-1 bg-slate-900/10" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={googleSignIn}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-900/15 bg-white text-xs font-semibold text-[#141518] shadow-sm transition hover:bg-[#f8f9fb]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
              <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="mt-5 flex items-center justify-between text-xs text-[#646975]">
            <Link href="/" className="underline-offset-2 hover:text-[#141518] hover:underline">
              Continue without registration
            </Link>
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setStatus(''); }}
              className="font-semibold text-[#0b2545] underline-offset-2 hover:underline"
            >
              {mode === 'signin' ? 'Sign Up' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    </BlurFade>
  );
}
