'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowUpRight, CalendarDays, Check, Clipboard, History,
  Instagram, LogOut, MessageSquareReply, Radar, RefreshCw, Sparkles, TrendingUp, Users
} from 'lucide-react';
import type { Digest } from '../lib/preview/types';
import { isLockedScript } from '../lib/preview/types';
import type { UserAccountState } from '../lib/store/appState';
import { AuthCard } from './auth-card';
import { AnimatedGradientText } from './magicui/animated-gradient-text';
import { BentoGrid, BentoTile } from './magicui/bento-grid';
import { BlurFade } from './magicui/blur-fade';
import { MagicCard } from './magicui/magic-card';
import { NumberTicker } from './magicui/number-ticker';
import { ShimmerButton } from './magicui/shimmer-button';
import { Brand, Studio } from './studio';
import { ScriptCard } from './script-card';
import { SnackbarHost, type ToastItem } from './ui/snackbar';
import { cn } from '@/lib/utils';

type Account = { configured: boolean; email: string | null };
type HijackItem = {
  id: string;
  topic: string;
  author: string;
  text: string;
  likes: number;
  url: string | null;
  potentialScore?: number;
  stealDeal?: boolean;
  reason?: string;
};

const CADENCES = [
  { value: 48, label: 'Every 2 Days (48h)' },
  { value: 72, label: 'Every 3 Days (72h)' },
  { value: 168, label: 'Weekly (7d)' }
];

const HOURS_IST = [6, 9, 12, 15, 18, 21];

