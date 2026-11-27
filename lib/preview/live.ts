import { randomUUID } from 'node:crypto';
import { isQuestion } from '../comments/questionFilter';
import { clusterWithGemini, makeBatch, type Comment } from '../comments/zeroHallucinationCluster';
import { niches, suggestNiche } from '../niches';
import { YouTubeClient, type Creator, type Upload } from '../youtube/client';
import type { Digest, Inspection } from './types';
import { makeScript } from './scripts';

export function liveReady() {
  return process.env.MOCK_YOUTUBE_API !== 'true' && Boolean(process.env.YOUTUBE_API_KEY && process.env.GEMINI_API_KEY);
}

type ChannelData = { creator: Creator; uploads: Upload[]; comments: Comment[]; disabled: number };
let youtube: YouTubeClient | undefined;
let windowStart = 0;
let operations = 0;
const cache = new Map<string, { expires: number; task: Promise<ChannelData | null> }>();

export class ScanError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function takeScanSlot() {
  if (!liveReady()) throw new ScanError('Live scans need YouTube and Gemini configuration. Try the sample workspace.', 503);
  if (Date.now() - windowStart > 60_000) {
    windowStart = Date.now();
    operations = 0;
  }
  if (++operations > 5) throw new ScanError('Live scans are busy. Try again in a minute.', 429);
}

function scanChannel(reference: string) {
  const key = reference.toLowerCase();
  const previous = cache.get(key);
  if (previous && previous.expires > Date.now()) return previous.task;
  youtube ??= new YouTubeClient(process.env.YOUTUBE_API_KEY ?? '');
  const client = youtube;
  const task = (async () => {
    const creator = await client.resolve(reference);
    if (!creator) return null;
    const uploads = await client.uploads(creator);
    const since = new Date(Date.now() - 72 * 3_600_000);
    const batches = await Promise.all(uploads.map(upload => client.comments(creator, upload, since)));
    return { creator, uploads, comments: batches.flatMap(batch => batch.comments), disabled: batches.filter(batch => batch.disabled).length };
  })();
  if (cache.size >= 64) cache.delete(cache.keys().next().value as string);
  cache.set(key, { task, expires: Date.now() + 180_000 });
  void task.catch(() => { if (cache.get(key)?.task === task) cache.delete(key); });
  return task;
}

function needsPeers(channel: ChannelData) {
  return (channel.creator.subscriberCount !== null && channel.creator.subscriberCount < 100)
    || channel.comments.filter(comment => comment.ownerReplied === false && isQuestion(comment.rawText)).length < 3;
}

export async function inspectChannel(reference: string): Promise<Inspection> {
  const channel = await scanChannel(reference);
  if (!channel) throw new ScanError('We couldn’t find that public YouTube channel. Pick a niche or check the URL.', 404);
  return {
    title: channel.creator.title,
    handle: channel.creator.handle,
    nicheId: suggestNiche(channel.uploads)?.id ?? null,
    needsPeers: needsPeers(channel),
    message: !channel.uploads.length ? 'This channel has no recent public uploads.'
      : channel.disabled === channel.uploads.length ? 'Comments are disabled on the recent uploads.'
        : needsPeers(channel) ? 'Try related creators to find more unanswered questions.' : null
  };
}

export async function generateDigest(input: { reference: string; nicheId: string; peers: string[] }): Promise<Digest> {
  const own = input.reference ? await scanChannel(input.reference) : null;
  const niche = niches.find(item => item.id === input.nicheId) ?? (own ? suggestNiche(own.uploads) : null);
  const source = own && !needsPeers(own) ? 'own' : 'peers';
  if (source === 'peers' && !input.peers.length) throw new ScanError('Choose at least one creator to scan.', 422);
  const notes: string[] = [];
  const results = source === 'own' && own ? [own] : await Promise.all(input.peers.map(async peer => {
    try {
      const result = await scanChannel(peer);
      if (!result) notes.push(peer + ' could not be resolved to a public channel.');
      return result;
    } catch {
      notes.push(peer + ' could not be scanned right now.');
      return null;
    }
  }));
  const batch = makeBatch(results.flatMap(channel => channel?.comments ?? [])
    .filter(comment => comment.ownerReplied === false && isQuestion(comment.rawText))
    .sort((a, b) => b.likeCount - a.likeCount || b.publishedAt.localeCompare(a.publishedAt)).slice(0, 180));
  const topics = await clusterWithGemini(batch, process.env.GEMINI_API_KEY ?? '', process.env.GEMINI_MODEL);
  const id = randomUUID();
  const scripts = topics.slice(0, 3).map((topic, index) => makeScript(topic.topicTitle,
    topic.matchedIndices.map(batchIndex => batch[batchIndex]).sort((a, b) => b.likeCount - a.likeCount).map(comment => ({
      id: comment.id, author: comment.authorHandle, text: comment.rawText, likes: comment.likeCount,
      url: 'https://www.youtube.com/watch?' + new URLSearchParams({ v: comment.videoId, lc: comment.id })
    })), id + '-' + index));
  if (scripts.length < 3) notes.push('The selected channels yielded fewer than three distinct unanswered topics in the last 72 hours.');
  return { id, createdAt: new Date().toISOString(), source, niche: niche?.label ?? 'Custom creators', scripts, notes };
}
