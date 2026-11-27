'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, CirclePlay, Clapperboard, Gamepad2, LayoutDashboard, MessageSquare, Mic, Monitor, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { niches } from '../lib/niches';
import { demoDigest } from '../lib/preview/demo';
import type { Digest, Inspection } from '../lib/preview/types';
import type { CreatorProfile } from '../lib/creator-profile';
import { normalizeHandle } from '../lib/youtube/normalizeHandle';
import { ScriptCard } from './script-card';

const icons = [Mic, Gamepad2, Monitor, Target, TrendingUp];
const featured = niches.slice(0, icons.length);

export function Brand() {
  return <Link className="brand" href="/"><span className="brand-logo"><Clapperboard size={21} strokeWidth={2.4} /></span>ClipSpill<span className="brand-dot">.</span></Link>;
}

export function Studio({ live }: { live: boolean }) {
  const [mode, setMode] = useState<'youtube' | 'niche'>('youtube');
  const [reference, setReference] = useState('');
  const [nicheId, setNicheId] = useState<string>('moto');
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [peers, setPeers] = useState<string[]>(niches[0].peers.map(peer => '@' + peer));
  const [custom, setCustom] = useState('');
  const [digest, setDigest] = useState<Digest>(() => demoDigest());
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [extra, setExtra] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadChannel() {
      let profile: Partial<CreatorProfile> | null = null;
      try {
        const response = await fetch('/api/workspace');
        if (response.ok) profile = (await response.json()).profile;
      } catch {
        // Local preferences are available even when the account service is offline.
      }
      try {
        profile ??= JSON.parse(localStorage.getItem('clipspill-profile') ?? 'null');
        const handle = profile?.channel_handle;
        if (active && handle) setReference(value => value || handle);
      } catch {
        // A fresh workspace has an empty search field.
      }
    }
    void loadChannel();
    return () => { active = false; };
  }, []);

  function chooseNiche(id: string) {
    setMode('niche');
    setInspection(null);
    setMessage('');
    setNicheId(id);
    const niche = niches.find(item => item.id === id);
    setPeers(niche?.peers.map(peer => '@' + peer) ?? []);
    if (!live) {
      setDigest(demoDigest(id));
      setSelected(0);
    }
  }

  async function scan<T>(action: string, channel: string, peersToScan: string[], niche = nicheId): Promise<T> {
    const response = await fetch('/api/scan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reference: channel, nicheId: niche, peers: peersToScan })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not complete the scan.');
    return data;
  }

  function showDigest(next: Digest) {
    setDigest(next);
    setSelected(0);
    document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage('');
    if (!live) {
      showDigest(demoDigest(nicheId));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'youtube' && !inspection) {
        const result = await scan<Inspection>('inspect', reference, []);
        setInspection(result);
        if (result.needsPeers) {
          const nextNiche = niches.find(item => item.id === result.nicheId);
          setNicheId(nextNiche?.id ?? '');
          setPeers(nextNiche?.peers.map(peer => '@' + peer) ?? []);
          return;
        }
        showDigest(await scan<Digest>('generate', reference, [], result.nicheId ?? ''));
      } else {
        showDigest(await scan<Digest>('generate', mode === 'youtube' ? reference : '', peers));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The scan could not finish.');
    } finally {
      setBusy(false);
    }
  }

  function addPeer() {
    const normalized = normalizeHandle(custom);
    if (!normalized || normalized.kind !== 'handle') {
      setMessage('Enter a YouTube @handle to add a creator.');
      return;
    }
    if (peers.some(peer => peer.toLowerCase() === normalized.value.toLowerCase())) {
      setMessage('That creator is already selected.');
      return;
    }
    if (peers.length >= 3) {
      setMessage('Choose up to three creators for the teaser.');
      return;
    }
    setPeers(previous => [...previous, normalized.value]);
    setCustom('');
    setMessage('');
  }

  async function save() {
    try {
      const account = await fetch('/api/account').then(response => response.json());
      if (account.email) {
        const response = await fetch('/api/workspace', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'digest', digest })
        });
        if (!response.ok) throw new Error((await response.json()).error ?? 'Cloud save failed.');
        setMessage('Digest saved in your account.');
        return;
      }
      if (account.error) throw new Error(account.error);
      const previous = JSON.parse(localStorage.getItem('clipspill-digests') ?? '[]') as Digest[];
      localStorage.setItem('clipspill-digests', JSON.stringify([digest, ...previous.filter(item => item.id !== digest.id)].slice(0, 20)));
      setMessage('Digest saved in your dashboard on this device.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The digest could not be saved.');
    }
  }

  const suggestions = niches.find(niche => niche.id === nicheId)?.peers.map(peer => '@' + peer) ?? [];
  const showPeers = mode === 'niche' || inspection?.needsPeers;
  const script = digest.scripts[selected];

  return (
    <>
      <header className="mast"><div className="frame mast-inner">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <Link className="nav-action" href="/dashboard"><LayoutDashboard size={16} /> Dashboard <ArrowUpRight size={15} /></Link>
        </nav>
      </div></header>
      <main>
        <section className="hero frame">
          <div className="hero-copy">
            <span className="eyebrow hero-tag"><span /> COMMENT TO SCRIPT</span>
            <h1>Your next video<br />is in the <em>comments<span>.</span></em></h1>
            <p>Find what viewers keep asking and turn it into a ready-to-shoot YouTube Short or Instagram Reel.</p>
            <a className="hero-link" href="#workspace"><CirclePlay size={20} /> Explore a sample <ArrowDownRight size={16} /></a>
          </div>
          <div className="scan-panel">
            <div className="scan-head"><span className="scan-mark"><Zap size={21} /></span><div><h2>Find your next script</h2><p>{live ? 'Start with a channel or a niche.' : 'Try the workflow with sample data.'}</p></div></div>
            <div className="segmented" aria-label="Source type">
              <button type="button" aria-pressed={mode === 'youtube'} disabled={busy} onClick={() => { setMode('youtube'); setMessage(''); }}><CirclePlay size={15} /> YouTube channel</button>
              <button type="button" aria-pressed={mode === 'niche'} disabled={busy} onClick={() => { if (!nicheId) chooseNiche('moto'); else { setMode('niche'); setMessage(''); } }}><Sparkles size={15} /> Pick a niche</button>
            </div>
            <form onSubmit={submit}>
              {mode === 'youtube' && <label className="channel-label" htmlFor="reference">YouTube handle or link
                <input id="reference" name="reference" placeholder="@YourChannel" required={live} maxLength={600} value={reference} disabled={busy}
                  onChange={event => { setReference(event.target.value); setInspection(null); setMessage(''); }} />
              </label>}
              {inspection?.message && <p className="form-note">{inspection.message}</p>}
              {showPeers && <div className="peer-picker">
                <label htmlFor="niche-picker">{inspection?.nicheId ? 'Detected niche' : 'Niche'}</label>
                <select id="niche-picker" value={nicheId} disabled={busy} onChange={event => {
                  const id = event.target.value;
                  const niche = niches.find(item => item.id === id);
                  setNicheId(id);
                  setPeers(niche?.peers.map(peer => '@' + peer) ?? []);
                }}>
                  <option value="">Custom creators</option>
                  {niches.map(niche => <option key={niche.id} value={niche.id}>{niche.label}</option>)}
                </select>
                <div className="peers" aria-label="Creators to scan">
                  {[...new Set([...suggestions, ...peers])].map(peer => <button type="button" key={peer} disabled={busy}
                    aria-pressed={peers.includes(peer)} onClick={() => {
                      if (peers.includes(peer)) setPeers(peers.filter(item => item !== peer));
                      else if (peers.length < 3) setPeers([...peers, peer]);
                      else setMessage('Choose up to three creators for the teaser.');
                    }}>{peer}</button>)}
                </div>
                <div className="add-peer"><input aria-label="Add creator handle" placeholder="@AnotherCreator" value={custom} maxLength={80} disabled={busy} onChange={event => setCustom(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addPeer(); } }} />
                  <button type="button" className="quiet" disabled={busy} onClick={addPeer}>+ Add</button>
                </div>
              </div>}
              <button className="btn primary scan-button" type="submit" disabled={busy}><Sparkles size={18} /> {busy ? 'Scanning comments…' : live ? 'Find script ideas' : 'Generate sample scripts'} <ArrowRight size={18} /></button>
              <span className="form-status" role="status">{message}</span>
            </form>
          </div>
        </section>
        <section className="frame niches" aria-label="Browse niches">
          <span className="eyebrow">EXPLORE A NICHE</span>
          <div className="niche-row">
            {featured.map((niche, index) => {
              const Icon = icons[index];
              return <button type="button" disabled={busy} key={niche.id} aria-pressed={niche.id === nicheId} onClick={() => chooseNiche(niche.id)}><Icon size={16} /> {niche.label}</button>;
            })}
            <button type="button" disabled={busy} aria-expanded={extra} onClick={() => setExtra(!extra)}>More <ChevronDown size={15} /></button>
          </div>
          {extra && <div className="niche-row extra-niches">{niches.slice(5).map(niche => <button type="button" disabled={busy} key={niche.id} aria-pressed={niche.id === nicheId} onClick={() => chooseNiche(niche.id)}>{niche.label}</button>)}</div>}
        </section>
        <section className="workspace" id="workspace">
          <div className="frame">
            <div className="workspace-head">
              <div><span className="eyebrow">THE WORKSPACE</span><h2>From comment to camera<span>.</span></h2></div>
              <div className="workspace-actions"><span className="source"><span /> {digest.source === 'demo' ? 'Sample data' : digest.source === 'peers' ? 'Growth Mode' : 'Your channel'} · {digest.niche}</span>
                <button type="button" className="btn secondary" onClick={save} disabled={!digest.scripts.length}>Save digest</button></div>
            </div>
            <div className="workspace-grid">
              <div className="topics">
                <div className="topic-label"><MessageSquare size={16} /> Viewer questions</div>
                {digest.scripts.map((item, index) => <button type="button" key={item.id} className="topic" aria-pressed={selected === index} onClick={() => setSelected(index)}>
                  <span className="topic-title">{item.title}</span><span className="topic-meta">{item.questions} questions · {item.score} demand</span><ArrowUpRight size={16} />
                </button>)}
                {digest.notes.map(note => <p className="note" key={note}>{note}</p>)}
                {message && <p className="note" role="status">{message}</p>}
              </div>
              {script ? <ScriptCard key={script.id} script={script} /> : <div className="script-card empty"><h3>No qualifying questions yet</h3><p>Try a different niche or select additional creators.</p></div>}
            </div>
          </div>
        </section>
        <section id="how" className="frame how">
          <div><span className="eyebrow">HOW IT WORKS</span><h2>Start with demand<span>.</span></h2></div>
          <p>Choose a channel or a niche. ClipSpill groups unanswered viewer questions, shows the evidence behind each topic, and gives you a script you can make your own.</p>
        </section>
      </main>
      <footer className="frame footer"><Brand /><Link href="/dashboard">Open dashboard <ArrowUpRight size={15} /></Link></footer>
    </>
  );
}
