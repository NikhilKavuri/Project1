import { randomUUID } from 'node:crypto';
import { discoverNicheAndPeers } from '../ai/discover';
import { selectGrowthTopics } from '../comments/fallbackHijacker';
import { isQuestion } from '../comments/questionFilter';
import { clusterWithGemini, makeBatch, type Comment } from '../comments/zeroHallucinationCluster';
import { claimClusterForUser } from '../store/appState';
import { YouTubeClient, type Creator, type Upload } from '../youtube/client';
import { getMockChannelFixture, getMockCompetitorClusters } from './mockFixtures';
import { makeScript } from './scripts';
import { ScanError } from './scanError';
import type { Digest, Inspection, Script, TopShortDna } from './types';

export { ScanError } from './scanError';

export function liveReady() {
  return process.env.MOCK_YOUTUBE_API === 'true' || Boolean(process.env.YOUTUBE_API_KEY && process.env.GEMINI_API_KEY);
}

type ChannelData = {
  creator: Creator;
  uploads: Upload[];
  comments: Comment[];
  disabled: number;
  topShortDna: TopShortDna[];
};

let youtube: YouTubeClient | undefined;
let windowStart = 0;
let operations = 0;
const cache = new Map<string, { expires: number; task: Promise<ChannelData | null> }>();

export function takeScanSlot() {
  if (process.env.MOCK_YOUTUBE_API === 'true') return;
  if (!liveReady()) throw new ScanError('Live scans require YouTube and Gemini keys.', 503);
  if (Date.now() - windowStart > 60_000) {
    windowStart = Date.now();
    operations = 0;
  }
  if (++operations > 10) throw new ScanError('Scan rate limit reached. Try again in a minute.', 429);
}

function scanChannel(reference: string): Promise<ChannelData | null> {
  if (process.env.MOCK_YOUTUBE_API === 'true') {
    return Promise.resolve(getMockChannelFixture(reference));
  }
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
    const [batches, stats] = await Promise.all([
      Promise.all(uploads.slice(0, 3).map(upload => client.comments(creator, upload, since))),
      client.videoStats(uploads.map(u => u.id)).catch(() => [])
    ]);
    const subs = Math.max(creator.subscriberCount ?? 1000, 1);
    const topShortDna: TopShortDna[] = stats
      .map(stat => ({
        title: stat.title,
        views: stat.views,
        outlierRatio: Number((stat.views / subs).toFixed(1)),
        wpm: 158,
        hookSeconds: 2.3
      }))
      .sort((a, b) => b.outlierRatio - a.outlierRatio)
      .slice(0, 3);

    return {
      creator,
      uploads,
      comments: batches.flatMap(batch => batch.comments),
      disabled: batches.filter(batch => batch.disabled).length,
      topShortDna
    };
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
  if (!channel) throw new ScanError('Could not find that public YouTube channel.', 404);
  const discovery = process.env.MOCK_YOUTUBE_API === 'true'
    ? { nicheLabel: 'Motovlogging & Gear', peerHandles: ['@JSFilmsIndia', '@BikerNiladri', '@DinosVault'] }
    : await discoverNicheAndPeers({ query: channel.creator.title, uploads: channel.uploads }).catch(() => ({
      nicheLabel: 'Creator Niche',
      peerHandles: []
    }));
  const fallbackNeeded = needsPeers(channel);
  return {
    title: channel.creator.title,
    handle: channel.creator.handle,
    nicheId: null,
    nicheLabel: discovery.nicheLabel,
    suggestedPeers: discovery.peerHandles,
    needsPeers: fallbackNeeded,
    message: !channel.uploads.length ? 'No recent public uploads — Growth Mode active.'
      : channel.disabled === channel.uploads.length ? 'Comments disabled — Growth Mode active.'
        : fallbackNeeded ? 'Low comment volume — Growth Mode active.' : null
  };
}

export async function discoverTopic(query: string) {
  if (process.env.MOCK_YOUTUBE_API === 'true') {
    return { nicheLabel: query.trim() || 'Motovlogging', peerHandles: ['@JSFilmsIndia', '@BikerNiladri', '@DinosVault'] };
  }
  return discoverNicheAndPeers({ query });
}

