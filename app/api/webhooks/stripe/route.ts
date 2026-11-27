import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getOrCreateUserState, readAppState, writeAppState } from '@/lib/store/appState';

function verifyStripeSignature(rawBody: string, header: string, secret: string): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  if (!parts.t || !parts.v1) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const a = Buffer.from(parts.v1, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';
  const secret = process.env.STRIPE_WEBHOOK_SECRET
    || (process.env.NODE_ENV !== 'production' ? 'test-stripe-secret' : '');

  if (!verifyStripeSignature(rawBody, sig, secret)) {
    return Response.json({ error: 'Invalid Stripe signature.' }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    id?: string;
    type?: string;
    data?: { object?: { id?: string; metadata?: { userId?: string } } };
  };

  const eventId = event.id ?? '';
  const state = readAppState();
  if (eventId && state.webhookEvents.includes(`stripe:${eventId}`)) {
    return Response.json({ ok: true, idempotent: true });
  }

  const userId = event.data?.object?.metadata?.userId || 'demo-creator';
  const userState = getOrCreateUserState(userId);
  const latestState = readAppState();

  if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {
    latestState.users[userId] = {
      ...userState,
      planTier: 'PRO_199',
      subscriptionStatus: 'ACTIVE',
      stripeSubId: event.data?.object?.id ?? userState.stripeSubId
    };
  } else if (event.type === 'customer.subscription.deleted') {
    latestState.users[userId] = {
      ...userState,
      subscriptionStatus: 'CANCELLED'
    };
  }

  if (eventId) latestState.webhookEvents.push(`stripe:${eventId}`);
  writeAppState(latestState);

  return Response.json({ ok: true, idempotent: false, status: latestState.users[userId].subscriptionStatus });
}
