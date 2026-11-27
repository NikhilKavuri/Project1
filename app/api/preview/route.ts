import { NextRequest } from 'next/server';
import { buildFullDigest, ScanError, takeScanSlot } from '@/lib/preview/live';
import { applyPreviewRedaction, getOrCreateUserState, readAppState, writeAppState } from '@/lib/store/appState';
import { currentUser, isSupabaseConfigured } from '@/lib/supabase';
import { normalizeHandle } from '@/lib/youtube/normalizeHandle';

const MAX_ANON_TRIES = 2;

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const state = readAppState();
  const used = state.ipScans[ip] ?? 0;
  return Response.json({
    maxTries: MAX_ANON_TRIES,
    usedTries: used,
    remainingTries: Math.max(0, MAX_ANON_TRIES - used)
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Enter a YouTube @handle, URL, or topic.' }, { status: 400 });
    }

    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    const peers: string[] = Array.isArray(body.peers)
      ? body.peers.filter((v: unknown): v is string => typeof v === 'string').slice(0, 5)
      : [];

    let userId = typeof body.userId === 'string' ? body.userId : undefined;
    if (!userId && isSupabaseConfigured()) {
      const acct = await currentUser(request).catch(() => null);
      if (acct?.user?.id) userId = acct.user.id;
    }

    if (!reference && !topic && !peers.length) {
      return Response.json({ error: 'Enter a YouTube @handle, URL, or topic.' }, { status: 400 });
    }

    const ref = reference ? normalizeHandle(reference) : null;
    if (reference && !ref && !topic) {
      return await handlePreview({ reference: '', topic: reference, peers, userId, request });
    }

    return await handlePreview({ reference, topic, peers, userId, request });
  } catch (error) {
    console.error('[preview]', error);
    if (error instanceof ScanError) return Response.json({ error: error.message }, { status: error.status });
    const msg = error instanceof Error ? error.message : 'Preview scan could not complete.';
    return Response.json({ error: msg }, { status: 502 });
  }
}

async function handlePreview({
  reference,
  topic,
  peers,
  userId,
  request
}: {
  reference: string;
  topic: string;
  peers: string[];
  userId?: string;
  request: NextRequest;
}) {
  takeScanSlot();
  const normalized = reference ? normalizeHandle(reference) : null;
  const channelKey = (normalized?.value ?? topic).toLowerCase();
  const ip = getClientIp(request);

  const state = readAppState();
  const userState = userId ? getOrCreateUserState(userId) : null;
  const isPaid = userState?.subscriptionStatus === 'ACTIVE';
  const enforceLocks = process.env.CLIPSPILL_ENGINE_TEST === '1' || process.env.ENFORCE_PAYWALL === 'true';
  const ipUsed = state.ipScans[ip] ?? 0;

  if (enforceLocks && !isPaid && !userId) {
    if (state.previewLocks[channelKey]) {
      const lock = state.previewLocks[channelKey];
      return Response.json(
        {
          error: '1-Time Free Audit Used — Unlock Automatic Delivery',
          code: 'PREVIEW_ALREADY_USED',
          channelHandle: normalized?.value ?? topic,
          newCommentCount: lock.fullScripts.reduce((sum, s) => sum + s.questions, 0) + 4,
          remainingTries: Math.max(0, MAX_ANON_TRIES - ipUsed)
        },
        { status: 402 }
      );
    }
    if (ipUsed >= MAX_ANON_TRIES) {
      return Response.json(
        {
          error: '2 Free Studio Tries Used — Sign in or Upgrade to Continue',
          code: 'PREVIEW_ALREADY_USED',
          channelHandle: normalized?.value ?? topic,
          newCommentCount: 0,
          remainingTries: 0
        },
        { status: 402 }
      );
    }
  }

  const { digest, fullScripts } = await buildFullDigest({ reference, topic, peers, userId });

  if (!enforceLocks || (isPaid && userState)) {
    if (isPaid && userState) {
      const latestState = readAppState();
      latestState.users[userState.userId].digests = [digest, ...latestState.users[userState.userId].digests].slice(0, 20);
      writeAppState(latestState);
    }
    return Response.json({ ...digest, previewUsed: false, remainingTries: MAX_ANON_TRIES });
  }

  const redactedScripts = applyPreviewRedaction(fullScripts);
  const latestState = readAppState();
  latestState.previewLocks[channelKey] = {
    channelKey,
    ip,
    digestId: digest.id,
    fullScripts,
    createdAt: new Date().toISOString()
  };
  latestState.ipScans[ip] = (latestState.ipScans[ip] ?? 0) + 1;
  writeAppState(latestState);

  return Response.json({
    ...digest,
    scripts: redactedScripts,
    previewUsed: true,
    remainingTries: Math.max(0, MAX_ANON_TRIES - latestState.ipScans[ip])
  });
}
