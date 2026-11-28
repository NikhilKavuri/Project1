import { normalizeHandle } from '../youtube/normalizeHandle';
import type { Upload } from '../youtube/client';
import { fetchGeminiJson } from './request';
import { ScanError } from '../preview/scanError';

export type DiscoveryResult = {
  nicheLabel: string;
  peerHandles: string[];
};

const discoveryCache = new Map<string, { expires: number; result: DiscoveryResult }>();

export async function discoverNicheAndPeers({
  query,
  uploads = [],
  location
}: {
  query?: string;
  uploads?: Pick<Upload, 'title' | 'description'>[];
  location?: string;
}): Promise<DiscoveryResult> {
  const key = (process.env.GEMINI_API_KEY ?? '').trim();
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const cacheKey = (query?.trim().toLowerCase() || '') + '|' + (location?.trim().toLowerCase() || '') + '|' + uploads.map(u => u.title).join('|').slice(0, 160);
  const cached = discoveryCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.result;

  if (!key) {
    return { nicheLabel: query?.trim() || 'Creator Niche', peerHandles: [] };
  }

  const contextLines = [
    query ? `User search query: ${JSON.stringify(query.trim())}` : '',
    location ? `Creator location (prioritize creators from or relevant to this region): ${JSON.stringify(location.trim())}` : '',
    uploads.length
      ? `Recent uploads:\n${uploads.slice(0, 5).map(u => `- ${u.title} (${u.description.slice(0, 140)})`).join('\n')}`
      : ''
  ].filter(Boolean).join('\n\n');

  const parsed = await fetchGeminiJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: 'Identify the concise creator niche label (2-4 words) and 3 real, active YouTube creator @handles in that exact niche whose viewers ask frequent gear, setup, or how-to questions. Return JSON only.'
          }]
        },
        contents: [{ parts: [{ text: contextLines || 'General YouTube Shorts creators' }] }],
        generationConfig: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              nicheLabel: { type: 'STRING' },
              peerHandles: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['nicheLabel', 'peerHandles']
          }
        }
      })
    }
  ) as { nicheLabel?: string; peerHandles?: unknown[] } | null;
  if (typeof parsed?.nicheLabel !== 'string' || !Array.isArray(parsed.peerHandles)) {
    throw new ScanError('Gemini returned an incomplete creator discovery result. Try the scan again.', 502);
  }
  const nicheLabel = (parsed.nicheLabel ?? query ?? 'Creator Niche').trim().slice(0, 60);
  const peerHandles = [...new Set(
    parsed.peerHandles
      .filter((handle): handle is string => typeof handle === 'string')
      .map(normalizeHandle)
      .filter((ref): ref is { kind: 'handle'; value: string } => ref?.kind === 'handle')
      .map(ref => ref.value)
  )].slice(0, 5);

  const result = { nicheLabel, peerHandles };
  if (discoveryCache.size >= 64) discoveryCache.delete(discoveryCache.keys().next().value as string);
  discoveryCache.set(cacheKey, { result, expires: Date.now() + 300_000 });
  return result;
}
