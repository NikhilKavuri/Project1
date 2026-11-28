'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Bookmark, Clapperboard, LayoutDashboard, Lock, MessageSquareText, Plus, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { demoDigest } from '../lib/preview/demo';
import { isLockedScript, type Digest, type Inspection } from '../lib/preview/types';
import type { CreatorProfile } from '../lib/creator-profile';
import { normalizeHandle } from '../lib/youtube/normalizeHandle';
import { BentoGrid, BentoTile } from './magicui/bento-grid';
import { BlurFade } from './magicui/blur-fade';
import { NumberTicker } from './magicui/number-ticker';
import { ShimmerButton } from './magicui/shimmer-button';
import { ScriptCard } from './script-card';
import { cn } from '@/lib/utils';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2.5 text-lg font-bold tracking-tight',
        inverted ? 'text-white' : 'text-[#141518]'
      )}
    >
      <svg className="h-8 w-8 shrink-0" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={inverted ? '#ffffff' : '#141518'} />
        <path
          d="M18 22.5C18 19.4624 20.4624 17 23.5 17H40.5C43.5376 17 46 19.4624 46 22.5V35.5C46 38.5376 43.5376 41 40.5 41H28L20 47V41H23.5C20.4624 41 18 38.5376 18 35.5V22.5Z"
          fill={inverted ? '#0b2545' : '#ffffff'}
        />
        <path d="M29 24L38 29L29 34V24Z" fill="#e85334" />
        <circle cx="47" cy="47" r="4" fill="#e85334" />
      </svg>
      <span>
        Clip<span className="text-[#e85334]">Spill</span>
      </span>
    </Link>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto flex h-[280px] w-full max-w-[380px] items-center justify-center overflow-hidden px-3 sm:h-[340px] sm:max-w-[420px] sm:overflow-visible sm:px-0">
      {/* Subtle geometric wireframe */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-15" viewBox="0 0 400 340" fill="none">
        <polygon points="200,25 350,275 50,275" stroke="#141518" strokeWidth="1.2" />
        <circle cx="200" cy="175" r="110" stroke="#141518" strokeWidth="1" strokeDasharray="4 6" />
      </svg>

      {/* Main floating script card */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
        className="relative z-10 w-56 rounded-2xl border border-slate-900/10 bg-white p-3.5 text-[#141518] shadow-xl sm:w-64 sm:p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-[#e85334]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e85334]">
            35s Short Ready
          </span>
          <span className="text-[11px] font-bold text-[#141518] sm:text-xs">84 Demand</span>
        </div>
        <p className="mt-2 text-xs font-bold leading-snug sm:mt-2.5 sm:text-sm">Best helmet mic under ₹2,000?</p>
        <div className="mt-2.5 space-y-1.5 text-[10px] text-[#646975] sm:mt-3 sm:text-[11px]">
          <div className="rounded-lg bg-[#f1f3f6] px-2.5 py-1.5 font-medium text-[#141518]">
            0–3s · Comment-Reply Hook
          </div>
          <div className="rounded-lg bg-[#f1f3f6] px-2.5 py-1.5">
            3–28s · Side-by-side wind test
          </div>
        </div>
      </motion.div>

      {/* Floating viewer comment chip */}
      <motion.div
        animate={{ y: [0, 8, 0], x: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut', delay: 0.4 }}
        className="absolute left-2 top-4 z-20 max-w-[210px] rounded-2xl border border-slate-900/10 bg-[#141518] px-3 py-2 text-white shadow-xl sm:left-0 sm:top-8 sm:max-w-none sm:px-3.5 sm:py-2.5"
      >
        <p className="text-[10px] font-semibold text-white/70">@arjun_rides · 18 likes</p>
        <p className="mt-0.5 truncate text-[11px] font-medium sm:text-xs">&ldquo;bhai helmet mic link dede&rdquo;</p>
      </motion.div>

      {/* Floating Top-Short DNA badge */}
      <motion.div
        animate={{ y: [0, -7, 0], x: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 4.1, ease: 'easeInOut', delay: 0.8 }}
        className="absolute bottom-5 right-2 z-20 flex items-center gap-2 rounded-2xl bg-[#e85334] px-3 py-1.5 text-white shadow-xl sm:bottom-8 sm:right-2 sm:px-3.5 sm:py-2"
      >
        <TrendingUp size={14} />
        <div className="text-left">
          <p className="text-[9px] font-medium text-white/85 sm:text-[10px]">Outlier DNA</p>
          <p className="text-[11px] font-bold sm:text-xs">184K views · 168 WPM</p>
        </div>
      </motion.div>
    </div>
  );
}

export function Studio({
  live,
  embedded = false,
  initialLoggedIn = false
}: {
  live: boolean;
  embedded?: boolean;
  initialLoggedIn?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [peers, setPeers] = useState<string[]>([]);
  const [customPeer, setCustomPeer] = useState('');
  const [digest, setDigest] = useState<Digest | null>(null);
  const [savedDigests, setSavedDigests] = useState<Digest[]>([]);
  const [locationLabel, setLocationLabel] = useState('');
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [remainingTries, setRemainingTries] = useState<number>(2);
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [paywallModal, setPaywallModal] = useState<{ open: boolean; handle: string; newComments: number }>({
    open: false,
    handle: '',
    newComments: 0
  });

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      let profile: Partial<CreatorProfile> | null = null;
      try {
        const [acct, tries] = await Promise.all([
          fetch('/api/account').then(r => (r.ok ? r.json() : null)),
          fetch('/api/preview').then(r => (r.ok ? r.json() : null))
        ]);
        if (active && typeof tries?.remainingTries === 'number') {
          setRemainingTries(tries.remainingTries);
        }
        if (acct?.email) {
          if (active) setLoggedIn(true);
          const dashRes = await fetch('/api/dashboard');
          if (dashRes.ok) {
            const dash = await dashRes.json();
            if (!dash.account?.onboarded && !embedded) {
              window.location.href = '/dashboard';
              return;
            }
            if (active && dash.account) {
              if (dash.account.channelHandle) setQuery(prev => prev || dash.account.channelHandle);
              if (Array.isArray(dash.account.competitorHandles)) setPeers(dash.account.competitorHandles.slice(0, 5));
              if (dash.account.city && dash.account.country) setLocationLabel(`${dash.account.city}, ${dash.account.country}`);
              if (Array.isArray(dash.account.digests)) setSavedDigests(dash.account.digests.slice(0, 3));
            }
          }
          const response = await fetch('/api/workspace');
          if (response.ok) profile = (await response.json()).profile;
        } else if (active) {
          setLoggedIn(false);
        }
      } catch {
        // Offline/local fallback
      }
      try {
        profile ??= JSON.parse(localStorage.getItem('clipspill-profile') ?? 'null');
        if (!active || !profile) return;
        if (profile.channel_handle) setQuery(prev => prev || profile?.channel_handle || '');
        if (Array.isArray(profile.competitor_handles) && profile.competitor_handles.length) {
          setPeers(prev => (prev.length ? prev : profile?.competitor_handles?.slice(0, 3) ?? []));
        }
      } catch {
        // Fresh workspace
      }
    }
    void loadInitial();
    return () => { active = false; };
  }, [embedded]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const trimmed = query.trim();
    setMessage('');

    if (!live) {
      setDigest(demoDigest('moto'));
      setSelected(0);
      return;
    }
    if (!trimmed && !peers.length) {
      setMessage('Enter a @handle, URL, or topic.');
      return;
    }

    setBusy(true);
    setInspection(null);
    try {
      const ref = normalizeHandle(trimmed);
      let activePeers = peers;
      let topicLabel = trimmed;

      if (!ref && trimmed) {
        const discRes = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'discover', topic: trimmed })
        });
        if (discRes.ok) {
          const disc = await discRes.json() as { nicheLabel: string; peerHandles: string[] };
          topicLabel = disc.nicheLabel || trimmed;
          if (!activePeers.length) activePeers = disc.peerHandles.slice(0, 3);
          setPeers(activePeers);
        }
      }

      const previewRes = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: ref ? trimmed : '',
          topic: ref ? '' : topicLabel,
          peers: activePeers
        })
      });

      const rawText = await previewRes.text();
      const payload = rawText ? JSON.parse(rawText) : {};
      if (typeof payload.remainingTries === 'number') {
        setRemainingTries(payload.remainingTries);
      }

      if (previewRes.status === 402 || payload.code === 'PREVIEW_ALREADY_USED') {
        setPaywallModal({
          open: true,
          handle: payload.channelHandle || trimmed,
          newComments: payload.newCommentCount ?? 0
        });
        return;
      }
      if (!previewRes.ok) {
        throw new Error(payload.error ?? 'Scan could not finish.');
      }

      setInspection(null);
      setDigest(payload as Digest);
      setSelected(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Scan could not finish.');
    } finally {
      setBusy(false);
    }
  }

  function addPeer() {
    const normalized = normalizeHandle(customPeer);
    if (!normalized || normalized.kind !== 'handle') {
      setMessage('Enter a valid @handle.');
      return;
    }
    if (peers.some(peer => peer.toLowerCase() === normalized.value.toLowerCase())) {
      setMessage('Creator already added.');
      return;
    }
    if (peers.length >= 5) {
      setMessage('Up to 5 creators.');
      return;
    }
    setPeers(previous => [...previous, normalized.value]);
    setCustomPeer('');
    setMessage('');
  }

  async function save() {
    if (!digest) return;
    try {
      const account = await fetch('/api/account').then(response => response.json());
      if (account.email) {
        const response = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'digest', digest })
        });
        if (!response.ok) throw new Error((await response.json()).error ?? 'Cloud save failed.');
        setMessage('Saved to cloud.');
        return;
      }
      if (account.error) throw new Error(account.error);
      const previous = JSON.parse(localStorage.getItem('clipspill-digests') ?? '[]') as Digest[];
      localStorage.setItem('clipspill-digests', JSON.stringify([digest, ...previous.filter(item => item.id !== digest.id)].slice(0, 20)));
      setMessage('Saved locally.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save.');
    }
  }

  const script = digest?.scripts[selected] ?? null;
  const totalQuestions = digest?.scripts.reduce((sum, item) => sum + item.questions, 0) ?? 0;
  const totalDemand = digest?.scripts.reduce((sum, item) => sum + item.score, 0) ?? 0;
  const maxScore = digest?.scripts.length ? Math.max(...digest.scripts.map(item => item.score), 1) : 1;
  const showLandingHero = !loggedIn && !digest && !busy && !embedded;

  const modal = (
    <AnimatePresence>
      {paywallModal.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-[#141518]/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-900/10 bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close modal"
              onClick={() => setPaywallModal({ ...paywallModal, open: false })}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-[#f1f3f6] text-[#646975] hover:text-[#141518]"
            >
              <X size={15} />
            </button>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e85334]/10 text-[#e85334]">
              <Lock size={18} />
            </div>
            <h2 id="paywall-title" className="mt-4 text-lg font-semibold text-[#141518]">
              1-Time Free Audit Used — Unlock Automatic Delivery
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#646975]">
              {paywallModal.handle ? `${paywallModal.handle} ` : ''}
              {paywallModal.newComments > 0 ? `has ${paywallModal.newComments} viewer questions ready. ` : ''}
              Sign in and upgrade via Razorpay UPI AutoPay or Stripe to unlock Scripts #2 &amp; #3 and unlimited scans.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/login"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#e85334] px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-[#d64527]"
              >
                Sign in to Unlock <ArrowUpRight size={14} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const scanResultsSection = (
    <div className="space-y-5">
      {!busy && (message || inspection?.message || digest?.notes[0]) && (
        <BlurFade>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-900/10 bg-white px-4 py-2.5 text-xs font-medium text-[#141518] shadow-sm">
            <span>{message || inspection?.message || digest?.notes[0]}</span>
            {digest?.niche && (
              <span className="rounded-full bg-[#f1f3f6] px-2.5 py-0.5 font-semibold text-[#141518]">
                {digest.niche}
              </span>
            )}
          </div>
        </BlurFade>
      )}

      {busy && (
        <BlurFade>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-900/10 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-[#f1f3f6]">
              <motion.div
                className="h-full w-1/2 rounded-full bg-[#e85334]"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />
            </div>
            <p className="mt-3 text-xs font-medium text-[#646975]">
              Reading viewer questions &amp; building scripts…
            </p>
          </div>
        </BlurFade>
      )}

      {digest && !busy && (
        <BentoGrid>
          <div className={cn('space-y-4', embedded ? 'md:col-span-12' : 'md:col-span-8')}>
            <BlurFade delay={0.04}>
              <BentoTile className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {digest.channel && (
                      digest.channel.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={digest.channel.avatarUrl}
                          alt={digest.channel.title}
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 rounded-full border border-slate-900/10 object-cover"
                        />
                      ) : (
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#141518] text-sm font-bold text-white">
                          {digest.channel.title.slice(0, 1).toUpperCase()}
                        </div>
                      )
                    )}
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-[#141518] sm:text-xl">
                        {digest.channel ? digest.channel.title : 'Question Demand'}
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-[#646975]">
                        {digest.channel
                          ? `${digest.channel.handle}${digest.channel.subscriberCount !== null ? ` · ${digest.channel.subscriberCount.toLocaleString()} subscribers` : ''} · `
                          : ''}
                        {digest.niche} · {digest.source === 'peers' ? 'Growth Mode' : 'Channel'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-900/[0.08] bg-[#f1f3f6] px-3 py-1 text-xs font-medium text-[#141518]">
                      {totalQuestions} questions
                    </span>
                    {loggedIn && (
                      <button
                        type="button"
                        onClick={save}
                        disabled={!digest.scripts.length}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/[0.08] bg-white px-3 py-1 text-xs font-medium text-[#141518] transition hover:bg-[#f1f3f6]"
                      >
                        <Bookmark size={12} /> Save
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-3xl font-bold tracking-tight text-[#141518] sm:text-4xl">
                      <NumberTicker value={totalDemand} />
                    </div>
                    <p className="mt-1 text-xs text-[#646975]">
                      Total demand score across {digest.scripts.length} scripts
                    </p>
                  </div>

                  <div className="flex items-end gap-4 sm:gap-6">
                    {digest.scripts.map((item, index) => {
                      const height = Math.max(22, Math.round((item.score / maxScore) * 76));
                      const active = selected === index;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelected(index)}
                          className="group flex flex-col items-center gap-2"
                        >
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium transition',
                            active ? 'bg-[#141518] text-white' : 'text-[#646975]'
                          )}>
                            {item.score}
                          </span>
                          <div className="flex h-20 w-7 items-end justify-center rounded-full bg-[#f1f3f6] p-1">
                            <div
                              style={{ height: `${height}%` }}
                              className={cn(
                                'w-full rounded-full transition-all duration-300',
                                active ? 'bg-[#e85334]' : 'bg-slate-300 group-hover:bg-slate-400'
                              )}
                            />
                          </div>
                          <span className={cn(
                            'grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition',
                            active ? 'bg-[#141518] text-white' : 'bg-[#f1f3f6] text-[#646975]'
                          )}>
                            {index + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </BentoTile>
            </BlurFade>

            {script ? (
              <ScriptCard
                key={script.id}
                script={script}
                onUnlockRequest={() => setPaywallModal({ open: true, handle: query.trim() || digest.niche, newComments: totalQuestions })}
              />
            ) : (
              <BentoTile className="py-10 text-center text-sm text-[#646975]">
                No qualifying questions found. Try another @handle or topic.
              </BentoTile>
            )}
          </div>

          {!embedded && (
            <div className="space-y-4 md:col-span-4">
              <BlurFade delay={0.08}>
                <BentoTile className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#141518]">Topics</h2>
                    {loggedIn && (
                      <Link href="/dashboard" className="text-xs font-medium text-[#646975] underline-offset-2 hover:text-[#141518] hover:underline">
                        All digests
                      </Link>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {digest.scripts.map((item, index) => {
                      const active = selected === index;
                      const locked = isLockedScript(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelected(index)}
                          className={cn(
                            'flex w-full items-start justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all',
                            active
                              ? 'border-[#141518]/15 bg-[#f1f3f6]'
                              : 'border-slate-900/[0.06] bg-white hover:bg-[#f1f3f6]/60'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {locked && <Lock size={12} className="shrink-0 text-[#e85334]" />}
                              <span className="truncate text-sm font-semibold text-[#141518]">{item.title}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[#646975]">
                              <span>{item.questions} questions</span>
                              <span>·</span>
                              <span>{item.likes} likes</span>
                            </div>
                          </div>
                          <span className={cn(
                            'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                            active ? 'bg-[#141518] text-white' : 'bg-[#f1f3f6] text-[#646975]'
                          )}>
                            {item.score}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </BentoTile>
              </BlurFade>

              <BlurFade delay={0.12}>
                <BentoTile className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#141518]">Tracked Creators</h2>
                    <span className="rounded-full bg-[#f1f3f6] px-2 py-0.5 text-[10px] font-semibold text-[#141518]">AI + DB</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {peers.length ? peers.map(peer => (
                      <span
                        key={peer}
                        className="inline-flex items-center gap-1 rounded-full bg-[#f1f3f6] px-3 py-1 text-xs font-medium text-[#141518]"
                      >
                        {peer}
                        <button
                          type="button"
                          aria-label={`Remove ${peer}`}
                          onClick={() => setPeers(prev => prev.filter(p => p !== peer))}
                          className="text-[#646975] hover:text-[#e85334]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )) : (
                      <span className="text-xs text-[#646975]">Auto-discovered on scan</span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      aria-label="Add creator handle"
                      placeholder="@handle"
                      value={customPeer}
                      maxLength={80}
                      disabled={busy}
                      onChange={event => setCustomPeer(event.target.value)}
                      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addPeer(); } }}
                      className="w-full rounded-full border border-slate-900/10 bg-[#f1f3f6] px-3.5 py-2 text-xs text-[#141518] placeholder:text-[#9ca3af] focus:border-[#e85334] focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addPeer}
                      disabled={busy}
                      aria-label="Add creator"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#141518] text-white transition hover:bg-slate-800"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </BentoTile>
              </BlurFade>
            </div>
          )}
        </BentoGrid>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-900/[0.08] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-[#141518]">
            Viewer questions to <span className="text-[#e85334]">ready scripts</span>
          </h2>
          <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Search channel or topic"
              placeholder="Search @channel, URL, or topic..."
              value={query}
              disabled={busy}
              maxLength={600}
              onChange={event => { setQuery(event.target.value); setMessage(''); }}
              className="flex-1 rounded-full border border-slate-900/10 bg-[#f1f3f6] px-4 py-2.5 text-sm text-[#141518] placeholder:text-[#9ca3af] focus:border-[#e85334] focus:bg-white focus:outline-none"
            />
            <ShimmerButton type="submit" disabled={busy}>
              <Sparkles size={13} className={cn('text-[#e85334]', busy && 'animate-spin')} />
              <span>{busy ? 'Scanning…' : 'Scan'}</span>
            </ShimmerButton>
          </form>
        </div>
        {loggedIn && !digest && !busy && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <BlurFade delay={0.03}>
              <BentoTile className="flex h-full flex-col justify-between p-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e85334]/10 px-2.5 py-1 text-[11px] font-semibold text-[#e85334]">
                    <Sparkles size={11} /> Default Channel
                  </span>
                  <h2 className="mt-3 text-base font-bold text-[#141518]">
                    {query || 'Your YouTube Channel'}
                  </h2>
                  <p className="mt-1 text-xs text-[#646975]">
                    {locationLabel ? `Location: ${locationLabel}` : 'Ready for instant comment scan'}
                  </p>
                </div>
                <ShimmerButton
                  type="button"
                  disabled={!query.trim() || busy}
                  onClick={() => {
                    const form = document.querySelector('form');
                    form?.requestSubmit();
                  }}
                  className="mt-4 w-full bg-[#0b2545]"
                >
                  Scan My Channel
                </ShimmerButton>
              </BentoTile>
            </BlurFade>

            <BlurFade delay={0.07}>
              <BentoTile className="h-full p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b2545]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0b2545]">
                  Niche Peers ({peers.length})
                </span>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {peers.length ? peers.map(peer => (
                    <button
                      key={peer}
                      type="button"
                      onClick={() => setQuery(peer)}
                      className="rounded-full bg-[#f1f3f6] px-3 py-1.5 text-xs font-semibold text-[#141518] transition hover:bg-[#e85334] hover:text-white"
                    >
                      {peer}
                    </button>
                  )) : (
                    <p className="text-xs text-[#646975]">Add competitor handles in Dashboard.</p>
                  )}
                </div>
              </BentoTile>
            </BlurFade>

            <BlurFade delay={0.11}>
              <BentoTile className="h-full p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Recent Digests ({savedDigests.length})
                </span>
                <div className="mt-3 space-y-2">
                  {savedDigests.length ? savedDigests.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setDigest(item); setSelected(0); }}
                      className="flex w-full items-center justify-between rounded-xl bg-[#f1f3f6] px-3 py-2 text-left text-xs transition hover:bg-slate-200/70"
                    >
                      <span className="truncate font-semibold text-[#141518]">{item.niche}</span>
                      <span className="shrink-0 text-[#646975]">{item.scripts.length} scripts</span>
                    </button>
                  )) : (
                    <p className="text-xs text-[#646975]">Your scanned digests will appear here.</p>
                  )}
                </div>
              </BentoTile>
            </BlurFade>
          </div>
        )}

        {scanResultsSection}
        {modal}
      </div>
    );
  }

  if (showLandingHero) {
    return (
      <div className="flex min-h-screen flex-col justify-between overflow-x-hidden bg-white">
        <section className="relative flex-1 overflow-hidden bg-[#f1f3f6] pb-14 text-[#141518] sm:pb-20">
          <div className="mx-auto max-w-[1220px] px-4 pt-4 sm:px-6 md:px-10">
            <header className="flex items-center justify-between gap-3">
              <Brand />
              <div className="flex items-center gap-2.5">
                <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 text-[11px] font-medium text-[#141518] shadow-sm">
                  {remainingTries}/2 free scans left
                </span>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0b2545] px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[#123663]"
                >
                  Log In
                </Link>
              </div>
            </header>

            <div className="mt-6 grid grid-cols-1 items-center gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-12">
              <BlurFade className="lg:col-span-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e85334] sm:text-[11px]">
                  CLIPSPILL · COMMENT-TO-SCRIPT ENGINE
                </span>
                <h1 className="mt-2 text-3xl font-extrabold uppercase leading-[1.03] tracking-tight text-[#141518] sm:text-5xl lg:text-[54px]">
                  Viewer questions to ready scripts
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#646975]">
                  Turn repeated YouTube &amp; Reels viewer questions into 35-second vertical scripts backed by real comment proof.
                </p>

                <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <input
                      aria-label="Search channel or topic"
                      placeholder="Search @channel, URL, or topic..."
                      value={query}
                      disabled={busy}
                      maxLength={600}
                      onChange={event => { setQuery(event.target.value); setMessage(''); }}
                      className="w-full rounded-full border border-slate-900/10 bg-white py-3.5 pl-5 pr-11 text-sm text-[#141518] shadow-[0_10px_28px_-10px_rgba(11,37,69,0.18)] placeholder:text-[#9ca3af] focus:border-[#e85334] focus:outline-none"
                    />
                    <Search size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#646975]" />
                  </div>
                  <ShimmerButton type="submit" disabled={busy} className="h-12 px-7 text-xs font-bold uppercase tracking-wider shadow-[0_12px_28px_-8px_rgba(11,37,69,0.35)]">
                    <Sparkles size={14} className="text-[#e85334]" />
                    <span>{busy ? 'Scanning…' : 'Scan'}</span>
                  </ShimmerButton>
                </form>

                {message && (
                  <p className="mt-3 text-xs font-medium text-[#e85334]">{message}</p>
                )}
              </BlurFade>

              <BlurFade delay={0.12} className="lg:col-span-6">
                <HeroVisual />
              </BlurFade>
            </div>
          </div>

          {/* Smooth wave transition */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1440 90"
            preserveAspectRatio="none"
            className="pointer-events-none absolute bottom-0 left-0 h-12 w-full fill-white sm:h-16"
          >
            <path d="M0,45 C360,95 1080,0 1440,55 L1440,90 L0,90 Z" />
          </svg>
        </section>

        {/* Overlapping 3-column feature cards */}
        <section className="relative z-20 mx-auto -mt-8 w-full max-w-[1140px] px-4 pb-6 sm:-mt-12 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {[
              {
                icon: Search,
                title: 'COMMENT RADAR',
                desc: 'Paste any @handle, video link, or niche topic to surface unanswered questions viewers keep asking.'
              },
              {
                icon: MessageSquareText,
                title: 'EVIDENCE SCORING',
                desc: 'Every script topic is ranked by real viewer demand and linked directly to the original comments.'
              },
              {
                icon: Clapperboard,
                title: '35S VERTICAL SCRIPTS',
                desc: 'Get structured hooks, angle switchers, reply sticker PNGs, and automated delivery on your schedule.'
              }
            ].map((card, index) => {
              const Icon = card.icon;
              return (
                <BlurFade key={card.title} delay={0.08 + index * 0.08}>
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="h-full rounded-2xl border border-slate-900/[0.08] bg-white p-5 text-center text-[#141518] shadow-[0_20px_50px_-12px_rgba(11,37,69,0.16)] transition-shadow hover:shadow-[0_28px_60px_-12px_rgba(11,37,69,0.22)] sm:p-6"
                  >
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f3f6] text-[#e85334] shadow-sm">
                      <Icon size={22} strokeWidth={1.9} />
                    </div>
                    <h2 className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[#141518] sm:text-sm">
                      {card.title}
                    </h2>
                    <p className="mt-2 text-xs leading-relaxed text-[#646975]">
                      {card.desc}
                    </p>
                  </motion.div>
                </BlurFade>
              );
            })}
          </div>
        </section>

        {modal}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <div className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6 md:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-6">
            <Brand />
            <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm font-medium">
              <Link href="/" className="border-b-2 border-[#141518] pb-1 text-[#141518]">Studio</Link>
              {loggedIn && (
                <Link href="/dashboard" className="pb-1 text-[#646975] transition hover:text-[#141518]">Dashboard</Link>
              )}
            </nav>
          </div>

          <Link
            href={loggedIn ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-semibold text-[#141518] shadow-sm transition hover:bg-slate-50"
          >
            <LayoutDashboard size={14} className="text-[#e85334]" />
            <span>{loggedIn ? 'Dashboard' : 'Log In'}</span>
          </Link>
        </header>

        <div className="mb-5 rounded-3xl border border-slate-900/[0.07] bg-white p-5 shadow-sm sm:p-6">
          <form onSubmit={submit} className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                aria-label="Search channel or topic"
                placeholder="Search @channel, URL, or topic..."
                value={query}
                disabled={busy}
                maxLength={600}
                onChange={event => { setQuery(event.target.value); setMessage(''); }}
                className="w-full rounded-full border border-slate-900/10 bg-[#f1f3f6] py-3 pl-5 pr-11 text-sm text-[#141518] placeholder:text-[#9ca3af] focus:border-[#e85334] focus:bg-white focus:outline-none"
              />
              <Search size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#646975]" />
            </div>
            <ShimmerButton type="submit" disabled={busy} className="h-11 px-6">
              <Sparkles size={14} className={cn('text-[#e85334]', busy && 'animate-spin')} />
              <span>{busy ? 'Scanning…' : 'Scan'}</span>
            </ShimmerButton>
          </form>
        </div>

        {loggedIn && !digest && !busy && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <BlurFade delay={0.03}>
              <BentoTile className="flex h-full flex-col justify-between p-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e85334]/10 px-2.5 py-1 text-[11px] font-semibold text-[#e85334]">
                    <Sparkles size={11} /> Default Channel
                  </span>
                  <h2 className="mt-3 text-base font-bold text-[#141518]">
                    {query || 'Your YouTube Channel'}
                  </h2>
                  <p className="mt-1 text-xs text-[#646975]">
                    {locationLabel ? `Location: ${locationLabel}` : 'Ready for instant comment scan'}
                  </p>
                </div>
                <ShimmerButton
                  type="button"
                  disabled={!query.trim() || busy}
                  onClick={() => {
                    const form = document.querySelector('form');
                    form?.requestSubmit();
                  }}
                  className="mt-4 w-full bg-[#0b2545]"
                >
                  Scan My Channel
                </ShimmerButton>
              </BentoTile>
            </BlurFade>

            <BlurFade delay={0.07}>
              <BentoTile className="h-full p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b2545]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0b2545]">
                  Niche Peers ({peers.length})
                </span>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {peers.length ? peers.map(peer => (
                    <button
                      key={peer}
                      type="button"
                      onClick={() => setQuery(peer)}
                      className="rounded-full bg-[#f1f3f6] px-3 py-1.5 text-xs font-semibold text-[#141518] transition hover:bg-[#e85334] hover:text-white"
                    >
                      {peer}
                    </button>
                  )) : (
                    <p className="text-xs text-[#646975]">Add competitor handles in Dashboard.</p>
                  )}
                </div>
              </BentoTile>
            </BlurFade>

            <BlurFade delay={0.11}>
              <BentoTile className="h-full p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Recent Digests ({savedDigests.length})
                </span>
                <div className="mt-3 space-y-2">
                  {savedDigests.length ? savedDigests.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setDigest(item); setSelected(0); }}
                      className="flex w-full items-center justify-between rounded-xl bg-[#f1f3f6] px-3 py-2 text-left text-xs transition hover:bg-slate-200/70"
                    >
                      <span className="truncate font-semibold text-[#141518]">{item.niche}</span>
                      <span className="shrink-0 text-[#646975]">{item.scripts.length} scripts</span>
                    </button>
                  )) : (
                    <p className="text-xs text-[#646975]">Your scanned digests will appear here.</p>
                  )}
                </div>
              </BentoTile>
            </BlurFade>
          </div>
        )}

        {scanResultsSection}
      </div>
      {modal}
    </div>
  );
}
