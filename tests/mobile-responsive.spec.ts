import { expect, test } from 'playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('mobile landing, multi-channel results, inputs >=16px, popover, and login back button', async ({ page }) => {
  await page.route('**/api/preview', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ maxTries: 2, usedTries: 0, remainingTries: 2 })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mobile-test-digest',
        createdAt: new Date().toISOString(),
        source: 'peers',
        niche: 'Indian Home Cooking',
        channel: {
          title: "Kabita's Kitchen",
          handle: '@KabitasKitchen',
          avatarUrl: null,
          subscriberCount: 14200000
        },
        channels: [
          { title: "Kabita's Kitchen", handle: '@KabitasKitchen', avatarUrl: null, subscriberCount: 14200000 },
          { title: 'Chef Ranveer Brar', handle: '@RanveerBrar', avatarUrl: null, subscriberCount: 8100000 },
          { title: 'Hebbars Kitchen', handle: '@HebbarsKitchen', avatarUrl: null, subscriberCount: 9500000 }
        ],
        notes: ['Growth Mode Active: Scanned 3 channels (@KabitasKitchen, @RanveerBrar, @HebbarsKitchen) over the last 72h in your niche.'],
        scripts: [
          {
            id: 'script-1',
            title: 'Why paneer turns rubbery in gravy',
            coreQuestion: 'How do you keep paneer soft even after simmering in masala?',
            score: 120,
            questions: 8,
            likes: 20,
            receipts: [
              { id: 'c1', author: '@ananya_cooks', text: 'Why does my paneer turn chewy after 5 minutes?', likes: 14, url: 'https://youtube.com/watch?v=test1&lc=c1' },
              { id: 'c2', author: '@rohit_k', text: 'Should we soak fried paneer in warm salted water?', likes: 6, url: 'https://youtube.com/watch?v=test1&lc=c2' }
            ],
            angles: {
              Demo: [
                { time: '0–3s', label: 'Hook', text: 'Stop dropping raw paneer straight into boiling gravy.' },
                { time: '3–28s', label: 'Story & Answer', text: 'Soak it for 10 minutes in warm salted water right after pan-searing in 1 tbsp ghee so it stays cloud-soft.' },
                { time: '28–35s', label: 'Shorts CTA', text: 'Try this tonight and tell me if it stayed soft.' }
              ],
              Mistake: [
                { time: '0–3s', label: 'Hook', text: 'This one mistake ruins homemade paneer every time.' },
                { time: '3–28s', label: 'Story & Answer', text: 'Overcooking on high heat squeezes moisture out.' },
                { time: '28–35s', label: 'Shorts CTA', text: 'Save this before your next dinner.' }
              ],
              'Price breakdown': [
                { time: '0–3s', label: 'Hook', text: 'Homemade paneer vs ₹110 store pack—here is the texture test.' },
                { time: '3–28s', label: 'Story & Answer', text: 'Fresh milk paneer costs ₹75 and stays twice as soft.' },
                { time: '28–35s', label: 'Shorts CTA', text: 'Comment if you want the 5-minute recipe.' }
              ]
            },
            reelCta: 'Save this for your next paneer night.',
            reelCaption: 'Soft paneer trick #shorts',
            reply: 'Soak pan-seared paneer in warm salted water for 10 minutes—stays super soft!',
            swappableChips: ['10 minutes', '1 tbsp ghee']
          }
        ],
        previewUsed: true,
        remainingTries: 1
      })
    });
  });

  // 1. Landing page mobile checks
  await page.goto('/');
  const searchInput = page.getByLabel('Search channel or topic');
  await expect(searchInput).toBeVisible();
  const searchFontSize = await searchInput.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(searchFontSize).toBeGreaterThanOrEqual(16);

  const landingOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(landingOverflow).toBe(true);

  // 2. Scan topic ("cooking") -> multi-channel results
  await searchInput.fill('cooking');
  await page.getByRole('button', { name: /scan/i }).click();

  const channelsTrigger = page.getByRole('button', { name: /Show all 3 scanned channels/i });
  await expect(channelsTrigger).toBeVisible();
  await expect(channelsTrigger).toContainText("Kabita's Kitchen, Chef Ranveer Brar, Hebbars Kitchen");

  // Ensure no horizontal overflow & no overlap between channel trigger and questions badge
  const resultsOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(resultsOverflow).toBe(true);

  const triggerBox = await channelsTrigger.boundingBox();
  const questionsBadge = page.getByText('8 questions', { exact: true }).first();
  const badgeBox = await questionsBadge.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(badgeBox).not.toBeNull();
  if (triggerBox && badgeBox) {
    const separatedVertically = badgeBox.y >= triggerBox.y + triggerBox.height - 1;
    const separatedHorizontally = badgeBox.x >= triggerBox.x + triggerBox.width - 1;
    expect(separatedVertically || separatedHorizontally).toBe(true);
  }

  // Click to open popover and verify all 3 channels appear
  await channelsTrigger.click();
  const popover = page.getByRole('dialog', { name: 'Scanned channels' });
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('@KabitasKitchen');
  await expect(popover).toContainText('@RanveerBrar');
  await expect(popover).toContainText('@HebbarsKitchen');
  await page.getByRole('button', { name: 'Close channels list' }).click();

  // Check swappable chip input >= 16px
  await page.getByRole('button', { name: '10 minutes' }).first().click();
  const chipInput = page.getByPlaceholder('Replace "10 minutes"…');
  await expect(chipInput).toBeVisible();
  const chipInputFontSize = await chipInput.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(chipInputFontSize).toBeGreaterThanOrEqual(16);

  // Check Evidence shows 1 comment by default + expand toggle
  await expect(page.getByText('@ananya_cooks', { exact: true })).toBeVisible();
  await expect(page.getByText('@rohit_k')).toHaveCount(0);
  await page.getByRole('button', { name: '+1 more' }).click();
  await expect(page.getByText('@rohit_k')).toBeVisible();

  // Check Quick reply textarea >= 16px
  await page.getByText('Quick reply & caption').click();
  const replyBox = page.getByLabel('Editable quick reply');
  await expect(replyBox).toBeVisible();
  const replyFontSize = await replyBox.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(replyFontSize).toBeGreaterThanOrEqual(16);

  // 3. Login page mobile checks
  await page.goto('/login');
  await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();
  const emailInput = page.getByLabel('Email');
  const emailFontSize = await emailInput.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(emailFontSize).toBeGreaterThanOrEqual(16);
  const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(loginOverflow).toBe(true);
});
