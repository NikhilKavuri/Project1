import { demoDigest } from '@/lib/preview/demo';
import { generateDigest, inspectChannel, ScanError, takeScanSlot } from '@/lib/preview/live';
import { normalizeHandle } from '@/lib/youtube/normalizeHandle';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return Response.json({ error: 'Enter a channel or choose a niche.' }, { status: 400 });
    const nicheId = typeof body.nicheId === 'string' ? body.nicheId : '';
    if (body.action === 'demo') return Response.json(demoDigest(nicheId, new Date().toISOString()));
    if (!['inspect', 'generate'].includes(body.action)) return Response.json({ error: 'Choose a scan action.' }, { status: 400 });
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const peers: string[] = Array.isArray(body.peers) ? body.peers.filter((value: unknown): value is string => typeof value === 'string').slice(0, 5) : [];
    if ((reference && !normalizeHandle(reference)) || (body.action === 'inspect' && !reference) || peers.some(peer => !normalizeHandle(peer))) {
      return Response.json({ error: 'Enter a valid YouTube handle, channel ID, or video URL.' }, { status: 400 });
    }
    takeScanSlot();
    if (body.action === 'inspect') return Response.json(await inspectChannel(reference));
    const uniquePeers = [...new Map(peers.map(peer => [normalizeHandle(peer)?.value.toLowerCase(), peer])).values()];
    return Response.json(await generateDigest({ reference, nicheId, peers: uniquePeers }));
  } catch (error) {
    if (error instanceof ScanError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'The scan could not finish. Try again shortly.' }, { status: 502 });
  }
}
