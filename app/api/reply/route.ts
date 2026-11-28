import { NextResponse } from 'next/server';
import { fetchGeminiJson } from '@/lib/ai/request';

export async function POST(request: Request) {
  let body: { commentAuthor?: unknown; commentText?: unknown; topicTitle?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const commentText = typeof body.commentText === 'string' ? body.commentText.trim().slice(0, 600) : '';
  const commentAuthor = typeof body.commentAuthor === 'string' ? body.commentAuthor.trim().slice(0, 80) : '';
  const topicTitle = typeof body.topicTitle === 'string' ? body.topicTitle.trim().slice(0, 140) : '';

  if (!commentText) {
    return NextResponse.json({ error: 'commentText is required.' }, { status: 400 });
  }

  const fallbackReply = `Thanks for asking${commentAuthor ? ` ${commentAuthor}` : ''}! I'm putting together a dedicated Short answering your question${topicTitle ? ` on ${topicTitle.toLocaleLowerCase()}` : ''}—stay tuned!`;

  if (process.env.MOCK_YOUTUBE_API === 'true' || !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ reply: fallbackReply });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const key = process.env.GEMINI_API_KEY ?? '';

  try {
    const raw = await fetchGeminiJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(12_000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are helping a YouTube creator reply directly to a viewer comment. Write a warm, natural, specific 1-2 sentence reply addressing exactly what the viewer asked. Never invent personal facts, exam results, prices, or gear details—if a personal answer is needed, acknowledge their question warmly and either ask a natural follow-up or say you are covering it in an upcoming Short. Return JSON { "reply": "..." }.'
            }]
          },
          contents: [{
            parts: [{
              text: `Topic: ${topicTitle || 'Viewer question'}\nViewer (${commentAuthor || 'viewer'}): ${commentText}`
            }]
          }],
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: { reply: { type: 'STRING' } },
              required: ['reply']
            }
          }
        })
      }
    );

    const reply = raw && typeof raw === 'object' && 'reply' in raw && typeof raw.reply === 'string'
      ? raw.reply.trim()
      : '';
    return NextResponse.json({ reply: reply || fallbackReply });
  } catch {
    return NextResponse.json({ reply: fallbackReply });
  }
}
