'use client';

import { useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, Clipboard, MessageSquare, Play, Zap } from 'lucide-react';
import type { Angle, Format, Receipt, Script } from '../lib/preview/types';

const angles: Angle[] = ['Demo', 'Mistake', 'Price breakdown'];
const formats: Format[] = ['Shorts', 'Reels'];

function downloadSticker(receipt: Receipt) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  canvas.width = 1080;
  context.font = '36px system-ui';
  const chunks = receipt.text.match(/\S+\s*/gu) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const chunk of chunks) {
    if (line && context.measureText(line + chunk).width > 930) {
      lines.push(line.trim());
      line = '';
    }
    line += chunk;
    if (lines.length >= 7) break;
  }
  if (line && lines.length < 7) lines.push(line.trim());
  canvas.height = 148 + 50 * lines.length;
  context.fillStyle = '#fffdf6';
  context.beginPath();
  context.roundRect(28, 24, 1024, canvas.height - 45, 36);
  context.fill();
  context.fillStyle = '#52621a';
  context.font = 'bold 28px system-ui';
  context.fillText(receipt.author.slice(0, 48), 65, 84, 950);
  context.fillStyle = '#181617';
  context.font = '36px system-ui';
  lines.forEach((text, index) => context.fillText(text, 65, 140 + index * 50, 950));
  const link = document.createElement('a');
  link.download = 'clipspill-reply-sticker.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function ScriptCard({ script }: { script: Script }) {
  const [angle, setAngle] = useState<Angle>('Demo');
  const [format, setFormat] = useState<Format>('Shorts');
  const [fills, setFills] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  const beats = script.angles[angle].map((beat, index) => (format === 'Reels' && index === 2
    ? { ...beat, label: 'Reels CTA', text: script.reelCta } : beat));
  const fields = [...new Set(beats.flatMap(beat => [...beat.text.matchAll(/\[([^\]]+)\]/g)].map(match => match[1])))];
  const fillText = (value: string) => value.replace(/\[([^\]]+)\]/g, (token, key: string) => fills[key]?.trim() || token);
  const wordCount = beats.flatMap(beat => fillText(beat.text).trim().split(/\s+/)).length;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(label);
    } catch {
      setFeedback('Clipboard unavailable in this browser.');
    }
  }

  return (
    <div className="script-card">
      <div className="script-top">
        <div><span className="eyebrow">SCRIPT WORKSPACE</span><h3>{script.title}</h3></div>
        <span className="score"><Zap size={15} aria-hidden="true" /> {script.score} demand</span>
      </div>
      <div className="format-row" aria-label="Script format">
        {formats.map(option => <button type="button" key={option} aria-pressed={format === option} onClick={() => { setFormat(option); setFeedback(''); }}><Play size={13} aria-hidden="true" /> {option}</button>)}
      </div>
      <div className="angles" aria-label="Script angle">
        {angles.map(option => <button type="button" key={option} aria-pressed={angle === option} onClick={() => { setAngle(option); setFeedback(''); }}>{option}</button>)}
      </div>
      <div className="beats">
        {beats.map(beat => <div className="beat" key={beat.time}>
          <span className="time">{beat.time}</span><div><strong>{beat.label}</strong><p>{fillText(beat.text)}</p></div>
        </div>)}
      </div>
      <p className="script-runtime">{wordCount} words · about {Math.round(wordCount / 2.3)} sec spoken</p>
      <details className="disclosure">
        <summary>Fill in your setup</summary>
        <div className="fields">{fields.map(field => <label key={field}>{field}<input value={fills[field] ?? ''} maxLength={140} onChange={event => setFills(previous => ({ ...previous, [field]: event.target.value }))} /></label>)}</div>
      </details>
      {format === 'Reels' && <details className="disclosure"><summary>Reels caption</summary><p className="caption">{fillText(script.reelCaption)}</p>
        <button type="button" className="quiet" onClick={() => void copy(fillText(script.reelCaption), 'Caption copied.')}><Clipboard size={15} /> Copy caption</button>
      </details>}
      <details className="disclosure">
        <summary><MessageSquare size={16} aria-hidden="true" /> Evidence &amp; basis <span>{script.questions} questions · {script.likes} likes</span></summary>
        <ul className="receipts">{script.receipts.map(receipt => <li key={receipt.id}>
          <strong>{receipt.author}</strong><blockquote>{receipt.text}</blockquote>
          {receipt.url?.startsWith('https://www.youtube.com/watch?') && <a href={receipt.url} target="_blank" rel="noreferrer">Open comment <ArrowUpRight size={14} /></a>}
        </li>)}</ul>
      </details>
      {script.questions >= 25 && <details className="disclosure">
        <summary>8–10 minute YouTube blueprint</summary>
        <p><strong>Title and thumbnail concepts</strong></p>
        <ol>
          <li>{script.title} · Thumbnail: the setup beside the result.</li>
          <li>What I’d change about my setup · Thumbnail: highlight the specific part you changed.</li>
          <li>I tested two ways to solve this · Thumbnail: show the same test side by side.</li>
        </ol>
        <p><strong>0:00–1:00 Intro</strong> — Open on the top viewer question, then preview the result viewers will see.</p>
        <p><strong>1:00 Setup</strong> — Show your baseline and explain what you are testing.</p>
        <p><strong>2:30 Demo</strong> — Record the first comparison with the test conditions on screen.</p>
        <p><strong>4:30 Mistakes</strong> — Replay an unsuccessful attempt and show what you changed.</p>
        <p><strong>6:30 Decision</strong> — Summarize your verified result and who your setup works for.</p>
        <p><strong>B-roll</strong> — Comment sticker, setup close-up, uninterrupted test, side-by-side results.</p>
      </details>}
      <details className="disclosure">
        <summary>Quick reply</summary><p>{script.reply}</p>
        <button type="button" className="quiet" onClick={() => void copy(script.reply, 'Reply copied.')}><Clipboard size={15} /> Copy reply</button>
      </details>
      <div className="script-actions">
        <button className="btn secondary" type="button" onClick={() => void copy(beats.map(beat => fillText(beat.text)).join('\n\n'), 'Script copied.')}><Clipboard size={16} /> Copy script</button>
        {script.receipts[0] && <button className="btn secondary" type="button" onClick={() => downloadSticker(script.receipts[0])}><ArrowDownToLine size={16} /> Reply sticker PNG</button>}
        <span className="feedback" role="status">{feedback && <><Check size={14} /> {feedback}</>}</span>
      </div>
    </div>
  );
}
