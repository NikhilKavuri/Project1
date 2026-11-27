import { expect, test, type APIRequestContext } from 'playwright/test';

const references = [
  '  @NikhilKavuri ', 'NikhilKavuri', 'https://www.youtube.com/@NikhilKavuri/videos',
  'https://youtube.com/channel/UCabcdefghijklmnopqrstuv', 'https://youtu.be/dQw4w9WgXcQ?t=1',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://youtube.com.example.net/@NikhilKavuri'
];
const comments = ['bhai helmet link dede', 'anna mic edi vadutunnav', 'Which mic?', 'crypto profits https://example.com?', '🔥🔥', 'super bro'];

async function engine(request: APIRequestContext) {
  const response = await request.post('/api/test-engine', {
    data: { references, comments, groups: [{ topic_title: 'Helmet gear', matched_indices: [0, 0, 999, 1, 2] }] }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('home renders the ClipSpill shell with clean browser and API logs', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 500) errors.push(response.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Your next video.*is in the comments/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test('normalizes handles, channel IDs and video URLs, and rejects an unrelated host', async ({ request }) => {
  const { normalized } = await engine(request);
  expect(normalized).toEqual([
    ...Array.from({ length: 3 }, () => ({ kind: 'handle', value: '@NikhilKavuri' })),
    { kind: 'channelId', value: 'UCabcdefghijklmnopqrstuv' },
    { kind: 'videoId', value: 'dQw4w9WgXcQ' }, { kind: 'videoId', value: 'dQw4w9WgXcQ' }, null
  ]);
});

test('recognizes regional language questions and rejects spam and praise', async ({ request }) => {
  expect((await engine(request)).questions).toEqual([true, true, true, false, false, false]);
});

test('rejects unknown, repeated and non-question indices before calculating demand', async ({ request }) => {
  expect((await engine(request)).topic).toEqual({
    topicTitle: 'Helmet gear', matchedIndices: [0, 1], askCount: 2, totalLikes: 6, demandScore: 32
  });
});

test('detects a niche and enforces the two-user fallback cap during simultaneous claims', async ({ request }) => {
  const { niche, growth, assignmentCount } = await engine(request);
  expect(niche).toBe('moto');
  expect(growth.every((item: { active: boolean }) => item.active)).toBe(true);
  expect(growth.map((item: { topics: string[] }) => item.topics.length).sort()).toEqual([0, 1, 1]);
  expect(assignmentCount).toBe(2);
});
