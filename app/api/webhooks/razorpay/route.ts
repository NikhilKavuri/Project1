import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getOrCreateUserState, readAppState, writeAppState } from '@/lib/store/appState';

function verifyHmac(rawBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
    || (process.env.NODE_ENV !== 'production' ? 'test-razorpay-secret' : '');

  if (!verifyHmac(rawBody, signature, secret)) {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: { subscription?: { entity?: { id?: string; notes?: { userId?: string; channelKey?: string } } } };
  };

  const eventId = request.headers.get('x-razorpay-event-id')
    || createHash('sha256').update(rawBody).digest('hex');

  const state = readAppState();
  if (state.webhookEvents.includes(`rzp:${eventId}`)) {
    return Response.json({ ok: true, idempotent: true });
  }

  const sub = payload.payload?.subscription?.entity;
  const userId = sub?.notes?.userId || 'demo-creator';
  const channelKey = sub?.notes?.channelKey?.toLowerCase();
  const userState = getOrCreateUserState(userId);
  const latestState = readAppState();

  if (payload.event === 'subscription.activated' || payload.event === 'subscription.charged') {
    const unlockedDigests = [...userState.digests];
    const locks = channelKey && latestState.previewLocks[channelKey]
      ? [latestState.previewLocks[channelKey]]
      : Object.values(latestState.previewLocks);

    for (const lock of locks) {
      if (!unlockedDigests.some(d => d.id === lock.digestId)) {
        unlockedDigests.unshift({
          id: lock.digestId,
          createdAt: lock.createdAt,
          source: 'own',
          niche: lock.channelKey,
          scripts: lock.fullScripts,
          notes: []
        });
      }
    }

    latestState.users[userId] = {
      ...userState,
      planTier: 'PRO_199',
      subscriptionStatus: 'ACTIVE',
      razorpaySubId: sub?.id ?? userState.razorpaySubId,
      digests: unlockedDigests.slice(0, 20)
    };
  } else if (payload.event === 'subscription.halted' || payload.event === 'subscription.cancelled') {
    latestState.users[userId] = {
      ...userState,
      subscriptionStatus: payload.event === 'subscription.halted' ? 'PAST_DUE' : 'CANCELLED'
    };
  }

  latestState.webhookEvents.push(`rzp:${eventId}`);
  writeAppState(latestState);

  return Response.json({ ok: true, idempotent: false, status: latestState.users[userId].subscriptionStatus });
}
