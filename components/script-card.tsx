'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownToLine, ArrowUpRight, Check, Clipboard, Lock, MessageSquare, Play, Sparkles, TrendingUp } from 'lucide-react';
import { isLockedScript, type Angle, type Format, type Receipt, type ScriptItem } from '../lib/preview/types';
import { BlurFade } from './magicui/blur-fade';
import { MagicCard } from './magicui/magic-card';
import { NumberTicker } from './magicui/number-ticker';
import { cn } from '@/lib/utils';

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
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.roundRect(28, 24, 1024, canvas.height - 45, 36);
  context.fill();
  context.fillStyle = '#6c90b8';
  context.font = 'bold 28px system-ui';
  context.fillText(receipt.author.slice(0, 48), 65, 84, 950);
  context.fillStyle = '#181c24';
  context.font = '36px system-ui';
  lines.forEach((text, index) => context.fillText(text, 65, 140 + index * 50, 950));
  const link = document.createElement('a');
  link.download = 'clipspill-reply-sticker.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function ScriptCard({
  script,
  onUnlockRequest
}: {
  script: ScriptItem;
  onUnlockRequest?: () => void;
}) {
  const [angle, setAngle] = useState<Angle>('Demo');
  const [format, setFormat] = useState<Format>('Shorts');
  const [fills, setFills] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');

  if (isLockedScript(script)) {
    return (
      <BlurFade delay={0.05}>
        <MagicCard className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eff1f4] px-2.5 py-1 text-[11px] font-medium text-[#6b7280]">
                <Lock size={11} /> Locked Script
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#181c24] sm:text-2xl">
                {script.title}
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#181c24] px-3 py-1.5 text-xs font-medium text-white">
              <Sparkles size={13} className="text-[#e85334]" />
              <span><NumberTicker value={script.score} /> demand · {script.questions} questions</span>
            </div>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-[#eff1f4] p-5">
            <div className="select-none pointer-events-none blur-md space-y-3" aria-hidden="true">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#181c24]">0–3s Hook</p>
              <p className="text-sm text-[#4b5563]">Locked viewer-backed opening hook tailored to your Top-Short pacing and outlier ratio.</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#181c24]">3–28s Proof Cuts</p>
              <p className="text-sm text-[#4b5563]">Locked step-by-step vertical script with interactive setup placeholders and 28–35s loop CTA.</p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/50 p-4 text-center backdrop-blur-[2px]">
              <p className="text-xs font-semibold text-[#181c24]">
                {script.questions} verified questions · {script.likes} likes
              </p>
              <button
                type="button"
                onClick={onUnlockRequest}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#181c24] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Lock size={13} /> Unlock Automatic Delivery
              </button>
            </div>
          </div>
        </MagicCard>
      </BlurFade>
    );
  }

  const beats = script.angles[angle].map((beat, index) =>
    format === 'Reels' && index === 2 ? { ...beat, time: '29–38s', label: 'Reels CTA', text: script.reelCta } : beat
  );
  const blanks = [...new Set(beats.flatMap(beat => beat.text.match(/\[[^\]]+\]/g) ?? []))];
  const fill = (text: string) => blanks.reduce((value, blank) => value.replaceAll(blank, fills[blank]?.trim() || blank), text);
  const words = beats.reduce((count, beat) => count + fill(beat.text).split(/\s+/).filter(Boolean).length, 0);
  const seconds = Math.round(words / 2.6);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(label);
    } catch {
      setFeedback('Clipboard unavailable.');
    }
  }

  return (
    <BlurFade delay={0.05}>
      <MagicCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold tracking-tight text-[#181c24] sm:text-2xl">
              {script.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#6b7280]">
              {script.topShortDna && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eff1f4] px-2.5 py-1 text-[#181c24]">
                  <TrendingUp size={11} className="text-[#6c90b8]" />
                  Top-Short DNA: {script.topShortDna.title} ({script.topShortDna.views.toLocaleString()} views · {script.topShortDna.wpm} WPM)
                </span>
              )}
              {script.framework && (
                <span className="rounded-full bg-[#eff1f4] px-2.5 py-1 text-[#6b7280]">
                  {script.framework.hookType}
                </span>
              )}
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#181c24] px-3 py-1.5 text-xs font-medium text-white">
            <Sparkles size={13} className="text-[#e85334]" />
            <span><NumberTicker value={script.score} /> demand</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-900/[0.06] pb-3">
          <div className="inline-flex rounded-full bg-[#eff1f4] p-1" role="group" aria-label="Format">
            {formats.map(item => (
              <button
                key={item}
                type="button"
                aria-pressed={format === item}
                onClick={() => setFormat(item)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-all',
                  format === item
                    ? 'bg-white text-[#181c24] shadow-sm'
                    : 'text-[#6b7280] hover:text-[#181c24]'
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Script angle">
            {angles.map(item => (
              <button
                key={item}
                type="button"
                aria-pressed={angle === item}
                onClick={() => setAngle(item)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  angle === item
                    ? 'border-[#181c24] bg-[#181c24] text-white'
                    : 'border-slate-900/10 bg-white text-[#6b7280] hover:border-slate-900/25 hover:text-[#181c24]'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${angle}-${format}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-4 space-y-3"
          >
            <p className="text-xs font-medium text-[#6b7280]">
              {words} words · ~{seconds}s
            </p>
            <div className="divide-y divide-slate-900/[0.06]">
              {beats.map(beat => (
                <div key={beat.time} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-4">
                  <span className="font-mono text-xs font-medium text-[#6c90b8]">{beat.time}</span>
                  <div>
                    <strong className="text-xs font-semibold uppercase tracking-wider text-[#181c24]">{beat.label}</strong>
                    <p className="mt-1 text-sm leading-relaxed text-[#4b5563]">{fill(beat.text)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {blanks.length > 0 && (
          <details open className="group mt-2 border-t border-slate-900/[0.06] pt-3">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[#181c24]">
              <span>Customize placeholders ({blanks.length})</span>
              <span className="text-[#6b7280]">Live update</span>
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {blanks.map(blank => (
                <label key={blank} className="grid gap-1 text-xs font-medium text-[#6b7280]">
                  <span>{blank.slice(1, -1)}</span>
                  <input
                    value={fills[blank] ?? ''}
                    maxLength={80}
                    placeholder="Type value…"
                    onChange={event => setFills({ ...fills, [blank]: event.target.value })}
                    className="rounded-xl border border-slate-900/10 bg-[#eff1f4] px-3 py-2 text-xs text-[#181c24] placeholder:text-slate-400 focus:border-[#6c90b8] focus:bg-white focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </details>
        )}

        <details open className="mt-3 border-t border-slate-900/[0.06] pt-3">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[#181c24]">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare size={13} className="text-[#6c90b8]" />
              Evidence ({script.questions} questions · {script.likes} likes)
            </span>
          </summary>
          <ul className="mt-3 space-y-2">
            {script.receipts.map(receipt => (
              <li key={receipt.id} className="rounded-2xl bg-[#eff1f4] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#181c24]">{receipt.author}</span>
                  <span className="text-[#6b7280]">{receipt.likes} likes</span>
                </div>
                <p className="mt-1 text-[#4b5563]">{receipt.text}</p>
                {receipt.url && (
                  <a
                    href={receipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-medium text-[#6c90b8] hover:underline"
                  >
                    Open comment <ArrowUpRight size={12} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>

        <details className="mt-3 border-t border-slate-900/[0.06] pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#181c24]">
            Quick reply &amp; caption
          </summary>
          <div className="mt-2.5 space-y-2 rounded-2xl bg-[#eff1f4] p-3 text-xs text-[#4b5563]">
            <p className="whitespace-pre-wrap">{format === 'Reels' ? fill(script.reelCaption) : script.reply}</p>
            <button
              type="button"
              onClick={() => copy(format === 'Reels' ? fill(script.reelCaption) : script.reply, 'Copied')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#181c24] shadow-sm transition hover:bg-slate-50"
            >
              <Clipboard size={12} /> Copy {format === 'Reels' ? 'caption' : 'reply'}
            </button>
          </div>
        </details>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copy(beats.map(beat => `${beat.time} ${beat.label}\n${fill(beat.text)}`).join('\n\n'), 'Script copied')}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#181c24] px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            <Play size={13} /> Copy script
          </button>
          {script.receipts[0] && (
            <button
              type="button"
              onClick={() => downloadSticker(script.receipts[0])}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs font-medium text-[#181c24] transition hover:bg-[#eff1f4]"
            >
              <ArrowDownToLine size={13} /> Download Sticker PNG
            </button>
          )}
          {feedback && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6c90b8]" role="status">
              <Check size={13} /> {feedback}
            </span>
          )}
        </div>
      </MagicCard>
    </BlurFade>
  );
}
