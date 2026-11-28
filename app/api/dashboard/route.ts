import { NextRequest } from 'next/server';
import { buildFullDigest } from '@/lib/preview/live';
import { getOrCreateUserState, readAppState, writeAppState } from '@/lib/store/appState';
import { currentUser, isSupabaseConfigured } from '@/lib/supabase';
import { normalizeHandle } from '@/lib/youtube/normalizeHandle';

async function resolveUserId(request: NextRequest): Promise<{ userId: string; email: string }> {
  if (isSupabaseConfigured()) {
    const account = await currentUser(request).catch(() => null);
    if (account?.user?.id) {
      return { userId: account.user.id, email: account.user.email ?? 'creator@clipspill.local' };
    }
  }
  const cookieUid = request.cookies.get('clipspill-uid')?.value;
  return { userId: cookieUid || 'demo-creator', email: 'creator@clipspill.local' };
}

export async function GET(request: NextRequest) {
  const { userId, email } = await resolveUserId(request);
  const userState = getOrCreateUserState(userId, email);
  return Response.json({ account: userState });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { userId, email } = await resolveUserId(request);
  const userState = getOrCreateUserState(userId, email);
  const state = readAppState();

  if (body.action === 'complete_onboarding') {
    const channelHandle = typeof body.channelHandle === 'string' ? body.channelHandle.trim() : '';
    const instagramUrl = typeof body.instagramUrl === 'string' ? body.instagramUrl.trim().slice(0, 300) : '';
    const competitorHandles: string[] = Array.isArray(body.competitorHandles)
      ? body.competitorHandles
        .map((h: unknown) => normalizeHandle(String(h)))
        .filter((r: ReturnType<typeof normalizeHandle>): r is { kind: 'handle'; value: string } => r?.kind === 'handle')
        .map((r: { kind: 'handle'; value: string }) => r.value)
        .slice(0, 5)
      : [];

    state.users[userId] = {
      ...userState,
      channelHandle: channelHandle || userState.channelHandle,
      competitorHandles,
      instagramUrl,
      onboarded: true
    };
    writeAppState(state);
    return Response.json({ account: state.users[userId] });
  }

  if (body.action === 'save_schedule') {
    const frequencyHours = [48, 72, 168].includes(Number(body.frequencyHours)) ? Number(body.frequencyHours) : 48;
    const preferredHourIst = Math.min(23, Math.max(0, Number(body.preferredHourIst ?? 9)));
    const triggerOnNewUpload = Boolean(body.triggerOnNewUpload);
    const channelHandle = typeof body.channelHandle === 'string' ? body.channelHandle.trim() : userState.channelHandle;
    const competitorHandles: string[] = Array.isArray(body.competitorHandles)
      ? body.competitorHandles
        .map((h: unknown) => normalizeHandle(String(h)))
        .filter((r: ReturnType<typeof normalizeHandle>): r is { kind: 'handle'; value: string } => r?.kind === 'handle')
        .map((r: { kind: 'handle'; value: string }) => r.value)
        .slice(0, 5)
      : userState.competitorHandles;

    state.users[userId] = {
      ...userState,
      frequencyHours,
      preferredHourIst,
      triggerOnNewUpload,
      channelHandle,
      competitorHandles,
      nextRunAt: new Date(Date.now() + frequencyHours * 3_600_000).toISOString()
    };
    writeAppState(state);
    return Response.json({ account: state.users[userId] });
  }

  if (body.action === 'delta_spy') {
    const peers = userState.competitorHandles.length ? userState.competitorHandles : ['@JSFilmsIndia'];
    const { digest } = await buildFullDigest({
      reference: '',
      topic: 'Competitor Spy',
      peers,
      userId
    });
    const hijackQuestions = digest.scripts.flatMap(script =>
      'receipts' in script
        ? script.receipts.map(receipt => ({
          id: receipt.id,
          topic: script.title,
          author: receipt.author,
          text: receipt.text,
          likes: receipt.likes,
          url: receipt.url
        }))
        : []
    );

    state.users[userId] = {
      ...userState,
      lastSyncedAt: new Date().toISOString(),
      digests: [digest, ...userState.digests].slice(0, 20)
    };
    writeAppState(state);
    return Response.json({ hijackQuestions, digest, account: state.users[userId] });
  }

  return Response.json({ error: 'Unknown action.' }, { status: 400 });
}
