'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, CalendarDays, Cloud, History, UserRound } from 'lucide-react';
import { defaultProfile, parseProfile, type CreatorProfile } from '../lib/creator-profile';
import type { Digest } from '../lib/preview/types';
import { Brand } from './studio';
import { ScriptCard } from './script-card';

type Account = { configured: boolean; email: string | null };

async function api(path: string, payload?: unknown) {
  const response = await fetch(path, payload === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Request failed.');
  return body;
}

export function Dashboard() {
  const [account, setAccount] = useState<Account>({ configured: false, email: null });
  const [profile, setProfile] = useState(defaultProfile);
  const [peers, setPeers] = useState('');
  const [history, setHistory] = useState<Digest[]>([]);
  const [open, setOpen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function loadLocal() {
    try {
      const localProfile = JSON.parse(localStorage.getItem('clipspill-profile') ?? 'null') as CreatorProfile | null;
      setProfile(localProfile ?? defaultProfile);
      setPeers((localProfile?.competitor_handles ?? []).join(', '));
      setHistory(JSON.parse(localStorage.getItem('clipspill-digests') ?? '[]'));
      setOpen(0);
    } catch {
      setStatus('This browser could not load saved data.');
    }
  }

  async function loadCloud() {
    const workspace = await api('/api/workspace');
    setProfile(workspace.profile);
    setPeers(workspace.profile.competitor_handles.join(', '));
    setHistory(workspace.digests);
    setOpen(0);
  }

  useEffect(() => {
    let active = true;
    async function setup() {
      loadLocal();
      try {
        const next = await api('/api/account') as Account;
        if (!active) return;
        setAccount(next);
        if (next.email) await loadCloud();
      } catch (error) {
        if (active) setStatus(error instanceof Error ? error.message : 'Could not load the account.');
      } finally {
        if (active) setReady(true);
      }
    }
    void setup();
    return () => { active = false; };
  }, []);

  async function authenticate(action: 'signup' | 'signin' | 'logout') {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      const next = await api('/api/account', { action, email, password });
      setAccount(next);
      setPassword('');
      if (action === 'logout') loadLocal();
      if (next.email) await loadCloud();
      setStatus(next.message ?? (action === 'logout' ? 'Signed out.' : next.email ? 'Signed in.' : ''));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update the account.');
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const updated = parseProfile({ ...profile, channel_handle: profile.channel_handle.trim(),
      competitor_handles: peers.split(/[\s,]+/).filter(Boolean) });
    if (!updated) {
      setStatus('Enter valid YouTube handles and select a delivery time. You can track up to five creators.');
      return;
    }
    setBusy(true);
    try {
      if (account.email) await api('/api/workspace', { action: 'profile', profile: updated });
      else localStorage.setItem('clipspill-profile', JSON.stringify(updated));
      setProfile(updated);
      setPeers(updated.competitor_handles.join(', '));
      setStatus(account.email ? 'Preferences saved to your account.' : 'Preferences saved on this device.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save preferences.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="mast"><div className="frame mast-inner"><Brand /><nav><Link href="/"><ArrowLeft size={15} /> Back to studio</Link></nav></div></header>
      <main className="frame dashboard">
        <span className="eyebrow">CREATOR SPACE</span>
        <h1>Your dashboard<span>.</span></h1>
        <p>Manage tracked creators, delivery preferences and saved scripts.</p>
        <div className="dash-grid">
          <section className="dash-card">
            <h2><CalendarDays size={20} /> Delivery preferences</h2>
            <p>Preferences are saved for setup. Automatic delivery is pending.</p>
            <form className="dash-form" onSubmit={save}>
              <label>Your YouTube channel<input placeholder="@YourChannel" value={profile.channel_handle} onChange={e => setProfile({ ...profile, channel_handle: e.target.value })} /></label>
              <label>Tracked creators<input placeholder="@CreatorOne, @CreatorTwo" value={peers} onChange={e => setPeers(e.target.value)} /></label>
              <div className="form-pair">
                <label>Cadence<select value={profile.cadence} onChange={e => setProfile({ ...profile, cadence: e.target.value as CreatorProfile['cadence'] })}>
                  <option value="weekly">Weekly</option><option value="48h">Every 2 days</option><option value="72h">Every 3 days</option><option value="post-upload">24h post-upload</option>
                </select></label>
                <label>Time (IST)<input required type="time" value={profile.delivery_time} onChange={e => setProfile({ ...profile, delivery_time: e.target.value })} /></label>
              </div>
              <div className="form-pair">
                {profile.cadence === 'weekly' && <label>Delivery day<select value={profile.delivery_day} onChange={e => setProfile({ ...profile, delivery_day: Number(e.target.value) })}>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select></label>}
                <label>Delivery channel<select value={profile.delivery_channel} onChange={e => setProfile({ ...profile, delivery_channel: e.target.value as CreatorProfile['delivery_channel'] })}>
                  <option value="email">Email</option><option value="whatsapp">WhatsApp</option>
                </select></label>
              </div>
              <button className="btn primary" disabled={busy || !ready}>Save preferences</button>
            </form>
          </section>
          <section className="dash-card">
            <h2><UserRound size={20} /> Account</h2>
            {!ready ? <p>Checking account…</p> : account.email ? <>
              <p><Cloud size={16} /> {account.email}</p>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => void authenticate('logout')}>Sign out</button>
            </> : account.configured ? <form className="dash-form" onSubmit={event => { event.preventDefault(); void authenticate((event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'signup' ? 'signup' : 'signin'); }}>
              <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
              <label>Password<input type="password" minLength={8} maxLength={128} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
              <div className="script-actions"><button className="btn primary" disabled={busy}>Sign in</button><button className="btn secondary" value="signup" disabled={busy}>Create account</button></div>
            </form> : <p>Demo workspace. Your preferences and digests are saved on this device.</p>}
          </section>
        </div>
        <p className="status-line" role="status">{status}</p>
        <section className="dash-history">
          <h2><History size={21} /> Digest history</h2>
          {!history.length && <p>No saved digests yet. <Link href="/#workspace">Open the script workspace</Link> to save one.</p>}
          {history.length > 0 && <div className="niche-row">
            {history.map((item, index) => <button type="button" key={item.id} aria-pressed={index === open} onClick={() => setOpen(index)}>{item.niche} · {item.source === 'demo' ? 'Sample' : new Date(item.createdAt).toLocaleDateString('en-IN')}</button>)}
          </div>}
          {history[open]?.scripts.map(script => <ScriptCard key={script.id} script={script} />)}
        </section>
      </main>
    </>
  );
}
