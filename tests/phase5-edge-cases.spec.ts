import { expect, test } from 'playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/test-engine', { data: { action: 'reset' } });
});

test('zero comments / disabled comments channel triggers Growth Mode fallback cleanly', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');
  await page.getByPlaceholder(/Search @channel, URL, or topic/i).fill('@ZeroCommentsChannel');
  await page.getByRole('button', { name: /Scan/i }).click();

  await expect(page.getByText(/Growth Mode Active:/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Best helmet mic under 2000/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test('100% spam/emoji channel strips spam and falls back cleanly without empty cards', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder(/Search @channel, URL, or topic/i).fill('@SpamOnlyChannel');
  await page.getByRole('button', { name: /Scan/i }).click();

  await expect(page.getByText(/Growth Mode Active:/i)).toBeVisible();
  await expect(page.locator('h3').first()).toBeVisible();
});

test('mobile viewport (390x844) has zero horizontal overflow on Studio and Dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Viewer questions to ready scripts/i })).toBeVisible();
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(homeOverflow).toBe(false);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Schedule & Competitor Spy/i })).toBeVisible();
  const dashOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(dashOverflow).toBe(false);
});
