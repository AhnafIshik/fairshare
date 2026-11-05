import { timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET,
    incoming = request.headers.get('authorization') || '';
  if (
    !secret ||
    Buffer.byteLength(incoming) !== Buffer.byteLength(`Bearer ${secret}`) ||
    !timingSafeEqual(Buffer.from(incoming), Buffer.from(`Bearer ${secret}`))
  )
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  try {
    const client = adminClient();
    const { data, error } = await client.rpc('process_schedules');
    if (error)
      return Response.json(
        { error: 'Reminder generation failed. Check scheduler configuration.' },
        { status: 500 },
      );
    let delivered = 0,
      failed = 0;
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      const claimed = await client.rpc('claim_emails');
      if (claimed.error) throw new Error('Outbox unavailable');
      for (const item of claimed.data || []) {
        try {
          const [
            {
              data: { user },
            },
            { data: notice },
            { data: pref },
          ] = await Promise.all([
            client.auth.admin.getUserById(item.user_id),
            client.from('notifications').select('*').eq('id', item.notification_id).single(),
            client
              .from('notification_preferences')
              .select('*')
              .eq('user_id', item.user_id)
              .maybeSingle(),
          ]);
          const { data: member } = notice
            ? await client
                .from('household_members')
                .select('user_id')
                .eq('household_id', notice.household_id)
                .eq('user_id', item.user_id)
                .is('left_at', null)
                .maybeSingle()
            : { data: null };
          if (!user?.email || !notice || !pref?.email_enabled || !member) {
            await client
              .from('email_outbox')
              .update({ status: 'skipped', lease_until: null })
              .eq('id', item.id);
            continue;
          }
          const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': `fairshare/${item.id}`,
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM,
              to: [user.email],
              subject: 'Your Fairshare household reminder',
              text: `${notice.message}\n\nOpen Fairshare: ${origin}${notice.href}\n\nChange email preferences in Fairshare settings.`,
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) throw new Error('Email delivery failed');
          const result = await client
            .from('email_outbox')
            .update({ status: 'sent', sent_at: new Date().toISOString(), lease_until: null })
            .eq('id', item.id);
          if (result.error) throw new Error('Outbox acknowledgement failed');
          delivered++;
        } catch {
          failed++;
          await client
            .from('email_outbox')
            .update({ status: 'failed', lease_until: null })
            .eq('id', item.id);
        }
      }
    }
    return Response.json({
      households: data,
      emailsDelivered: delivered,
      emailsFailed: failed,
      emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    });
  } catch {
    return Response.json(
      { error: 'Scheduler credentials or delivery configuration unavailable' },
      { status: 503 },
    );
  }
}
