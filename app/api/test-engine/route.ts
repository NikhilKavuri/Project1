import { normalizeHandle } from '@/lib/youtube/normalizeHandle';
import { isQuestion } from '@/lib/comments/questionFilter';
import { makeBatch, verifyClusters, type Comment } from '@/lib/comments/zeroHallucinationCluster';
import { selectGrowthTopics } from '@/lib/comments/fallbackHijacker';
import { suggestNiche } from '@/lib/niches';

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development' || process.env.CLIPSPILL_ENGINE_TEST !== '1' || process.env.MOCK_YOUTUBE_API !== 'true') {
    return new Response(null, { status: 404 });
  }
  const input = await request.json();
  const now = new Date('2026-01-02T00:00:00Z');
  const base = { videoId: '12345678901', authorHandle: '@viewer', replyCount: 0, ownerReplied: false, publishedAt: now.toISOString() };
  const records: Comment[] = [
    { ...base, id: 'a', rawText: 'bhai helmet link dede', likeCount: 4 },
    { ...base, id: 'b', rawText: 'Which helmet mic is that?', likeCount: 2 },
    { ...base, id: 'c', rawText: 'nice video', likeCount: 100 }
  ];
  const batch = makeBatch(records);
  const [topic] = verifyClusters(batch, input.groups);
  const assignments = new Map<string, number>();
  const candidate = { ...topic, id: 'helmet-gear', comments: records.slice(0, 2), assignedUserCount: 0 };
  const results = await Promise.all(['creator-a', 'creator-b', 'creator-c'].map(userId => selectGrowthTopics({
    subscriberCount: 42, ownQuestionCount: 0, candidates: [candidate], now, userId,
    claim: async id => {
      const count = assignments.get(id) ?? 0;
      if (count >= 2) return false;
      assignments.set(id, count + 1);
      return true;
    }
  })));
  return Response.json({
    normalized: (input.references as string[]).map(normalizeHandle),
    questions: (input.comments as string[]).map(isQuestion),
    topic,
    niche: suggestNiche([{ title: 'Triumph Speed 400 motovlog', description: 'Testing a helmet mic' }])?.id,
    growth: results.map(({ active, topics }) => ({ active, topics: topics.map(({ id }) => id) })),
    assignmentCount: assignments.get('helmet-gear')
  });
}
