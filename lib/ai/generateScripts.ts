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
                text: 'You are a sharp short-form video scriptwriter for YouTube Shorts and Instagram Reels. For the topic and its real viewer questions, write a clear, engaging 35-second vertical video script across 3 angles (Demo, Mistake, Price breakdown) that directly answers the viewer questions with a real story/talking points. Also write `reply` as a warm, direct 1-2 sentence YouTube comment reply specifically addressing the first viewer question (`viewer_questions[0]`), and `reel_caption` tailored to the topic. NEVER invent personal product models, prices, or facts not present in the creator context—if a specific personal detail is needed, use an explicit [Insert your ...] placeholder. Keep hooks punchy (0-3s), bodies specific to the actual question (3-28s), and CTAs natural (28-35s).'
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
                  reply: { type: 'STRING' }
                },
                required: [
                  'core_question', 'demo_hook', 'demo_body', 'demo_cta',
                  'mistake_hook', 'mistake_body', 'mistake_cta',
                  'price_hook', 'price_body', 'price_cta',
                  'reel_cta', 'reel_caption', 'reply'
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

      return {
        ...base,
        coreQuestion: gen.core_question || base.coreQuestion,
        angles,
        reelCta: gen.reel_cta || base.reelCta,
        reelCaption: gen.reel_caption || base.reelCaption,
        reply: gen.reply || base.reply
      };
    } catch {
      return base;
    }
  }));
}
