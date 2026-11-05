import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  runEmailAuth,
  syncSignedInProfile,
  safeAuthNext,
  authDestination,
  callbackUrl,
  emailConfirmationNext,
  configuredAuthOrigin,
  type AuthClient,
} from '../lib/auth-flow';
const password = 'a unique Fairshare test password';
const verified = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'alex@example.test',
  email_confirmed_at: '2026-11-06T00:00:00Z',
};
function fakeClient() {
  const auth = {
    signInWithPassword: vi
      .fn()
      .mockResolvedValue({ data: { user: verified, session: {} }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: verified, session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: verified }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    resend: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  const rpc = vi.fn().mockResolvedValue({ data: { id: verified.id }, error: null });
  return { auth, rpc, client: { auth, rpc } as unknown as AuthClient };
}
afterEach(() => vi.unstubAllEnvs());
describe('email authentication and persisted profiles', () => {
  it('signs in with a canonical email and syncs only a server-verified user', async () => {
    const c = fakeClient();
    const result = await runEmailAuth(
      c.client,
      { mode: 'signin', email: ' Alex@EXAMPLE.test ', password },
      'http://localhost:3000',
    );
    expect(c.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'alex@example.test',
      password,
    });
    expect(c.auth.getUser).toHaveBeenCalled();
    expect(c.rpc).toHaveBeenCalledWith('ensure_profile');
    expect(result).toEqual({ redirectTo: '/app/overview' });
  });
  it('allows existing accounts to sign in without imposing a new password policy', async () => {
    const c = fakeClient();
    expect(
      (
        await runEmailAuth(
          c.client,
          { mode: 'signin', email: 'alex@example.test', password: 'oldpass' },
          'http://localhost:3000',
        )
      ).redirectTo,
    ).toBe('/app/overview');
  });
  it('requires signup password confirmation before contacting Auth', async () => {
    const c = fakeClient();
    const result = await runEmailAuth(
      c.client,
      {
        mode: 'signup',
        display_name: 'Alex',
        email: 'alex@example.test',
        password,
        confirm_password: 'different',
      },
      'http://localhost:3000',
    );
    expect(result.error).toContain('do not match');
    expect(c.auth.signUp).not.toHaveBeenCalled();
  });
  it('registers a chosen email and name but does not claim login before verification', async () => {
    const c = fakeClient();
    const result = await runEmailAuth(
      c.client,
      {
        mode: 'signup',
        display_name: ' Alex ',
        email: 'alex@example.test',
        password,
        confirm_password: password,
      },
      'http://localhost:3000',
      'private-token',
    );
    expect(c.auth.signUp).toHaveBeenCalledWith({
      email: 'alex@example.test',
      password,
      options: {
        data: { display_name: 'Alex' },
        emailRedirectTo: callbackUrl('http://localhost:3000', '/onboarding?token=private-token'),
      },
    });
    expect(result.needsVerification).toBe(true);
    expect(result.redirectTo).toBeUndefined();
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it('persists the profile before redirecting when Auth returns a signup session', async () => {
    const c = fakeClient();
    c.auth.signUp.mockResolvedValue({ data: { user: verified, session: {} }, error: null });
    expect(
      (
        await runEmailAuth(
          c.client,
          {
            mode: 'signup',
            display_name: 'Alex',
            email: 'alex@example.test',
            password,
            confirm_password: password,
          },
          'http://localhost:3000',
        )
      ).redirectTo,
    ).toBe('/app/overview');
    expect(c.rpc).toHaveBeenCalledWith('ensure_profile');
  });
  it('keeps invalid-credential errors generic and never creates a profile on failure', async () => {
    const c = fakeClient();
    c.auth.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'sensitive internal failure' },
    });
    const result = await runEmailAuth(
      c.client,
      { mode: 'signin', email: 'alex@example.test', password },
      'http://localhost:3000',
    );
    expect(result.error).toContain('email or password');
    expect(result.error).not.toContain('sensitive');
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it('does not trust a sign-in response when server user verification fails', async () => {
    const c = fakeClient();
    c.auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'invalid_jwt' } });
    const result = await runEmailAuth(
      c.client,
      { mode: 'signin', email: 'alex@example.test', password },
      'http://localhost:3000',
    );
    expect(result.redirectTo).toBeUndefined();
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it('stops unverified sessions and offers resend verification', async () => {
    const c = fakeClient();
    c.auth.getUser.mockResolvedValue({
      data: { user: { ...verified, email_confirmed_at: null } },
      error: null,
    });
    expect((await syncSignedInProfile(c.client)).needsVerification).toBe(true);
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it('reports profile storage failure instead of redirecting to a falsely saved account', async () => {
    const c = fakeClient();
    c.rpc.mockResolvedValue({ error: { code: 'PGRST202' } });
    const result = await runEmailAuth(
      c.client,
      { mode: 'signin', email: 'alex@example.test', password },
      'http://localhost:3000',
    );
    expect(result.error).toContain('migration');
    expect(result.redirectTo).toBeUndefined();
  });
  it('requests a password reset without disclosing whether an account exists', async () => {
    const c = fakeClient();
    const result = await runEmailAuth(
      c.client,
      { mode: 'reset', email: 'alex@example.test' },
      'http://localhost:3000',
    );
    expect(result.message).toContain('If an account exists');
    expect(c.auth.resetPasswordForEmail).toHaveBeenCalledWith('alex@example.test', {
      redirectTo: callbackUrl('http://localhost:3000', '/login?mode=update'),
    });
  });
  it('resends a confirmation while preserving the intended household invitation', async () => {
    const c = fakeClient();
    const result = await runEmailAuth(
      c.client,
      { mode: 'resend', email: 'alex@example.test' },
      'http://localhost:3000',
      'invite',
    );
    expect(result.message).toContain('If this account');
    expect(c.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'alex@example.test',
      options: {
        emailRedirectTo: callbackUrl('http://localhost:3000', '/onboarding?token=invite'),
      },
    });
  });
  it('requires a validated session to update a password', async () => {
    const c = fakeClient();
    c.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await runEmailAuth(
      c.client,
      { mode: 'update', password, confirm_password: password },
      'http://localhost:3000',
    );
    expect(result.error).toContain('reset link');
    expect(c.auth.updateUser).not.toHaveBeenCalled();
  });
  it('updates a confirmed password and ends the recovery session before returning to sign-in', async () => {
    const c = fakeClient();
    const result = await runEmailAuth(
      c.client,
      { mode: 'update', password, confirm_password: password },
      'http://localhost:3000',
    );
    expect(c.auth.updateUser).toHaveBeenCalledWith({ password });
    expect(c.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(result.redirectTo).toBe('/login?notice=password-updated');
  });
  it('rejects invalid email, missing passwords and unknown auth actions', async () => {
    for (const fields of [
      { mode: 'signin', email: 'bad', password },
      { mode: 'signin', email: 'alex@example.test', password: '' },
      { mode: 'admin', email: 'alex@example.test', password },
    ]) {
      const c = fakeClient();
      expect((await runEmailAuth(c.client, fields, 'http://localhost:3000')).error).toBeTruthy();
      expect(c.auth.signInWithPassword).not.toHaveBeenCalled();
    }
  });
});
describe('authentication navigation', () => {
  it('rejects external, encoded and malformed redirect destinations', () => {
    for (const path of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/%2f%2fevil.example',
      '/app/overview\n',
      '/api/cron',
      '/login?mode=signup',
    ])
      expect(safeAuthNext(path)).toBe('/app/overview');
  });
  it('retains only approved app/onboarding/recovery routes', () => {
    expect(safeAuthNext('/app/expenses')).toBe('/app/expenses');
    expect(safeAuthNext('/onboarding?token=x')).toBe('/onboarding?token=x');
    expect(safeAuthNext('/login?mode=update')).toBe('/login?mode=update');
    expect(authDestination('a&b')).toBe('/onboarding?token=a%26b');
  });
  it('keeps local callback cookies on the browser’s actual loopback origin', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(configuredAuthOrigin('http://localhost:3000', 'http://127.0.0.1:3000')).toBe(
      'http://127.0.0.1:3000',
    );
    expect(configuredAuthOrigin('http://localhost:3000', 'https://untrusted.example')).toBe(
      'http://localhost:3000',
    );
  });
  it('uses the configured HTTPS origin in production regardless of a submitted origin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(configuredAuthOrigin('https://fairshare.example', 'https://evil.example')).toBe(
      'https://fairshare.example',
    );
    expect(() => configuredAuthOrigin('http://fairshare.example')).toThrow();
  });
});

it('preserves invitation callbacks in custom emails while rejecting external redirect URLs', () => {
  expect(
    emailConfirmationNext(
      'https://fairshare.example/auth/callback?next=%2Fonboarding%3Ftoken%3Dabc',
      'https://fairshare.example',
    ),
  ).toBe('/onboarding?token=abc');
  expect(
    emailConfirmationNext(
      'https://evil.example/auth/callback?next=/app/balances',
      'https://fairshare.example',
    ),
  ).toBe('/app/overview');
  expect(emailConfirmationNext(null, 'https://fairshare.example', '//evil.example')).toBe(
    '/app/overview',
  );
});