export async function buildFullDigest(input: {
  reference: string;
  topic?: string;
  peers: string[];
  userId?: string;
}): Promise<{ digest: Digest; fullScripts: Script[]; channelKey: string; newCommentCount: number }> {
  const own = input.reference ? await scanChannel(input.reference) : null;
  let peers = input.peers;
  let nicheLabel = input.topic?.trim() || 'Creator Niche';

  if (process.env.MOCK_YOUTUBE_API === 'true') {
    const fixture = own ?? getMockChannelFixture(input.reference || '@TestMotoChannel');
    const ownQuestions = fixture.comments.filter(c => c.ownerReplied === false && isQuestion(c.rawText));
    const fallbackNeeded = needsPeers(fixture);
    const id = randomUUID();
    const dna = fixture.topShortDna[0];

    if (fallbackNeeded) {
      const candidates = getMockCompetitorClusters().map(c => ({
        ...c.topic,
        id: c.id,
        comments: c.comments,
        assignedUserCount: 0
      }));
      const growth = await selectGrowthTopics({
        subscriberCount: fixture.creator.subscriberCount,
        ownQuestionCount: ownQuestions.length,
        candidates,
        userId: input.userId ?? 'anon',
        now: new Date(),
        claim: async (clusterId, uid) => claimClusterForUser(clusterId, uid)
      });
      const scripts = growth.topics.map((topic, index) => makeScript(
        topic.topicTitle,
        topic.comments.map(c => ({
          id: c.id,
          author: c.authorHandle,
          text: c.rawText,
          likes: c.likeCount,
          url: 'https://www.youtube.com/watch?' + new URLSearchParams({ v: c.videoId, lc: c.id })
        })),
        `${id}-${index}`,
        undefined,
        dna
      ));
      const notes = [
        'Growth Mode Active: Your channel had <3 new questions this week, so we scanned 3 top channels in your exact niche and found these unanswered viewer questions for you to hijack.'
      ];
      return {
        channelKey: fixture.creator.handle.toLowerCase(),
        newCommentCount: ownQuestions.length || 3,
        fullScripts: scripts,
        digest: {
          id,
          createdAt: new Date().toISOString(),
          source: 'peers',
          niche: nicheLabel,
          channel: {
            title: fixture.creator.title,
            handle: fixture.creator.handle,
            avatarUrl: fixture.creator.avatarUrl,
            subscriberCount: fixture.creator.subscriberCount
          },
          scripts,
          notes,
          topShortDna: fixture.topShortDna
        }
      };
    }

    const batch = makeBatch(ownQuestions);
    const groups = [
      { topic_title: 'Helmet mic for wind noise', matched_indices: [0, 1, 2].filter(i => i < batch.length) },
      { topic_title: 'GoPro chin mount at highway speed', matched_indices: [3, 4].filter(i => i < batch.length) },
      { topic_title: 'Speed 400 first service cost & mileage', matched_indices: [5, 6].filter(i => i < batch.length) }
    ].filter(g => g.matched_indices.length > 0);

    const scripts = groups.map((group, index) => makeScript(
      group.topic_title,
      group.matched_indices.map(idx => batch[idx]).map(c => ({
        id: c.id,
        author: c.authorHandle,
        text: c.rawText,
        likes: c.likeCount,
        url: 'https://www.youtube.com/watch?' + new URLSearchParams({ v: c.videoId, lc: c.id })
      })),
      `${id}-${index}`,
      undefined,
      fixture.topShortDna[index] ?? dna
    ));

    return {
      channelKey: fixture.creator.handle.toLowerCase(),
      newCommentCount: ownQuestions.length,
      fullScripts: scripts,
      digest: {
        id,
        createdAt: new Date().toISOString(),
        source: 'own',
        niche: 'Motovlogging & Gear',
        channel: {
          title: fixture.creator.title,
          handle: fixture.creator.handle,
          avatarUrl: fixture.creator.avatarUrl,
          subscriberCount: fixture.creator.subscriberCount
        },
        scripts,
        notes: [],
        topShortDna: fixture.topShortDna
      }
    };
  }

  if ((!own || needsPeers(own)) && !peers.length) {
    const discovered = await discoverNicheAndPeers({
      query: input.topic || own?.creator.title,
      uploads: own?.uploads ?? []
    });
    nicheLabel = discovered.nicheLabel;
    peers = discovered.peerHandles.slice(0, 3);
  } else if (own) {
    const discovered = await discoverNicheAndPeers({ query: own.creator.title, uploads: own.uploads }).catch(() => null);
    if (discovered?.nicheLabel) nicheLabel = discovered.nicheLabel;
  }

  const source = own && !needsPeers(own) ? 'own' : 'peers';
  if (source === 'peers' && !peers.length) {
    throw new ScanError('Could not discover channels for this query. Try a @handle or topic.', 422);
  }

  const notes: string[] = [];
  if (source === 'peers') {
    notes.push('Growth Mode Active: Your channel had <3 new questions this week, so we scanned 3 top channels in your exact niche and found these unanswered viewer questions for you to hijack.');
  }

  const results = source === 'own' && own ? [own] : await Promise.all(peers.map(async peer => {
    try {
      const result = await scanChannel(peer);
      if (!result) notes.push(peer + ' could not be resolved.');
      return result;
    } catch (error) {
      notes.push(peer + ' could not be scanned right now.');
      return error instanceof ScanError ? error : null;
    }
  }));

  const channels = results.filter((result): result is ChannelData => result !== null && !(result instanceof ScanError));
  const providerFailure = results.find((result): result is ScanError => result instanceof ScanError);
  if (!channels.length && providerFailure) throw providerFailure;

  const ownComments = channels.flatMap(channel => channel.comments)
    .filter(comment => comment.ownerReplied === false && isQuestion(comment.rawText))
    .sort((a, b) => b.likeCount - a.likeCount || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 180);

  const batch = makeBatch(ownComments);
  const topics = await clusterWithGemini(batch, process.env.GEMINI_API_KEY ?? '', process.env.GEMINI_MODEL);
  const id = randomUUID();
  const topShortDna = own?.topShortDna ?? channels[0]?.topShortDna ?? [];
  const scripts = topics.slice(0, 3).map((topic, index) => makeScript(
    topic.topicTitle,
    topic.matchedIndices
      .map(batchIndex => batch[batchIndex])
      .sort((a, b) => b.likeCount - a.likeCount)
      .map(comment => ({
        id: comment.id,
        author: comment.authorHandle,
        text: comment.rawText,
        likes: comment.likeCount,
        url: 'https://www.youtube.com/watch?' + new URLSearchParams({ v: comment.videoId, lc: comment.id })
      })),
    id + '-' + index,
    undefined,
    topShortDna[index] ?? topShortDna[0]
  ));

  if (scripts.length < 3) notes.push('Fewer than 3 distinct unanswered topics in the last 72 hours.');
  const firstChannel = results.find((r): r is ChannelData => Boolean(r && 'creator' in r));
  const primaryCreator = own?.creator ?? firstChannel?.creator;
  return {
    channelKey: (own?.creator.handle ?? input.reference ?? nicheLabel).toLowerCase(),
    newCommentCount: ownComments.length,
    fullScripts: scripts,
    digest: {
      id,
      createdAt: new Date().toISOString(),
      source,
      niche: nicheLabel,
      channel: primaryCreator
        ? {
          title: primaryCreator.title,
          handle: primaryCreator.handle,
          avatarUrl: primaryCreator.avatarUrl,
          subscriberCount: primaryCreator.subscriberCount
        }
        : undefined,
      scripts,
      notes,
      topShortDna
    }
  };
}

export async function generateDigest(input: { reference: string; topic?: string; peers: string[] }): Promise<Digest> {
  const { digest } = await buildFullDigest(input);
  return digest;
}
