import { expect, test } from 'playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/test-engine', { data: { action: 'reset' } });
});

test('teaser paywall unlocks Script #1 with receipts & sticker, redacts #2/#3 on server, and blocks repeat scan', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('402 (Payment Required)')) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/');
  const input = page.getByPlaceholder(/Search @channel, URL, or topic/i);
  await input.fill('@TestMotoChannel');

  const previewPromise = page.waitForResponse(
    res => res.url().includes('/api/preview') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /Scan/i }).click();
  const previewRes = await previewPromise;
  expect(previewRes.status()).toBe(200);
  const previewJson = await previewRes.json();

  // Server-side redaction check: Script #1 full, Scripts #2 and #3 redacted
  expect(previewJson.scripts).toHaveLength(3);
  expect(previewJson.scripts[0].locked).toBeFalsy();
  expect(previewJson.scripts[0].receipts.length).toBeGreaterThan(0);
  expect(previewJson.scripts[1].locked).toBe(true);
  expect(previewJson.scripts[1].angles).toBeUndefined();
  expect(previewJson.scripts[1].receipts).toBeUndefined();
  expect(previewJson.scripts[2].locked).toBe(true);
  expect(previewJson.scripts[2].angles).toBeUndefined();

  // Verify Script #1 UI: Top-Short DNA, clickable YouTube comment link, Download Sticker PNG
  await expect(page.getByText(/Top-Short DNA:/i)).toBeVisible();
  const proofLink = page.locator('a[href*="youtube.com/watch"][href*="lc="]').first();
  await expect(proofLink).toBeVisible();
  await expect(page.getByRole('button', { name: /Download Sticker PNG/i })).toBeVisible();

  // Interactive [Fill-in-the-blank] inline editor
  const placeholderInput = page.getByPlaceholder('Type value…').first();
  await placeholderInput.fill('DJI Mic Mini');
  await expect(page.getByText(/DJI Mic Mini/)).toBeVisible();

  // Click Script #2 in Topics list -> verify blurred locked state
  await page.getByRole('button', { name: /GoPro chin mount at highway speed/i }).first().click();
  await expect(page.locator('.blur-md')).toBeVisible();
  await expect(page.getByRole('button', { name: /Unlock Automatic Delivery/i })).toBeVisible();

  // Repeat scan of same handle -> blocked with 402 + modal
  const repeatPromise = page.waitForResponse(
    res => res.url().includes('/api/preview') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /Scan/i }).click();
  const repeatRes = await repeatPromise;
  expect(repeatRes.status()).toBe(402);
  await expect(page.getByRole('heading', { name: /1-Time Free Audit Used/i })).toBeVisible();

  expect(errors).toEqual([]);
});
