import type { NextRequest } from 'next/server';
import { authJson, clearSession, currentUser, isSameOrigin, isSupabaseConfigured, setSession, supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return authJson({ configured: false, email: null });
  try {
    const account = await currentUser(request);
    const response = authJson({ configured: true, email: account?.user.email ?? null });
    if (account?.refreshed) setSession(response, request, account.refreshed);
    return response;
  } catch {
    return authJson({ error: 'The account service is unavailable.' }, 502);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return authJson({ error: 'Invalid request origin.' }, 403);
  if (!isSupabaseConfigured()) return authJson({ error: 'Connect Supabase to enable accounts.' }, 503);
  const body = await request.json().catch(() => null);
  if (!body) return authJson({ error: 'Enter an email and password.' }, 400);

  try {
    if (body.action === 'logout') {
      const session = await currentUser(request).catch(() => null);
      if (session) await supabase('/auth/v1/logout?scope=local', { method: 'POST' }, session.access).catch(() => null);
      const response = authJson({ configured: true, email: null });
      clearSession(response, request);
      return response;
    }

    if (body.action === 'google') {
      const base = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
      const origin = request.nextUrl.origin || process.env.SITE_URL || 'http://localhost:3000';
      const redirectTo = `${origin}/auth/callback`;
      const url = `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
      return authJson({ url });
    }

    if (body.action === 'oauth_session') {
      const accessToken = typeof body.access_token === 'string' ? body.access_token : '';
      const refreshToken = typeof body.refresh_token === 'string' ? body.refresh_token : '';
      const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3600;
      if (!accessToken || !refreshToken) return authJson({ error: 'Missing OAuth tokens.' }, 400);
      const userRes = await supabase('/auth/v1/user', {}, accessToken);
      if (!userRes.ok) return authJson({ error: 'Could not verify Google session.' }, 401);
      const user = await userRes.json() as { email?: string };
      const response = authJson({ configured: true, email: user.email ?? null });
      setSession(response, request, { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn });
      return response;
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const signup = body.action === 'signup';
    if ((!signup && body.action !== 'signin') || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) {
      return authJson({ error: 'Enter a valid email and a password with 8–128 characters.' }, 400);
    }
    const origin = request.nextUrl.origin || process.env.SITE_URL || 'http://localhost:3000';
    const redirect = `${origin}/dashboard`;
    const authPath = signup
      ? '/auth/v1/signup?' + new URLSearchParams({ redirect_to: redirect })
      : '/auth/v1/token?grant_type=password';
    const result = await supabase(authPath, { method: 'POST', body: JSON.stringify({ email, password }) });
    if (result.status === 429) return authJson({ error: 'Too many attempts. Try again later.' }, 429);
    if (!result.ok) {
      return authJson(
        { error: signup ? 'Could not create the account. Check your details or try signing in.' : 'Sign-in failed. Check your credentials and confirm your email.' },
        result.status >= 500 ? 502 : 400
      );
    }
    const session = await result.json();

    if (!session.access_token || !session.refresh_token) {
      return signup
        ? authJson({ configured: true, email: null, message: 'Check your email to confirm your account, then sign in.' })
        : authJson({ error: 'Your session could not be created.' }, 502);
    }
    const response = authJson({ configured: true, email: session.user?.email ?? email });
    setSession(response, request, session);
    return response;
  } catch {
    return authJson({ error: 'The account service is unavailable.' }, 502);
  }
}
