import 'server-only';

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

export function emailConfigured() {
  return Boolean(emailConfig());
}

export async function sendEmail({
  to,
  subject,
  text,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}) {
  const config = emailConfig();
  if (!config) return 'unconfigured';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ from: config.from, to: [to], subject, text }),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) return 'accepted';
    if (response.status === 403) {
      const error: unknown = await response.json().catch(() => null);
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        /only send (?:testing emails|to your own email address)/i.test(error.message)
      ) {
        return 'test-recipient-restricted';
      }
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}
