import type { Beat, Script, Receipt, Angle } from './types';

export function makeScript(title: string, receipts: Receipt[], id: string, hook?: string): Script {
  const questions = receipts.length;
  const likes = receipts.reduce((sum, receipt) => sum + receipt.likes, 0);
  const hooks: Record<Angle, string> = {
    Demo: hook ?? `Here’s the quickest way to test this: ${title.toLocaleLowerCase()}.`,
    Mistake: 'Check this one detail before you copy my setup.',
    'Price breakdown': 'Before you spend anything, here’s how I’d decide what is worth paying for.'
  };
  const bodies: Record<Angle, string> = {
    Demo: 'First, show [your exact setup]. Run [your quick test] and show one close-up of what changes. Here’s the result I got: [your actual result]. If you try it yourself, repeat the same test before you decide.',
    Mistake: 'Here’s what I see people miss: [specific mistake]. Show what happens when you do it that way. Now change [one thing you tested] and replay the same shot. Here’s what changed for me: [verified result].',
    'Price breakdown': 'This is [your exact option] and it cost me [actual price you paid]. Here’s what I used it for: [your use case]. Compare it to [alternative you have tested] and show which difference matters for your setup.'
  };
  const angles = Object.fromEntries((Object.keys(hooks) as Angle[]).map(angle => {
    const beats: Beat[] = [
      { time: '0–3s', label: 'Hook', text: hooks[angle] },
      { time: '3–29s', label: 'Show the test', text: bodies[angle] },
      { time: '29–40s', label: 'Shorts CTA', text: 'I put my test notes in the pinned comment. So if you’re wondering where to start, here’s what I’d check first…' }
    ];
    return [angle, beats];
  })) as Record<Angle, Beat[]>;
  return {
    id, title, questions, likes, score: questions * 10 + 2 * likes, receipts, angles,
    reelCta: 'Save this for your next test and send it to someone comparing setups.',
    reelCaption: `${title}\n\nMy setup: [your exact setup]\nMy result: [your actual result]\n\n#CreatorTips #Reels`,
    reply: 'Good question! I’m putting together a quick test on this. What setup are you using?'
  };
}
