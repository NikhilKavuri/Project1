import { fetchGeminiJson } from './request';
import { makeScript } from '../preview/scripts';
import type { Angle, Receipt, Script, TopShortDna } from '../preview/types';

export type ScriptTopicInput = {
  id: string;
  title: string;
  receipts: Receipt[];
  topShortDna?: TopShortDna;
};

type GeneratedScriptPayload = {
  index: number;
  core_question: string;
  demo_hook: string;
  demo_body: string;
  demo_cta: string;
  mistake_hook: string;
  mistake_body: string;
  mistake_cta: string;
  price_hook: string;
  price_body: string;
  price_cta: string;
  reel_cta: string;
  reel_caption: string;
  reply: string;
  swappable_chips: string[];
};

export async function generateScriptsWithGemini(
  topics: ScriptTopicInput[],
  creatorContext: string
): Promise<Script[]> {
  if (!topics.length) return [];

  if (process.env.MOCK_YOUTUBE_API === 'true' || !process.env.GEMINI_API_KEY) {
    return topics.map(t => makeScript(t.title, t.receipts, t.id, undefined, t.topShortDna));
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const key = process.env.GEMINI_API_KEY ?? '';

  return Promise.all(topics.map(async t => {
    const base = makeScript(t.title, t.receipts, t.id, undefined, t.topShortDna);
    const viewerQuestions = t.receipts.slice(0, 5).map(r => `${r.author}: ${r.text}`);

    try {
      const raw = await fetchGeminiJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(15_000),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: 'You are an elite short-form video strategist writing viral, high-retention 35-second YouTube Shorts and Instagram Reels scripts. Write in natural, punchy, spoken creator voice—NEVER corporate or robotic ("Curious about...", "Here is the quickest way...", "Let me break it down..."). Start 0-3s Hooks with a scroll-stopping pattern interrupt, bold opinion, or direct viewer callout tied to the exact comment. For 3-28s Story & Answer, write a COMPLETE, ready-to-shoot story with concrete, realistic details (e.g. an actual dish, price, neighborhood, or number) and visual pacing—NEVER use [Insert ...] brackets. Include `swappable_chips`: 2 to 4 short exact phrases (1-4 words each) that appear VERBATIM inside your script text (like a specific price, place, or item) so the creator can swap them to match their exact reality. Also write `reply` as a warm, direct 1-2 sentence YouTube reply addressing `viewer_questions[0]`, and `reel_caption`.'
              }]
            },
            contents: [{
              parts: [{
                text: `Creator context:\n${creatorContext || 'General creator'}\n\nTopic: ${t.title}\nViewer questions:\n${JSON.stringify(viewerQuestions)}`
              }]
            }],
            generationConfig: {
              thinkingConfig: { thinkingBudget: 0 },
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  core_question: { type: 'STRING' },
                  demo_hook: { type: 'STRING' },
                  demo_body: { type: 'STRING' },
                  demo_cta: { type: 'STRING' },
                  mistake_hook: { type: 'STRING' },
                  mistake_body: { type: 'STRING' },
                  mistake_cta: { type: 'STRING' },
                  price_hook: { type: 'STRING' },
                  price_body: { type: 'STRING' },
                  price_cta: { type: 'STRING' },
                  reel_cta: { type: 'STRING' },
                  reel_caption: { type: 'STRING' },
                  reply: { type: 'STRING' },
                  swappable_chips: { type: 'ARRAY', items: { type: 'STRING' } }
                },
                required: [
                  'core_question', 'demo_hook', 'demo_body', 'demo_cta',
                  'mistake_hook', 'mistake_body', 'mistake_cta',
                  'price_hook', 'price_body', 'price_cta',
                  'reel_cta', 'reel_caption', 'reply', 'swappable_chips'
                ]
              }
            }
          })
        }
      );

      const gen = raw as Partial<GeneratedScriptPayload> | null;
      if (!gen || !gen.demo_hook || !gen.demo_body) return base;

      const angles: Record<Angle, { time: string; label: string; text: string }[]> = {
        Demo: [
          { time: '0–3s', label: 'Hook', text: gen.demo_hook },
          { time: '3–28s', label: 'Story & Answer', text: gen.demo_body },
          { time: '28–35s', label: 'Shorts CTA', text: gen.demo_cta || base.angles.Demo[2].text }
        ],
        Mistake: [
          { time: '0–3s', label: 'Hook', text: gen.mistake_hook || base.angles.Mistake[0].text },
          { time: '3–28s', label: 'Story & Answer', text: gen.mistake_body || base.angles.Mistake[1].text },
          { time: '28–35s', label: 'Shorts CTA', text: gen.mistake_cta || base.angles.Mistake[2].text }
        ],
        'Price breakdown': [
          { time: '0–3s', label: 'Hook', text: gen.price_hook || base.angles['Price breakdown'][0].text },
          { time: '3–28s', label: 'Story & Answer', text: gen.price_body || base.angles['Price breakdown'][1].text },
          { time: '28–35s', label: 'Shorts CTA', text: gen.price_cta || base.angles['Price breakdown'][2].text }
        ]
      };

      const allText = Object.values(angles).flat().map(b => b.text).join('\n');
      const swappableChips = Array.isArray(gen.swappable_chips)
        ? [...new Set(gen.swappable_chips.map(c => c.trim()).filter(c => c.length >= 2 && c.length <= 50 && allText.includes(c)))].slice(0, 4)
        : [];

      return {
        ...base,
        coreQuestion: gen.core_question || base.coreQuestion,
        angles,
        reelCta: gen.reel_cta || base.reelCta,
        reelCaption: gen.reel_caption || base.reelCaption,
        reply: gen.reply || base.reply,
        swappableChips
      };
    } catch {
      return base;
    }
  }));
}
