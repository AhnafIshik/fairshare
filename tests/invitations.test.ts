import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  configured: () => true,
  supabase: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { email_confirmed_at: '2026-11-11T00:00:00Z' } } }),
    },
    rpc,
  }),
}));

import { mutate } from '../app/actions';

const token = 'a'.repeat(64);
const household = '00000000-0000-4000-8000-000000000001';
const recipient = 'housemate@example.test';
const link = `https://fairshare.example.test/onboarding?token=${token}`;

function invite(email = recipient) {
  const form = new FormData();
  form.set('intent', 'invite');
  form.set('household_id', household);
  form.set('email', email);
  return mutate({}, form);
}

describe('household invitation delivery', () => {
  const fetchEmail = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://fairshare.example.test');
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('EMAIL_FROM', 'Fairshare <mail@example.test>');
    vi.stubGlobal('fetch', fetchEmail);
    rpc.mockReset().mockResolvedValue({ data: token, error: null });
    fetchEmail.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('emails the generated link to the same address that can accept it', async () => {
    expect(await invite()).toEqual({
      url: link,
      message: `Invitation email queued for ${recipient}.`,
    });
    expect(rpc).toHaveBeenCalledWith('create_invitation', {
      h: household,
      email_address: recipient,
    });
    expect(fetchEmail).toHaveBeenCalledTimes(1);
    const [endpoint, request] = fetchEmail.mock.calls[0];
    expect(endpoint).toBe('https://api.resend.com/emails');
    expect(JSON.parse(String(request?.body))).toMatchObject({
      to: [recipient],
      text: expect.stringContaining(link),
    });
  });

  it('keeps the private link usable when email delivery fails', async () => {
    fetchEmail.mockResolvedValue(new Response(null, { status: 503 }));
    expect(await invite()).toMatchObject({
      url: link,
      error: expect.stringContaining('could not be confirmed'),
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('explains the Resend test sender restriction without exposing the account email', async () => {
    fetchEmail.mockResolvedValue(
      Response.json(
        {
          name: 'validation_error',
          message:
            'You can only send testing emails to your own email address (owner@example.test).',
        },
        { status: 403 },
      ),
    );
    const result = await invite();
    expect(result).toMatchObject({
      url: link,
      error: expect.stringContaining('Verify a sending domain to email this recipient'),
    });
    expect(result.error).not.toContain('owner@example.test');
  });

  it('keeps the link when the sender is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await invite()).toMatchObject({
      url: link,
      error: expect.stringContaining('Set up email delivery'),
    });
    expect(fetchEmail).not.toHaveBeenCalled();
  });

  it('creates a shareable link when no email address is entered', async () => {
    expect(await invite('')).toMatchObject({ url: link });
    expect(rpc).toHaveBeenCalledWith('create_invitation', { h: household, email_address: null });
    expect(fetchEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the database denies invitation creation', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Administrator required' },
    });
    expect(await invite()).toEqual({ error: 'Administrator required' });
    expect(fetchEmail).not.toHaveBeenCalled();
  });
});
