'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Clipboard, Cloud, History, Lock, MessageSquareReply, Radar, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import type { Digest } from '../lib/preview/types';
import { isLockedScript } from '../lib/preview/types';
import type { UserAccountState } from '../lib/store/appState';
import { AnimatedGradientText } from './magicui/animated-gradient-text';
import { BentoGrid, BentoTile } from './magicui/bento-grid';
import { BlurFade } from './magicui/blur-fade';
import { BorderBeam } from './magicui/border-beam';
import { DotPattern } from './magicui/dot-pattern';
import { MagicCard } from './magicui/magic-card';
import { ShimmerButton } from './magicui/shimmer-button';
import { Brand, Studio } from './studio';
import { ScriptCard } from './script-card';
import { cn } from '@/lib/utils';

type Account = { configured: boolean; email: string | null };
type HijackItem = { id: string; topic: string; author: string; text: string; likes: number; url: string | null };

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
  const [channelHandle, setChannelHandle] = useState('@TestMotoChannel');
  const [peers, setPeers] = useState('@JSFilmsIndia');
  const [frequencyHours, setFrequencyHours] = useState(48);
  const [preferredHourIst, setPreferredHourIst] = useState(9);
  const [triggerOnNewUpload, setTriggerOnNewUpload] = useState(false);
  const [hijackQuestions, setHijackQuestions] = useState<HijackItem[]>([]);
  const [tab, setTab] = useState<'scripts' | 'spy' | 'replies'>('scripts');
  const [open, setOpen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function applyState(next: UserAccountState) {
    setState(next);
    setChannelHandle(next.channelHandle);
    setPeers(next.competitorHandles.join(', '));
    setFrequencyHours(next.frequencyHours);
    setPreferredHourIst(next.preferredHourIst);
    setTriggerOnNewUpload(next.triggerOnNewUpload);
  }

  async function refreshDashboard() {
    const data = await api('/api/dashboard');
    applyState(data.account);
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
        setStatus(error instanceof Error ? error.message : 'Could not load dashboard.');
      } finally {
        setReady(true);
      }
    }
    void boot();
  }, []);

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
      setStatus('Schedule saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save schedule.');
    } finally {
      setBusy(false);
    }
  }

  async function runDeltaSpy() {
    setBusy(true);
    setStatus('');
    try {
      const data = await api('/api/dashboard', { action: 'delta_spy' });
      applyState(data.account);
      setHijackQuestions(data.hijackQuestions ?? []);
      setTab('spy');
      setStatus(`Synced ${data.hijackQuestions?.length ?? 0} competitor questions.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Competitor sync failed.');
    } finally {
      setBusy(false);
    }
  }

  async function auth(action: 'signin' | 'signup' | 'logout') {
    setBusy(true);
    setStatus('');
    try {
      const result = await api('/api/account', action === 'logout' ? { action } : { action, email, password });
      setAccount({ configured: result.configured, email: result.email });
      setPassword('');
      await refreshDashboard();
      setStatus(result.email ? 'Signed in.' : action === 'logout' ? 'Signed out.' : result.message ?? 'Check your email.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Account request failed.');
    } finally {
      setBusy(false);
    }
  }

  async function copyReply(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 1500);
  }

  const digests: Digest[] = state?.digests ?? [];
  const quickReplies = digests.flatMap(d =>
    d.scripts.flatMap(s =>
      !isLockedScript(s)
        ? s.receipts.map(r => ({ id: r.id, author: r.author, question: r.text, reply: s.reply, url: r.url }))
        : []
    )
  );

  const isUnlockedDashboard = Boolean(account.email) || testMode;
  const inputCls = 'w-full rounded-xl border border-slate-900/10 bg-[#eff1f4] px-3.5 py-2.5 text-xs text-[#181c24] placeholder:text-[#9ca3af] focus:border-[#6366f1] focus:bg-white focus:outline-none';

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <div className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6 md:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-6">
            <Brand />
            <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm font-medium">
              <Link href="/" className="pb-1 text-[#6b7280] transition hover:text-[#181c24]">Studio</Link>
              <Link href="/dashboard" className="border-b-2 border-[#181c24] pb-1 text-[#181c24]">Dashboard</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {isUnlockedDashboard && (
              <span className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                state?.subscriptionStatus === 'ACTIVE'
                  ? 'bg-gradient-to-r from-[#181c24] to-[#4f46e5] text-white'
                  : 'bg-white text-[#6b7280]'
              )}>
                {state?.subscriptionStatus === 'ACTIVE' ? `Active · ${state.planTier}` : 'Free Tier'}
              </span>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-medium text-[#181c24] shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Studio
            </Link>
          </div>
        </header>

        {status && (
          <div className="mb-4 rounded-2xl bg-white/90 px-4 py-2.5 text-xs font-medium text-[#181c24] shadow-sm" role="status">
            {status}
          </div>
        )}

        {!isUnlockedDashboard ? (
          <BentoGrid>
            <div className="md:col-span-7">
              <Studio live embedded />
            </div>

            <div className="md:col-span-5">
              <BlurFade delay={0.05}>
                <MagicCard className="relative p-6 sm:p-7">
                  <BorderBeam duration={10} colorFrom="#e85334" colorTo="#6366f1" />
                  <DotPattern className="opacity-30" />
                  <div className="relative z-10">
                    <AnimatedGradientText>
                      <Lock size={12} className="text-[#e85334]" />
                      <span>Creator Account</span>
                    </AnimatedGradientText>

                    <h2 className="mt-4 text-xl font-bold tracking-tight text-[#181c24]">
                      Sign in to unlock Dashboard
                    </h2>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      Save digests, configure 48h/72h/weekly auto-sync, and track competitors.
                    </p>

                    <div className="mt-5 space-y-3">
                      <label className="grid gap-1 text-xs font-medium text-[#6b7280]">
                        <span>Email</span>
                        <input
                          className={inputCls}
                          type="email"
                          autoComplete="email"
                          placeholder="you@creator.com"
                          value={email}
                          onChange={event => setEmail(event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-[#6b7280]">
                        <span>Password</span>
                        <input
                          className={inputCls}
                          type="password"
                          autoComplete="current-password"
                          placeholder="8+ characters"
                          minLength={8}
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <ShimmerButton
                          type="button"
                          disabled={busy || !account.configured}
                          onClick={() => auth('signin')}
                          className="flex-1"
                        >
                          Sign in
                        </ShimmerButton>
                        <button
                          type="button"
                          disabled={busy || !account.configured}
                          onClick={() => auth('signup')}
                          className="rounded-full border border-slate-900/10 bg-white px-4 py-2.5 text-xs font-semibold text-[#181c24] transition hover:bg-[#eff1f4]"
                        >
                          Create account
                        </button>
                      </div>
                    </div>
                  </div>
                </MagicCard>
              </BlurFade>
            </div>
          </BentoGrid>
        ) : (
          <>
            <BentoGrid>
              <BlurFade delay={0.03} className="md:col-span-7">
                <BentoTile>
                  <h1 className="inline-flex items-center gap-2 text-base font-semibold text-[#181c24]">
                    <CalendarDays size={16} className="text-[#e85334]" /> Schedule &amp; Competitor Spy
                  </h1>
                  <form className="mt-4 space-y-4" onSubmit={saveSchedule}>
                    <label className="grid gap-1 text-xs font-medium text-[#6b7280]">
                      <span>Your YouTube channel</span>
                      <input
                        className={inputCls}
                        placeholder="@YourChannel"
                        maxLength={600}
                        value={channelHandle}
                        onChange={event => setChannelHandle(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-[#6b7280]">
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
                      <span className="block text-xs font-medium text-[#6b7280]">Delivery cadence</span>
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
                                  ? 'border-transparent bg-gradient-to-r from-[#181c24] to-[#4f46e5] text-white shadow-sm'
                                  : 'border-slate-900/10 bg-[#eff1f4] text-[#6b7280] hover:text-[#181c24]'
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-xs font-medium text-[#6b7280]">Preferred hour (IST)</span>
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
                                  ? 'border-transparent bg-[#181c24] text-white shadow-sm'
                                  : 'border-slate-900/10 bg-[#eff1f4] text-[#6b7280] hover:text-[#181c24]'
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
                      className="flex w-full items-center justify-between rounded-2xl bg-[#eff1f4] px-3.5 py-2.5 text-xs font-medium text-[#181c24] transition hover:bg-slate-200/70"
                    >
                      <span>Auto-trigger 24h after any new video upload</span>
                      <span className={cn(
                        'grid h-5 w-9 items-center rounded-full p-0.5 transition-colors',
                        triggerOnNewUpload ? 'bg-[#6366f1]' : 'bg-slate-300'
                      )}>
                        <span className={cn(
                          'h-4 w-4 rounded-full bg-white shadow transition-transform',
                          triggerOnNewUpload ? 'translate-x-4' : 'translate-x-0'
                        )} />
                      </span>
                    </button>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <ShimmerButton type="submit" disabled={busy}>
                        Save schedule
                      </ShimmerButton>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={runDeltaSpy}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-medium text-[#181c24] transition hover:bg-[#eff1f4]"
                      >
                        <RefreshCw size={13} className={cn(busy && 'animate-spin')} /> Sync Competitor Spy
                      </button>
                    </div>
                  </form>
                </BentoTile>
              </BlurFade>

              <BlurFade delay={0.07} className="md:col-span-5">
                <BentoTile>
                  <h2 className="inline-flex items-center gap-2 text-base font-semibold text-[#181c24]">
                    <Cloud size={16} className="text-[#6366f1]" /> Cloud Sync
                  </h2>
                  {!ready ? (
                    <p className="mt-3 text-xs text-[#6b7280]">Checking session…</p>
                  ) : account.email ? (
                    <div className="mt-4 space-y-3">
                      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#181c24]">
                        <UserRound size={14} /> {account.email}
                      </p>
                      <div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => auth('logout')}
                          className="rounded-full border border-slate-900/10 bg-[#eff1f4] px-4 py-2 text-xs font-medium text-[#181c24] hover:bg-slate-200"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <label className="grid gap-1 text-xs font-medium text-[#6b7280]">
                        <span>Email</span>
                        <input
                          className={inputCls}
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={event => setEmail(event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-[#6b7280]">
                        <span>Password</span>
                        <input
                          className={inputCls}
                          type="password"
                          autoComplete="current-password"
                          minLength={8}
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <ShimmerButton type="button" disabled={busy || !account.configured} onClick={() => auth('signin')}>
                          Sign in
                        </ShimmerButton>
                        <button
                          type="button"
                          disabled={busy || !account.configured}
                          onClick={() => auth('signup')}
                          className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-medium text-[#181c24] hover:bg-[#eff1f4]"
                        >
                          Create account
                        </button>
                      </div>
                    </div>
                  )}
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
                    tab === 'scripts' ? 'bg-[#181c24] text-white' : 'bg-white text-[#6b7280] hover:text-[#181c24]'
                  )}
                >
                  <History size={13} /> Scripts &amp; Digests ({digests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('spy')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition',
                    tab === 'spy' ? 'bg-[#181c24] text-white' : 'bg-white text-[#6b7280] hover:text-[#181c24]'
                  )}
                >
                  <Radar size={13} /> Competitor Spy ({hijackQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('replies')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition',
                    tab === 'replies' ? 'bg-[#181c24] text-white' : 'bg-white text-[#6b7280] hover:text-[#181c24]'
                  )}
                >
                  <MessageSquareReply size={13} /> Quick-Reply Cheat Sheet ({quickReplies.length})
                </button>
              </div>

              {tab === 'scripts' && (
                !digests.length ? (
                  <BentoTile className="text-xs text-[#6b7280]">
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
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#181c24]">
                            <Sparkles size={14} className="text-[#e85334]" />
                            {item.niche}
                          </span>
                          <span className="text-xs text-[#6b7280]">
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
                    <p className="text-xs text-[#6b7280]">Click Sync Competitor Spy above to fetch unanswered competitor viewer questions.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {hijackQuestions.map(q => (
                        <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#eff1f4] p-3.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-[#181c24]">{q.author}</span>
                            <span className="ml-2 text-[#6b7280]">· {q.topic}</span>
                            <p className="mt-1 text-[#4b5563]">{q.text}</p>
                          </div>
                          {q.url && (
                            <a
                              href={q.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#181c24] px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
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
                    <p className="text-xs text-[#6b7280]">Generate or sync a digest to populate your Quick-Reply Cheat Sheet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {quickReplies.map(item => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#eff1f4] p-3.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-[#181c24]">{item.author}:</span>{' '}
                            <span className="text-[#4b5563]">{item.question}</span>
                            <p className="mt-1 font-medium text-[#181c24]">{item.reply}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyReply(item.id, item.reply)}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-medium text-[#181c24] shadow-sm hover:bg-slate-50"
                            >
                              {copiedId === item.id ? <Check size={12} /> : <Clipboard size={12} />}
                              {copiedId === item.id ? 'Copied' : 'Copy'}
                            </button>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-[#181c24] px-3 py-1.5 font-medium text-white hover:bg-slate-800"
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
    </div>
  );
}
