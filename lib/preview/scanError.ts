export class ScanError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function providerConnectionError(provider: 'YouTube' | 'Gemini', error: unknown): ScanError {
  const cause = error instanceof Error ? error.cause as { code?: string } | undefined : undefined;
  if (cause?.code === 'ENOTFOUND' || cause?.code === 'EAI_AGAIN') {
    return new ScanError(`The ClipSpill server cannot resolve the ${provider} API hostname. Check the server’s DNS and outbound internet access.`, 503);
  }
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new ScanError(`${provider} took too long to respond. Try scanning again shortly.`, 504);
  }
  return new ScanError(`The ClipSpill server could not reach the ${provider} API. Try again shortly.`, 502);
}
