import { createHmac } from 'node:crypto';
import { expect, test } from 'playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/test-engine', { data: { action: 'reset' } });
});

test('Razorpay webhook activates subscription idempotently, unlocks scripts on dashboard, and cron advances nextRunAt by 48h', async ({ page, request }) => {
  // 1. Trigger initial preview scan (locks Scripts #2 and #3)
  const previewRes = await request.post('/api/preview', { data: { reference: '@TestMotoChannel' } });
  expect(previewRes.status()).toBe(200);
  const previewJson = await previewRes.json();
  expect(previewJson.scripts[1].locked).toBe(true);

  // 2. Send signed Razorpay subscription.activated webhook
  const payload = JSON.stringify({
    event: 'subscription.activated',
    payload: {
      subscription: {
        entity: {
          id: 'sub_test_123',
          notes: { userId: 'demo-creator', channelKey: '@testmotochannel' }
        }
      }
    }
  });
  const signature = createHmac('sha256', 'test-razorpay-secret').update(payload).digest('hex');
  const headers = {
    'content-type': 'application/json',
    'x-razorpay-signature': signature,
    'x-razorpay-event-id': 'evt_rzp_001'
  };

  const firstWebhook = await request.post('/api/webhooks/razorpay', { data: payload, headers });
  expect(firstWebhook.status()).toBe(200);
  expect(await firstWebhook.json()).toEqual({ ok: true, idempotent: false, status: 'ACTIVE' });

  // 3. Verify /dashboard shows Active status and unblurred Scripts #2 and #3
  await page.goto('/dashboard');
  await expect(page.getByText(/Active · PRO_199/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /GoPro chin mount at highway speed/i })).toBeVisible();
  await expect(page.locator('.blur-md')).toHaveCount(0);

  // 4. Replay exact same webhook -> idempotent
  const replayWebhook = await request.post('/api/webhooks/razorpay', { data: payload, headers });
  expect(replayWebhook.status()).toBe(200);
  expect(await replayWebhook.json()).toEqual({ ok: true, idempotent: true });

  // 5. Set user due and trigger hourly cron worker -> creates digest and advances nextRunAt by 48h
  await request.post('/api/test-engine', { data: { action: 'set_due', userId: 'demo-creator', frequencyHours: 48 } });
  const before = Date.now();
  const cronRes = await request.get('/api/cron/process-due-digests', {
    headers: { 'x-cron-secret': 'test-cron-secret' }
  });
  expect(cronRes.status()).toBe(200);
  const cronJson = await cronRes.json();
  expect(cronJson.processedCount).toBe(1);
  const nextRunMs = Date.parse(cronJson.processed[0].nextRunAt);
  const hoursDelta = (nextRunMs - before) / 3_600_000;
  expect(hoursDelta).toBeGreaterThan(47.9);
  expect(hoursDelta).toBeLessThan(48.1);
});