async function api(path: string, payload?: unknown) {
  const response = await fetch(path, payload === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Request failed.');
  return body;
}

export function Dashboard({ testMode = false }: { testMode?: boolean }) {
  const [account, setAccount] = useState<Account>({ configured: false, email: null });
  const [state, setState] = useState<UserAccountState | null>(null);
  const [channelHandle, setChannelHandle] = useState('');
  const [peers, setPeers] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [frequencyHours, setFrequencyHours] = useState(48);
  const [preferredHourIst, setPreferredHourIst] = useState(9);
  const [triggerOnNewUpload, setTriggerOnNewUpload] = useState(false);
  const [hijackQuestions, setHijackQuestions] = useState<HijackItem[]>([]);
  const [stealDealsOnly, setStealDealsOnly] = useState(false);
  const [tab, setTab] = useState<'scripts' | 'spy' | 'replies'>('scripts');
  const [open, setOpen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [copiedId, setCopiedId] = useState('');
  const [editingOnboarding, setEditingOnboarding] = useState(false);

  function notify(message: string, tone: ToastItem['tone'] = 'info') {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev.slice(-3), { id, message, tone }]);
  }

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const setStatus = (msg: string, tone?: ToastItem['tone']) => {
    if (!msg) return;
    notify(msg, tone ?? (/fail|could not|error/i.test(msg) ? 'error' : /saved|synced|copied/i.test(msg) ? 'success' : 'info'));
  };

  function applyState(next: UserAccountState) {
    setState(next);
    setChannelHandle(next.channelHandle);
    setPeers(next.competitorHandles.join(', '));
    setCity(next.city ?? '');
    setCountry(next.country ?? '');
    setInstagramUrl(next.instagramUrl ?? '');
    setFrequencyHours(next.frequencyHours);
    setPreferredHourIst(next.preferredHourIst);
    setTriggerOnNewUpload(next.triggerOnNewUpload);
    if (Array.isArray(next.hijackQuestions)) {
      setHijackQuestions(next.hijackQuestions);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const [acct, dash] = await Promise.all([
          api('/api/account').catch(() => ({ configured: false, email: null })),
          api('/api/dashboard')
        ]);
        setAccount(acct);
        applyState(dash.account);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not load dashboard.', 'error');
      } finally {
        setReady(true);
      }
    }
    void boot();
  }, []);

  async function submitOnboarding(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const data = await api('/api/dashboard', {
        action: 'complete_onboarding',
        channelHandle,
        city,
        country,
        competitorHandles: peers.split(/[\s,]+/).filter(Boolean),
        instagramUrl
      });
      applyState(data.account);
      setEditingOnboarding(false);
      setStatus('Creator profile saved!');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save onboarding.');
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const data = await api('/api/dashboard', {
        action: 'save_schedule',
        channelHandle,
        competitorHandles: peers.split(/[\s,]+/).filter(Boolean),
        frequencyHours,
        preferredHourIst,
        triggerOnNewUpload
      });
      applyState(data.account);
      setStatus('Changes saved!', 'success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save changes.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function runDeltaSpy(expand = false) {
    setBusy(true);
    setStatus('');
    try {
      const data = await api('/api/dashboard', { action: 'delta_spy', expand });
      applyState(data.account);
      setHijackQuestions(data.hijackQuestions ?? []);
      setTab('spy');
      setStatus(`Synced ${data.hijackQuestions?.length ?? 0} competitor questions.`, 'success');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Competitor sync failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await api('/api/account', { action: 'logout' });
      window.location.href = '/';
    } finally {
      setBusy(false);
    }
  }

  async function copyReply(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify('Reply copied to clipboard', 'success');
    setTimeout(() => setCopiedId(''), 1500);
  }

  const digests: Digest[] = state?.digests ?? [];
  const totalScripts = digests.reduce((sum, d) => sum + d.scripts.length, 0);
  const quickReplies = digests.flatMap(d =>
    d.scripts.flatMap(s =>
      !isLockedScript(s)
        ? s.receipts.map(r => ({ id: r.id, author: r.author, question: r.text, reply: s.reply, url: r.url }))
        : []
    )
  );

  const isUnlockedDashboard = Boolean(account.email) || testMode;
  const needsOnboarding = Boolean(account.email) && !testMode && (!state?.onboarded || editingOnboarding);
  const inputCls = 'w-full rounded-xl border border-slate-900/10 bg-[#f1f3f6] px-3.5 py-2.5 text-xs text-[#141518] placeholder:text-[#9ca3af] focus:border-[#0b2545] focus:bg-white focus:outline-none';

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <div className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6 md:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-6">
            <Brand />
            <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm font-medium">
              {!needsOnboarding && (
                <Link href="/" className="pb-1 text-[#646975] transition hover:text-[#141518]">Studio</Link>
              )}
              {isUnlockedDashboard && (
                <Link href="/dashboard" className="border-b-2 border-[#141518] pb-1 text-[#141518]">Dashboard</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {isUnlockedDashboard && account.email && (
              <>
                <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#646975] shadow-sm sm:inline-flex">
                  {account.email}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-3.5 py-2 text-xs font-medium text-[#141518] shadow-sm transition hover:bg-slate-50"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </>
            )}
            {!needsOnboarding && (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-medium text-[#141518] shadow-sm transition hover:bg-slate-50"
              >
                <ArrowLeft size={14} /> Studio
              </Link>
            )}
          </div>
        </header>

        {!ready ? (
          <BentoTile className="py-12 text-center text-xs text-[#646975]">Loading workspace…</BentoTile>
        ) : !isUnlockedDashboard ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Studio live embedded />
            </div>
            <div className="lg:col-span-5">
              <AuthCard onSuccess={() => window.location.reload()} />
            </div>
          </div>
        ) : needsOnboarding ? (
          <BlurFade>
            <MagicCard className="mx-auto max-w-xl p-6 sm:p-8">
              <AnimatedGradientText>
                <Sparkles size={12} />
                <span>Creator Setup</span>
              </AnimatedGradientText>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#141518]">
                Personalize your comment radar
              </h1>
              <p className="mt-1 text-xs text-[#646975]">
                Tell us your channel and niche peers so we can surface unanswered viewer questions automatically.
              </p>

              <form onSubmit={submitOnboarding} className="mt-6 space-y-4">
                <label className="grid gap-1.5 text-xs font-semibold text-[#141518]">
                  <span>Your YouTube Channel (@handle or URL) *</span>
                  <input
                    required
                    className={inputCls}
                    placeholder="@YourChannel"
                    value={channelHandle}
                    onChange={e => setChannelHandle(e.target.value)}
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-semibold text-[#141518]">
                    <span>City *</span>
                    <input
                      required
                      className={inputCls}
                      placeholder="e.g. Hyderabad"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-[#141518]">
                    <span>Country *</span>
                    <input
                      required
                      className={inputCls}
                      placeholder="e.g. India"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                    />
                  </label>
                </div>

                <label className="grid gap-1.5 text-xs font-semibold text-[#141518]">
                  <span>Competitor / Similar Niche Channels (up to 5)</span>
                  <input
                    className={inputCls}
                    placeholder="@CreatorOne, @CreatorTwo"
                    value={peers}
                    onChange={e => setPeers(e.target.value)}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-[#141518]">
                  <span>Instagram Profile Link (optional)</span>
                  <input
                    className={inputCls}
                    placeholder="https://instagram.com/yourhandle"
                    value={instagramUrl}
                    onChange={e => setInstagramUrl(e.target.value)}
                  />
                </label>

                <div className="rounded-2xl border border-slate-900/10 bg-[#f8f9fb] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e85334]/10 text-[#e85334]">
                        <Instagram size={18} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[#141518]">Instagram Creator Account</p>
                        <p className="text-[11px] text-[#646975]">Connect Reels comments (Phase 2)</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatus('Instagram OAuth connection is scheduled for Phase 2.')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/15 bg-white px-4 py-2 text-xs font-semibold text-[#141518] shadow-sm transition hover:bg-slate-50"
                    >
                      <Instagram size={13} className="text-[#e85334]" /> Connect Instagram
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <ShimmerButton type="submit" disabled={busy} className="flex-1 bg-[#0b2545]">
                    {busy ? 'Saving…' : 'Save & Open Dashboard'}
                  </ShimmerButton>
                  {state?.onboarded && (
                    <button
                      type="button"
                      onClick={() => setEditingOnboarding(false)}
                      className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-medium text-[#646975]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </MagicCard>
          </BlurFade>
        ) : (
          <>
            {/* Colorful KPI Overview Row */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <BlurFade delay={0.02}>
                <MagicCard className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#646975]">Scripts Unlocked</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e85334]/10 text-[#e85334]">
                      <Sparkles size={15} />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[#141518]">
                    <NumberTicker value={totalScripts} />
                  </p>
                </MagicCard>
              </BlurFade>

              <BlurFade delay={0.05}>
                <MagicCard className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#646975]">Tracked Peers</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0b2545]/10 text-[#0b2545]">
                      <Users size={15} />
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-[#141518]">
                    <NumberTicker value={state?.competitorHandles.length ?? 0} />
                  </p>
                </MagicCard>
              </BlurFade>

              <BlurFade delay={0.08}>
                <MagicCard className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#646975]">Cadence</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <TrendingUp size={15} />
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-[#141518]">
                    {frequencyHours === 48 ? 'Every 2d' : frequencyHours === 72 ? 'Every 3d' : 'Weekly'}
                  </p>
                </MagicCard>
              </BlurFade>

              <BlurFade delay={0.11}>
                <MagicCard className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#646975]">Plan Status</span>
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600">
                      <CalendarDays size={15} />
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-[#141518]">
                    {state?.subscriptionStatus === 'ACTIVE' ? `Active · ${state.planTier}` : 'Unlocked Creator'}
                  </p>
                </MagicCard>
              </BlurFade>
            </div>

            <BentoGrid>
              <BlurFade delay={0.03} className="md:col-span-7">
                <BentoTile>
                  <h1 className="inline-flex items-center gap-2 text-base font-semibold text-[#141518]">
                    <CalendarDays size={16} className="text-[#e85334]" /> Schedule &amp; Competitor Spy
                  </h1>
                  <form className="mt-4 space-y-4" onSubmit={saveSchedule}>
                    <label className="grid gap-1 text-xs font-medium text-[#646975]">
                      <span>Your YouTube channel</span>
                      <input
                        className={inputCls}
                        placeholder="@YourChannel"
                        maxLength={600}
                        value={channelHandle}
                        onChange={event => setChannelHandle(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-[#646975]">
                      <span>Competitor handles (up to 5)</span>
                      <input
                        aria-label="Competitor handles"
                        className={inputCls}
                        placeholder="@CreatorOne, @CreatorTwo"
                        maxLength={450}
                        value={peers}
                        onChange={event => setPeers(event.target.value)}
                      />
                    </label>

                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-[#646975]">Delivery cadence</span>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Delivery cadence">
                        {CADENCES.map(option => {
                          const active = frequencyHours === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setFrequencyHours(option.value)}
                              className={cn(
                                'rounded-full border px-3.5 py-2 text-xs font-semibold transition-all',
                                active
                                  ? 'border-transparent bg-[#0b2545] text-white shadow-sm'
                                  : 'border-slate-900/10 bg-[#f1f3f6] text-[#646975] hover:text-[#141518]'
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-[#646975]">Preferred hour (IST)</span>
                      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Preferred hour IST">
                        {HOURS_IST.map(h => {
                          const active = preferredHourIst === h;
                          const label = `${String(h).padStart(2, '0')}:00 IST`;
                          return (
                            <button
                              key={h}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setPreferredHourIst(h)}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                                active
                                  ? 'border-transparent bg-[#e85334] text-white shadow-sm'
                                  : 'border-slate-900/10 bg-[#f1f3f6] text-[#646975] hover:text-[#141518]'
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={triggerOnNewUpload}
                      onClick={() => setTriggerOnNewUpload(!triggerOnNewUpload)}
                      className="flex w-full items-center justify-between rounded-2xl bg-[#f1f3f6] px-3.5 py-2.5 text-xs font-medium text-[#141518] transition hover:bg-slate-200/70"
                    >
                      <span>Auto-trigger 24h after any new video upload</span>
                      <span className={cn(
                        'grid h-5 w-9 items-center rounded-full p-0.5 transition-colors',
                        triggerOnNewUpload ? 'bg-[#e85334]' : 'bg-slate-300'
                      )}>
                        <span className={cn(
                          'h-4 w-4 rounded-full bg-white shadow transition-transform',
                          triggerOnNewUpload ? 'translate-x-4' : 'translate-x-0'
                        )} />
                      </span>
                    </button>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <ShimmerButton type="submit" disabled={busy}>
                        Save changes
                      </ShimmerButton>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runDeltaSpy(false)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-medium text-[#141518] transition hover:bg-[#f1f3f6]"
                      >
                        <RefreshCw size={13} className={cn(busy && 'animate-spin')} /> Sync Competitor Spy
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runDeltaSpy(true)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e85334]/25 bg-[#fff8f6] px-4 py-2 text-xs font-semibold text-[#e85334] transition hover:bg-[#e85334] hover:text-white"
                      >
                        <Sparkles size={13} /> Expand Niche (14d)
                      </button>
                    </div>
                  </form>
                </BentoTile>
              </BlurFade>

              <BlurFade delay={0.07} className="md:col-span-5">
                <BentoTile className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="inline-flex items-center gap-2 text-base font-semibold text-[#141518]">
                      <Instagram size={16} className="text-[#e85334]" /> Connected Accounts
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingOnboarding(true)}
                      className="text-xs font-semibold text-[#0b2545] underline-offset-2 hover:underline"
                    >
                      Edit setup
                    </button>
                  </div>

                  <div className="rounded-2xl bg-[#f1f3f6] p-4 text-xs">
                    <p className="font-semibold text-[#141518]">Instagram Creator</p>
                    <p className="mt-1 text-[#646975]">
                      {instagramUrl ? instagramUrl : 'Optional link not added yet.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus('Instagram OAuth connection is scheduled for Phase 2.')}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#141518] px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Instagram size={13} className="text-[#e85334]" /> Connect Instagram Account
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-900/10 bg-white p-4 text-xs">
                    <p className="font-semibold text-[#141518]">Quick Scan</p>
                    <p className="mt-1 text-[#646975]">Run an instant scan in Studio with all 3 scripts unlocked.</p>
                    <Link
                      href="/"
                      className="mt-3 inline-flex items-center gap-1 font-semibold text-[#e85334] hover:underline"
                    >
                      Open Studio <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </BentoTile>
              </BlurFade>
            </BentoGrid>

            <section className="mt-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab('scripts')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition',
                    tab === 'scripts' ? 'bg-[#0b2545] text-white' : 'bg-white text-[#646975] hover:text-[#141518]'
                  )}
                >
                  <History size={13} /> Scripts &amp; Digests ({digests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('spy')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition',
                    tab === 'spy' ? 'bg-[#0b2545] text-white' : 'bg-white text-[#646975] hover:text-[#141518]'
                  )}
                >
                  <Radar size={13} /> Competitor Spy ({hijackQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('replies')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition',
                    tab === 'replies' ? 'bg-[#0b2545] text-white' : 'bg-white text-[#646975] hover:text-[#141518]'
                  )}
                >
                  <MessageSquareReply size={13} /> Quick-Reply Cheat Sheet ({quickReplies.length})
                </button>
              </div>

              {tab === 'scripts' && (
                !digests.length ? (
                  <BentoTile className="text-xs text-[#646975]">
                    No saved digests yet. Run a scan or click Sync Competitor Spy.
                  </BentoTile>
                ) : (
                  <div className="space-y-4">
                    {digests.map((item, index) => (
                      <BentoTile key={item.id}>
                        <button
                          type="button"
                          aria-expanded={open === index}
                          onClick={() => setOpen(open === index ? -1 : index)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#141518]">
                            <Sparkles size={14} className="text-[#e85334]" />
                            {item.niche}
                          </span>
                          <span className="text-xs text-[#646975]">
                            {new Date(item.createdAt).toLocaleDateString()} · {item.scripts.length} scripts
                          </span>
                        </button>
                        {open === index && (
                          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {item.scripts.map(script => <ScriptCard key={script.id} script={script} />)}
                          </div>
                        )}
                      </BentoTile>
                    ))}
                  </div>
                )
              )}

              {tab === 'spy' && (
                <BentoTile>
                  {!hijackQuestions.length ? (
                    <p className="text-xs text-[#646975]">Click Sync Competitor Spy above to fetch unanswered competitor viewer questions.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                        <span className="text-xs font-medium text-[#646975]">
                          Sorted by Gemini video potential ({hijackQuestions.filter(q => q.stealDeal).length} steal deals found)
                        </span>
                        <button
                          type="button"
                          onClick={() => setStealDealsOnly(v => !v)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-semibold transition',
                            stealDealsOnly
                              ? 'border-transparent bg-[#e85334] text-white'
                              : 'border-slate-900/10 bg-[#f1f3f6] text-[#141518] hover:bg-slate-200'
                          )}
                        >
                          {stealDealsOnly ? 'Showing Steal Deals Only' : 'Filter: Steal Deals Only'}
                        </button>
                      </div>

                      {hijackQuestions
                        .filter(q => !stealDealsOnly || q.stealDeal)
                        .map(q => (
                          <div
                            key={q.id}
                            className={cn(
                              'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 text-xs transition',
                              q.stealDeal
                                ? 'border-[#e85334]/35 bg-[#fff8f6] shadow-sm'
                                : 'border-transparent bg-[#f1f3f6]'
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {q.stealDeal && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e85334] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                    <Sparkles size={10} /> Steal Deal
                                  </span>
                                )}
                                {typeof q.potentialScore === 'number' && (
                                  <span className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                    q.potentialScore >= 8
                                      ? 'bg-emerald-500/15 text-emerald-700'
                                      : 'bg-slate-900/10 text-[#646975]'
                                  )}>
                                    {q.potentialScore}/10
                                  </span>
                                )}
                                <span className="font-semibold text-[#141518]">{q.author}</span>
                                <span className="text-[#646975]">· {q.topic}</span>
                              </div>
                              <p className="mt-1.5 text-sm font-medium text-[#141518]">{q.text}</p>
                              {q.reason && (
                                <p className="mt-1 text-[11px] text-[#646975]">{q.reason}</p>
                              )}
                            </div>
                            {q.url && (
                              <a
                                href={q.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#141518] px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                              >
                                Direct Comment-Hijack Link <ArrowUpRight size={12} />
                              </a>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </BentoTile>
              )}

              {tab === 'replies' && (
                <BentoTile>
                  {!quickReplies.length ? (
                    <p className="text-xs text-[#646975]">Generate or sync a digest to populate your Quick-Reply Cheat Sheet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {quickReplies.map(item => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f1f3f6] p-3.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-[#141518]">{item.author}:</span>{' '}
                            <span className="text-[#4b5563]">{item.question}</span>
                            <p className="mt-1 font-medium text-[#141518]">{item.reply}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyReply(item.id, item.reply)}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-medium text-[#141518] shadow-sm hover:bg-slate-50"
                            >
                              {copiedId === item.id ? <Check size={12} /> : <Clipboard size={12} />}
                              {copiedId === item.id ? 'Copied' : 'Copy'}
                            </button>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-[#141518] px-3 py-1.5 font-medium text-white hover:bg-slate-800"
                              >
                                Reply on YouTube <ArrowUpRight size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </BentoTile>
              )}
            </section>
          </>
        )}
      </div>
      <SnackbarHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
