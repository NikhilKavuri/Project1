import type { Angle, Beat, HookFramework, Receipt, Script, TopShortDna } from './types';

export function makeScript(
  title: string,
  receipts: Receipt[],
  id: string,
  hook?: string,
  topShortDna?: TopShortDna
): Script {
  const questions = receipts.length;
  const likes = receipts.reduce((sum, receipt) => sum + receipt.likes, 0);
  const topAsk = receipts[0]?.text ? receipts[0].text.slice(0, 90) : title;
  const hooks: Record<Angle, string> = {
    Demo: hook ?? `Everyone keeps asking about ${title.toLocaleLowerCase()}—so here is the real story behind it.`,
    Mistake: `Before you copy what you saw in my last clip on ${title.toLocaleLowerCase()}, watch this part closely.`,
    'Price breakdown': `Is ${title.toLocaleLowerCase()} actually worth it? Here is what nobody tells you upfront.`
  };
  const bodies: Record<Angle, string> = {
    Demo: `So ${receipts[0]?.author || 'a viewer'} asked: "${topAsk}". Start with a tight close-up of my main setup, then walk through the exact 10-second fix I actually use every day. The biggest difference showed up right after I switched to my current routine—and that's the exact detail most people miss.`,
    Mistake: `When I first tried this, I made the classic mistake on my first run and wondered why nothing changed. The moment I adjusted one small habit, the whole result flipped. Watch the side-by-side in the second half so you don't waste a week figuring it out.`,
    'Price breakdown': `People assume you need the expensive option, which usually runs around ₹2,500, but my everyday pick cost roughly ₹800 and handled 90% of the same work. I'll show where the extra spend actually matters—and where you can safely skip it.`
  };
  const angles = Object.fromEntries((Object.keys(hooks) as Angle[]).map(angle => {
    const beats: Beat[] = [
      { time: '0–3s', label: 'Hook', text: hooks[angle] },
      { time: '3–28s', label: 'Show the test', text: bodies[angle] },
      { time: '28–35s', label: 'Shorts CTA', text: 'I put my test notes in the pinned comment. So if you’re wondering where to start, here’s what I’d check first…' }
    ];
    return [angle, beats];
  })) as Record<Angle, Beat[]>;

  const framework: HookFramework = {
    hookType: 'Comment-Reply Sticker clash',
    bodyCuts: '3–28s rapid proof cuts (every 2.5s)',
    loopCta: '28–35s seamless loop CTA'
  };

  return {
    id,
    title,
    questions,
    likes,
    score: questions * 10 + 2 * likes,
    receipts,
    angles,
    reelCta: 'Save this and share it with someone who asked the same thing.',
    reelCaption: `${title}\n\nHere's the real story behind it.\n\n#Shorts #Reels`,
    reply: `Great question${receipts[0]?.author ? ` ${receipts[0].author}` : ''}! I'm putting together a Short covering ${title.toLocaleLowerCase()}—drop any follow-up details you want me to include.`,
    swappableChips: ['my main setup', '₹2,500', '₹800'],
    framework,
    topShortDna
  };
}
