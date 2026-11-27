import type { NextRequest } from 'next/server';
import { authJson, currentUser, isSameOrigin, isSupabaseConfigured, setSession, supabase } from '@/lib/supabase';
import { parseProfile, defaultProfile } from '@/lib/creator-profile';

export async function GET(request: NextRequest) {
  return workspace(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return authJson({ error: 'Invalid request origin.' }, 403);
  return workspace(request);
}

async function workspace(request: NextRequest) {
  if (!isSupabaseConfigured()) return authJson({ error: 'Cloud sync is unavailable.' }, 503);
  try {
    const account = await currentUser(request);
    if (!account) return authJson({ error: 'Sign in to sync your workspace.' }, 401);
    const respond = (data: unknown, status = 200) => {
      const response = authJson(data, status);
      if (account.refreshed) setSession(response, request, account.refreshed);
      return response;
    };
    if (request.method === 'GET') {
      const [profile, digests] = await Promise.all([
        supabase('/rest/v1/creator_profiles?select=channel_handle,competitor_handles,cadence,delivery_time,delivery_day,delivery_channel&limit=1', {}, account.access),
        supabase('/rest/v1/creator_digests?select=digest&order=saved_at.desc&limit=20', {}, account.access)
      ]);
      if (!profile.ok || !digests.ok) return respond({ error: 'Cloud data is unavailable. Check that the SQL migration has been applied.' }, 502);
      const stored = (await profile.json())[0];
      const history = (await digests.json()).map((item: { digest: unknown }) => item.digest);
      return respond({ profile: stored ? { ...stored, delivery_time: stored.delivery_time.slice(0, 5) } : defaultProfile, digests: history });
    }
    const raw = await request.text();
    if (raw.length > 280_000) return respond({ error: 'This digest is too large to save.' }, 413);
    const body = JSON.parse(raw);
    let saved: Response;
    const headers = { Prefer: 'resolution=merge-duplicates,return=minimal' };
    if (body?.action === 'profile') {
      const profile = parseProfile(body.profile);
      if (!profile) return respond({ error: 'Check your handles and delivery preferences.' }, 400);
      saved = await supabase('/rest/v1/creator_profiles?on_conflict=user_id', {
        method: 'POST', headers, body: JSON.stringify({ ...profile, user_id: account.user.id, updated_at: new Date().toISOString() })
      }, account.access);
    } else if (body?.action === 'digest') {
      const digest = body.digest;
      if (!digest || typeof digest.id !== 'string' || !/^[a-z\d-]{1,100}$/i.test(digest.id) || !Array.isArray(digest.scripts) || !digest.scripts.length || digest.scripts.length > 3) {
        return respond({ error: 'This digest could not be saved.' }, 400);
      }
      saved = await supabase('/rest/v1/creator_digests?on_conflict=user_id,digest_id', {
        method: 'POST', headers, body: JSON.stringify({ user_id: account.user.id, digest_id: digest.id, digest, saved_at: new Date().toISOString() })
      }, account.access);
    } else {
      return respond({ error: 'Choose what to save.' }, 400);
    }
    return saved.ok ? respond({ saved: true }) : respond({ error: 'Supabase could not save your data.' }, 502);
  } catch (error) {
    return error instanceof SyntaxError ? authJson({ error: 'Invalid workspace data.' }, 400)
      : authJson({ error: 'The workspace service is unavailable.' }, 502);
  }
}
