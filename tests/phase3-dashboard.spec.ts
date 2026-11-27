import { expect, test } from 'playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/test-engine', { data: { action: 'reset' } });
});

test('dashboard persists schedule, runs competitor spy delta sync, and switches script angles live', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/dashboard');

  // Change cadence to Weekly then back to 48h at 09:00 IST using Magic UI pill selectors, save, reload, and verify persistence
  await page.getByRole('button', { name: 'Weekly (7d)' }).click();
  await page.getByRole('button', { name: /Save schedule/i }).click();
  await expect(page.getByText('Schedule saved.')).toBeVisible();

  await page.getByRole('button', { name: 'Every 2 Days (48h)' }).click();
  await page.getByRole('button', { name: '09:00 IST' }).click();
  await page.getByLabel('Competitor handles').fill('@JSFilmsIndia, @BikerNiladri');
  await page.getByRole('button', { name: /Save schedule/i }).click();
  await expect(page.getByText('Schedule saved.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Every 2 Days (48h)' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '09:00 IST' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Competitor handles')).toHaveValue('@JSFilmsIndia, @BikerNiladri');

  // Trigger Competitor Spy delta sync
  await page.getByRole('button', { name: /Sync Competitor Spy/i }).click();
  await expect(page.getByRole('link', { name: /Direct Comment-Hijack Link/i }).first()).toBeVisible();

  // Switch to Scripts & Digests tab and test Angle Switcher without reload
  await page.getByRole('button', { name: /Scripts & Digests/i }).click();
  const mistakeBtn = page.getByRole('button', { name: 'Mistake', exact: true }).first();
  await mistakeBtn.click();
  await expect(page.getByText(/Check this one detail before you copy my setup/i).first()).toBeVisible();

  const priceBtn = page.getByRole('button', { name: 'Price breakdown', exact: true }).first();
  await priceBtn.click();
  await expect(page.getByText(/Before you spend anything/i).first()).toBeVisible();

  // Quick-Reply Cheat Sheet tab
  await page.getByRole('button', { name: /Quick-Reply Cheat Sheet/i }).click();
  await expect(page.getByRole('link', { name: /Reply on YouTube/i }).first()).toBeVisible();

  expect(errors).toEqual([]);
});
