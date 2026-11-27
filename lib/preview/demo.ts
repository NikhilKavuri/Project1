import { niches } from '../niches';
import { makeScript } from './scripts';
import type { Digest, Receipt } from './types';

const prompts: Record<string, [string, string, string][]> = {
  moto: [
    ['Kill the helmet wind noise', 'Which budget mic works inside a helmet without wind noise?', 'Wind noise ruining your rides? Try this mic placement test.'],
    ['Mount your action cam safely', 'Bhai, which chin mount do you use on longer rides?', 'Here’s how I check a chin mount before my first ride with it.'],
    ['Show your real city mileage', 'What mileage do you actually get in city traffic?', 'Here’s how I measure mileage on my actual commute.']
  ],
  gaming: [
    ['Find your aim sensitivity', 'Which sensitivity do you use for Valorant?', 'Here’s the sensitivity test I run before I queue.'],
    ['Fix one bad peek habit', 'How do I stop overpeeking in ranked?', 'Try this before you swing the next corner.'],
    ['Build a quick warm-up', 'What warm-up should I do before ranked?', 'Here’s a short warm-up you can test before your next match.']
  ],
  tech: [
    ['Explain one AI workflow', 'Which AI workflow actually saves time while coding?', 'Here’s the part of my coding workflow I would automate first.'],
    ['Compare two laptop setups', 'Which laptop specs matter for frontend work?', 'Here’s what I check on a laptop before using it for frontend development.'],
    ['Demo a React debugging trick', 'How do you track down an unnecessary re-render in React?', 'Here’s the first thing I inspect when React re-renders too often.']
  ],
  fitness: [
    ['Show your workout setup', 'How do you set up a cable lateral raise?', 'Here’s how I set up the cable before the first rep.'],
    ['Build a practical gym meal', 'What do you eat before your workout?', 'Here’s how I put together a meal that fits my training day.'],
    ['Track a lift week to week', 'How do you know when to increase the weight?', 'Here’s the record I check before changing my training weight.']
  ],
  finance: [
    ['Explain an investing fee', 'How do I compare the fees on two funds?', 'Here’s where I look when comparing the cost of two funds.'],
    ['Walk through a monthly budget', 'Which expenses do you include in a real monthly budget?', 'Here’s the budget line I almost always forget.'],
    ['Show an emergency fund worksheet', 'How do you estimate your monthly essentials?', 'Here’s how I list essentials before setting a savings goal.']
  ]
};

export function demoDigest(nicheId = 'moto', createdAt = '2026-11-27T00:00:00Z'): Digest {
  const niche = niches.find(item => item.id === nicheId) ?? niches[0];
  const entries = prompts[niche.id] ?? niche.keywords.slice(0, 3).map(term => [
    `A practical guide to ${term}`, `Can you show a beginner-friendly example of ${term}?`, `Here’s my starting point for ${term}.`
  ]);
  return {
    id: 'demo-' + niche.id,
    createdAt,
    source: 'demo',
    niche: niche.label,
    notes: ['Sample comments and scores for exploring the workflow.'],
    scripts: entries.map(([title, question, hook], index) => {
      const receipts: Receipt[] = [
        { id: 'example-' + index + '-a', author: '@sample_viewer', text: question, likes: 9 - index * 2, url: null },
        { id: 'example-' + index + '-b', author: '@sample_regular', text: 'Could you show this with your own setup?', likes: 4 - index, url: null }
      ];
      return makeScript(title, receipts, niche.id + '-' + index, hook);
    })
  };
}
