import { NextRequest, NextResponse } from 'next/server';

const accessCookie = 'clipspill-access';
const refreshCookie = 'clipspill-refresh';
type Session = { access_token: string; refresh_token: string; expires_in?: number };
type User = { id: string; email?: string };
type Credentials = { url: string; key: string };

function credentials(): Credentials | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

export function isSupabaseConfigured() { return Boolean(credentials()); }

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return origin === new URL(process.env.SITE_URL ?? request.url).origin || origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function supabase(path: string, options: RequestInit = {}, accessToken?: string) {
  const config = credentials();
  if (!config) throw new Error('Supabase is not configured.');
  const headers = new Headers(options.headers);
  headers.set('apikey', config.key);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', 'Bearer ' + accessToken);
  return fetch(config.url + path, { ...options, headers, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
}

const cookieOptions = (request: NextRequest) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: (process.env.SITE_URL ?? request.url).startsWith('https:'),
  path: '/'
});

export function setSession(response: NextResponse, request: NextRequest, session: Session) {
  const options = cookieOptions(request);
  response.cookies.set(accessCookie, session.access_token, { ...options, maxAge: session.expires_in ?? 3_600 });
  response.cookies.set(refreshCookie, session.refresh_token, { ...options, maxAge: 30 * 86_400 });
}

export function clearSession(response: NextResponse, request: NextRequest) {
  for (const cookie of [accessCookie, refreshCookie]) {
    response.cookies.set(cookie, '', { ...cookieOptions(request), maxAge: 0 });
  }
}

const pendingRefreshes = new Map<string, Promise<Session | null>>();

function refreshSession(refreshToken: string) {
  const existing = pendingRefreshes.get(refreshToken);
  if (existing) return existing;
  const task = supabase('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: JSON.stringify({ refresh_token: refreshToken })
  }).then(async response => response.ok ? await response.json() as Session : null);
  pendingRefreshes.set(refreshToken, task);
  // Concurrent requests may still carry the old cookie after the first request completes.
  const cleanup = () => setTimeout(() => pendingRefreshes.delete(refreshToken), 5_000).unref();
  void task.then(cleanup, cleanup);
  return task;
}

export async function currentUser(request: NextRequest): Promise<{ user: User; access: string; refreshed?: Session } | null> {
  let access = request.cookies.get(accessCookie)?.value;
  let refreshed: Session | undefined;
  let result = access ? await supabase('/auth/v1/user', {}, access) : null;
  if (result && result.status !== 401 && !result.ok) throw new Error('Could not verify session.');
  if (!result?.ok) {
    const token = request.cookies.get(refreshCookie)?.value;
    if (!token) return null;
    refreshed = await refreshSession(token) ?? undefined;
    if (!refreshed?.access_token) return null;
    access = refreshed.access_token;
    result = await supabase('/auth/v1/user', {}, access);
    if (!result.ok) throw new Error('Could not verify refreshed session.');
  }
  if (!access) return null;
  const user = await result.json() as User;
  return { user, access, refreshed };
}

export function authJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
