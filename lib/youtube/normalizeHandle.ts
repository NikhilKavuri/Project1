export type YouTubeReference = { kind: 'handle' | 'channelId' | 'videoId'; value: string };

const channelId = /^UC[A-Za-z0-9_-]{22}$/;
const videoId = /^[A-Za-z0-9_-]{11}$/;
const handle = /^[\p{L}\p{M}\p{N}_.·-]{3,30}$/u;
const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const shortHosts = new Set(['youtu.be', 'www.youtu.be']);

function asHandle(input: string): YouTubeReference | null {
  const value = input.replace(/^@/, '').normalize('NFC');
  return handle.test(value) ? { kind: 'handle', value: '@' + value } : null;
}

export function normalizeHandle(input: string): YouTubeReference | null {
  const value = input.trim();
  if (channelId.test(value)) return { kind: 'channelId', value };
  if (!value.includes('/') && !value.includes(':')) return asHandle(value);
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
    if (!['http:', 'https:'].includes(url.protocol) || url.port || url.username || url.password) return null;
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (shortHosts.has(url.hostname)) {
      return parts.length === 1 && videoId.test(parts[0]) ? { kind: 'videoId', value: parts[0] } : null;
    }
    if (!youtubeHosts.has(url.hostname)) return null;
    if (parts[0]?.startsWith('@')) return asHandle(parts[0]);
    if (parts[0] === 'channel' && channelId.test(parts[1] ?? '')) return { kind: 'channelId', value: parts[1] };
    const id = parts[0] === 'watch' ? url.searchParams.get('v') : ['shorts', 'live'].includes(parts[0]) ? parts[1] : null;
    return id && videoId.test(id) ? { kind: 'videoId', value: id } : null;
  } catch {
    return null;
  }
}
