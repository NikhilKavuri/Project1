import type { Comment, Topic } from './zeroHallucinationCluster';

export type Candidate = Topic & { id: string; comments: Comment[]; assignedUserCount: number };
export type ClaimCluster = (id: string, userId: string) => Promise<boolean>;

export async function selectGrowthTopics({
  subscriberCount, ownQuestionCount, candidates, userId, now, claim, limit = 3
}: {
  subscriberCount: number | null;
  ownQuestionCount: number;
  candidates: Candidate[];
  userId: string;
  now: Date;
  claim: ClaimCluster;
  limit?: number;
}): Promise<{ active: boolean; topics: Candidate[] }> {
  const active = (subscriberCount !== null && subscriberCount < 100) || ownQuestionCount < 3;
  const topics: Candidate[] = [];
  if (!active) return { active, topics };

  const cutoff = now.getTime() - 72 * 60 * 60 * 1_000;
  const eligible = candidates.filter(candidate => candidate.assignedUserCount < 2 && candidate.comments.length > 0 &&
    candidate.comments.every(comment => {
      const published = Date.parse(comment.publishedAt);
      return comment.ownerReplied === false && published >= cutoff && published <= now.getTime();
    }));
  eligible.sort((a, b) => a.assignedUserCount - b.assignedUserCount || b.demandScore - a.demandScore || a.id.localeCompare(b.id));
  for (const candidate of eligible) {
    if (topics.length >= limit) break;
    if (await claim(candidate.id, userId)) topics.push(candidate);
  }
  return { active, topics };
}
