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

  const promptTopics = topics.map((t, index) => ({
    index,
    topic: t.title,
    viewer_questions: t.receipts.slice(0, 5).map(r => `${r.author}: ${r.text}`)
  }));

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const key = process.env.GEMINI_API_KEY ?? '';

  try {
    const raw = await fetchGeminiJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(25_000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are a sharp short-form video scriptwriter for YouTube Shorts and Instagram Reels. For each topic and its real viewer questions, write a clear, engaging 35-second vertical video script across 3 angles (Demo, Mistake, Price breakdown) that directly answers the viewer questions with a real story/talking points. NEVER invent personal product models, prices, or facts not present in the creator context—if a specific personal detail is needed, use an explicit [Insert your ...] placeholder. Keep hooks punchy (0-3s), bodies specific to the actual question (3-28s), and CTAs natural (28-35s).'
            }]
          },
          contents: [{
            parts: [{
              text: `Creator context:\n${creatorContext || 'General creator'}\n\nTopics & viewer questions:\n${JSON.stringify(promptTopics)}`
            }]
          }],
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  index: { type: 'INTEGER' },
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
                  'index', 'core_question', 'demo_hook', 'demo_body', 'demo_cta',
                  'mistake_hook', 'mistake_body', 'mistake_cta',
                  'price_hook', 'price_body', 'price_cta',
                  'reel_cta', 'reel_caption', 'reply'
                ]
              }
            }
          }
        })
      }
    );

    const byIndex = new Map<number, GeneratedScriptPayload>();
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item && Number.isInteger(item.index)) {
          byIndex.set(item.index, item as GeneratedScriptPayload);
        }
      }
    }

    return topics.map((t, index) => {
      const base = makeScript(t.title, t.receipts, t.id, undefined, t.topShortDna);
      const gen = byIndex.get(index);
      if (!gen) return base;

      const angles: Record<Angle, { time: string; label: string; text: string }[]> = {
        Demo: [
          { time: '0–3s', label: 'Hook', text: gen.demo_hook },
          { time: '3–28s', label: 'Story & Answer', text: gen.demo_body },
          { time: '28–35s', label: 'Shorts CTA', text: gen.demo_cta }
        ],
        Mistake: [
          { time: '0–3s', label: 'Hook', text: gen.mistake_hook },
          { time: '3–28s', label: 'Story & Answer', text: gen.mistake_body },
          { time: '28–35s', label: 'Shorts CTA', text: gen.mistake_cta }
        ],
        'Price breakdown': [
          { time: '0–3s', label: 'Hook', text: gen.price_hook },
          { time: '3–28s', label: 'Story & Answer', text: gen.price_body },
          { time: '28–35s', label: 'Shorts CTA', text: gen.price_cta }
        ]
      };

      return {
        ...base,
        coreQuestion: gen.core_question,
        angles,
        reelCta: gen.reel_cta || base.reelCta,
        reelCaption: gen.reel_caption || base.reelCaption,
        reply: gen.reply || base.reply
      };
    });
  } catch {
    return topics.map(t => makeScript(t.title, t.receipts, t.id, undefined, t.topShortDna));
  }
}
