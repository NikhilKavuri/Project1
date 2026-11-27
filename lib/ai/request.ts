import { providerConnectionError, ScanError } from '../preview/scanError';

export async function fetchGeminiJson(url: string, options: RequestInit): Promise<unknown> {
  const response = await fetch(url, options).catch((error: unknown) => {
    throw providerConnectionError('Gemini', error);
  });
  if (response.status === 429) {
    throw new ScanError('Gemini has reached its rate limit or quota. Try again later or check your Gemini project quota.', 429);
  }
  if (response.status === 404) {
    throw new ScanError('The configured Gemini model is unavailable to this project. Check GEMINI_MODEL and your project’s model access.', 502);
  }
  if ([400, 401, 403].includes(response.status)) {
    throw new ScanError('Gemini rejected the scan request. Check the Gemini API key and project configuration.', 502);
  }
  if (!response.ok) throw new ScanError('Gemini could not complete the scan. Try again shortly.', 502);
  try {
    const payload = await response.json();
    const parts = payload.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.filter(part => part?.thought !== true && typeof part?.text === 'string').map(part => part.text).join('')
      : '';
    return JSON.parse(text);
  } catch {
    throw new ScanError('Gemini returned an incomplete scan response. Try the scan again.', 502);
  }
}
