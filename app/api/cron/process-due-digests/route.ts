import { NextRequest } from 'next/server';
import { buildFullDigest } from '@/lib/preview/live';
import { readAppState, writeAppState } from '@/lib/store/appState';

export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
    || (process.env.NODE_ENV !== 'production' ? 'test-cron-secret' : '');
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();

  if (!expectedSecret || (bearer !== expectedSecret && headerSecret !== expectedSecret)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const state = readAppState();
  const now = Date.now();
  const processed: Array<{ userId: string; digestId: string; nextRunAt: string }> = [];

  for (const user of Object.values(state.users)) {
    if (user.subscriptionStatus !== 'ACTIVE') continue;
    const dueTime = Date.parse(user.nextRunAt);
    if (Number.isNaN(dueTime) || dueTime > now) continue;

    const { digest } = await buildFullDigest({
      reference: user.channelHandle,
      peers: user.competitorHandles,
      userId: user.userId
    });

    const nextRunAt = new Date(now + user.frequencyHours * 3_600_000).toISOString();
    state.users[user.userId] = {
      ...user,
      lastSyncedAt: new Date(now).toISOString(),
      nextRunAt,
      digests: [digest, ...user.digests].slice(0, 20)
    };
    processed.push({ userId: user.userId, digestId: digest.id, nextRunAt });
  }

  writeAppState(state);
  return Response.json({ ok: true, processedCount: processed.length, processed });
}
