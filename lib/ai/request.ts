import { providerConnectionError, ScanError } from '../preview/scanError';

async function attemptFetch(url: string, options: RequestInit): Promise<Response> {
  return fetch(url, options).catch((error: unknown) => {
    throw providerConnectionError('AI service', error);
  });
}

export async function fetchGeminiJson(url: string, options: RequestInit): Promise<unknown> {
  let response = await attemptFetch(url, options);
  if (response.status >= 500 && response.status < 600) {
    await new Promise(resolve => setTimeout(resolve, 500));
    response = await attemptFetch(url, options);
  }
  if (response.status === 429) {
    throw new ScanError('The scan service reached its rate limit. Try again in a minute.', 429);
  }
  if (response.status === 404) {
    throw new ScanError('The configured AI model is unavailable. Check GEMINI_MODEL and project access.', 502);
  }
  if ([400, 401, 403].includes(response.status)) {
    throw new ScanError('The scan request was rejected. Check your API key and project configuration.', 502);
  }
  if (!response.ok) {
    throw new ScanError(`Could not complete the scan right now (${response.status}). Try again shortly.`, 502);
  }
  try {
    const payload = await response.json();
    const parts = payload.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.filter(part => part?.thought !== true && typeof part?.text === 'string').map(part => part.text).join('')
      : '';
    return JSON.parse(text);
  } catch {
    throw new ScanError('Received an incomplete scan response. Try the scan again.', 502);
  }
}
