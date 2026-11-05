import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthState = {
  error?: string;
  message?: string;
  needsVerification?: boolean;
  redirectTo?: string;
};
export type AuthClient = Pick<SupabaseClient, 'auth' | 'rpc'>;
export const authModes = ['signin', 'signup', 'reset', 'update', 'resend'] as const;
export type AuthMode = (typeof authModes)[number];
const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.'));
const newPassword = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Use at most 128 characters.');
const passwordPair = { password: newPassword, confirm_password: z.string() };
export const authInput = z
  .discriminatedUnion('mode', [
    z.object({
      mode: z.literal('signin'),
      email,
      password: z.string().min(1, 'Enter your password.').max(128),
    }),
    z.object({
      mode: z.literal('signup'),
      email,
      display_name: z.string().trim().min(1, 'Enter your name.').max(80),
      ...passwordPair,
    }),
    z.object({ mode: z.literal('reset'), email }),
    z.object({ mode: z.literal('resend'), email }),
    z.object({ mode: z.literal('update'), ...passwordPair }),
  ])
  .superRefine((data, ctx) => {
    if (
      (data.mode === 'signup' || data.mode === 'update') &&
      data.password !== data.confirm_password
    )
      ctx.addIssue({
        code: 'custom',
        path: ['confirm_password'],
        message: 'The passwords do not match.',
      });
  });

/** Restrict auth redirects to application pages; never accept an external origin. */
export function safeAuthNext(value: string | null | undefined, fallback = '/app/overview') {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020]|%2f|%5c/i.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, 'https://fairshare.invalid');
    if (url.origin !== 'https://fairshare.invalid') return fallback;
    if (url.pathname === '/onboarding') return url.pathname + url.search;
    if (url.pathname === '/login' && url.searchParams.get('mode') === 'update')
      return '/login?mode=update';
    if (
      /^\/app(?:\/(?:overview|expenses|balances|bills|rent|vehicles|cleaning|notifications|settings))?$/.test(
        url.pathname,
      )
    )
      return url.pathname + url.search;
  } catch {}
  return fallback;
}
/** Custom email templates can retain the original callback's invitation safely. */
export function emailConfirmationNext(
  redirectTo: string | null,
  origin: string,
  next?: string | null,
) {
  if (next) return safeAuthNext(next);
  if (redirectTo) {
    try {
      const callback = new URL(redirectTo);
      if (callback.origin === new URL(origin).origin && callback.pathname === '/auth/callback')
        return safeAuthNext(callback.searchParams.get('next'));
    } catch {}
  }
  return '/app/overview';
}
export function authDestination(token?: string) {
  return token ? `/onboarding?token=${encodeURIComponent(token)}` : '/app/overview';
}
export function callbackUrl(origin: string, next: string) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', safeAuthNext(next));
  return url.toString();
}
export function configuredAuthOrigin(
  configuredOrigin: string | undefined,
  requestOrigin?: string | null,
) {
  // Use the actual local browser origin so localhost/127.0.0.1 don't lose PKCE cookies.
  if (process.env.NODE_ENV !== 'production' && requestOrigin) {
    try {
      const url = new URL(requestOrigin);
      if (
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
        ['http:', 'https:'].includes(url.protocol)
      )
        return url.origin;
    } catch {}
  }
  const url = new URL(configuredOrigin || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Invalid authentication site URL.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('Use HTTPS for your deployed authentication site URL.');
  return url.origin;
}
function providerError(code?: string) {
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit')
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (code === 'email_address_not_authorized')
    return 'Email delivery is not configured for this address. Ask the operator to configure Supabase Auth SMTP.';
  return 'Unable to complete that request right now. Please try again.';
}
export async function syncSignedInProfile(client: AuthClient): Promise<AuthState> {
  // A validated Auth user, not user metadata or a submitted ID, owns the profile.
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { error: 'Your session could not be verified. Please sign in again.' };
  if (!user.email_confirmed_at)
    return { error: 'Verify your email address before signing in.', needsVerification: true };
  const saved = await client.rpc('ensure_profile');
  if (saved.error)
    return {
      error:
        'You are signed in, but your account profile could not be loaded. Ask the operator to apply the user-profiles database migration.',
    };
  return {};
}
export async function runEmailAuth(
  client: AuthClient,
  fields: Record<string, unknown>,
  origin: string,
  token?: string,
): Promise<AuthState> {
  const parsed = authInput.safeParse(fields);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message || 'Check your account details.' };
  const input = parsed.data,
    next = authDestination(token);
  if (input.mode === 'signup') {
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.display_name },
        emailRedirectTo: callbackUrl(origin, next),
      },
    });
    if (error) return { error: providerError(error.code) };
    if (data.session) {
      const saved = await syncSignedInProfile(client);
      return saved.error ? saved : { redirectTo: next };
    }
    return {
      message:
        'Check your email to verify your account, then sign in. If you already have an account, sign in or reset your password.',
      needsVerification: true,
    };
  }
  if (input.mode === 'signin') {
    const { error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) {
      if (error.code === 'email_not_confirmed')
        return {
          error:
            'Verify your email before signing in. You can request a new verification link below.',
          needsVerification: true,
        };
      if (error.code === 'over_request_rate_limit') return { error: providerError(error.code) };
      return {
        error:
          'The email or password is incorrect, or the account is unavailable. Try again or reset your password.',
      };
    }
    const saved = await syncSignedInProfile(client);
    return saved.error ? saved : { redirectTo: next };
  }
  if (input.mode === 'reset') {
    const { error } = await client.auth.resetPasswordForEmail(input.email, {
      redirectTo: callbackUrl(origin, '/login?mode=update'),
    });
    return error
      ? { error: providerError(error.code) }
      : {
          message:
            'If an account exists for that address, a password reset link is on its way. Check your inbox and spam folder.',
        };
  }
  if (input.mode === 'resend') {
    const { error } = await client.auth.resend({
      type: 'signup',
      email: input.email,
      options: { emailRedirectTo: callbackUrl(origin, next) },
    });
    return error
      ? { error: providerError(error.code) }
      : {
          message:
            'If this account needs verification, a new link is on its way. Check your inbox and spam folder.',
        };
  }
  const {
    data: { user },
    error: sessionError,
  } = await client.auth.getUser();
  if (sessionError || !user)
    return { error: 'Open a valid password reset link before choosing a new password.' };
  const { error } = await client.auth.updateUser({ password: input.password });
  if (error)
    return {
      error:
        error.code === 'same_password'
          ? 'Choose a password different from your current password.'
          : providerError(error.code),
    };
  // A successful reset ends the recovery session; the new password is used to sign in.
  const signedOut = await client.auth.signOut({ scope: 'local' });
  if (signedOut.error)
    return {
      error: 'Your password was updated. Please sign out and sign in with the new password.',
    };
  return { redirectTo: '/login?notice=password-updated' };
}
