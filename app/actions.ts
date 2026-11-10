'use server';
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { configured, supabase } from '@/lib/supabase/server';
import { configuredAuthOrigin } from '@/lib/auth-flow';
import { sendEmail } from '@/lib/email';
import { cents } from '@/lib/money';
import {
  date,
  decimal,
  entrySchema,
  invitationToken,
  participants,
  text,
  uuid,
} from '@/lib/validation';
export type ActionState = { error?: string; message?: string; url?: string };
const invitationEmailErrors = {
  unconfigured: 'Invitation created. Set up email delivery or copy the link to share it.',
  'test-recipient-restricted':
    'Invitation created. The Resend test sender can only email the address on your Resend account. Verify a sending domain to email this recipient, or copy the link.',
  failed:
    'Invitation created. Email delivery could not be confirmed. You can copy the link to share it.',
};
const val = (f: FormData, k: string) => String(f.get(k) ?? '');
function safeError(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues
      .map((i) => i.message)
      .slice(0, 3)
      .join('. ');
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
export async function mutate(_: ActionState, form: FormData): Promise<ActionState> {
  let client;
  try {
    if (!configured())
      return {
        error: 'Connect your Supabase project first. The sample preview does not save records.',
      };
    client = await supabase();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return { error: 'Please sign in again.' };
    if (!user.email_confirmed_at) return { error: 'Verify your email address before continuing.' };
    const intent = val(form, 'intent');
    const h =
      intent === 'create_household' ||
      intent === 'join' ||
      intent === 'preferences' ||
      intent === 'read' ||
      intent === 'profile'
        ? null
        : uuid.parse(form.get('household_id'));
    let result;
    let message = 'Saved successfully.';
    if (intent === 'create_household') {
      const d = {
        name: text(80).parse(form.get('name')),
        display_name: text(80).parse(form.get('display_name')),
        description: val(form, 'description').slice(0, 2000),
        timezone: text(80).parse(form.get('timezone') || 'Australia/Sydney'),
      };
      result = await client.rpc('create_household', { d });
      if (!result.error) {
        (await cookies()).set('fairshare-household', result.data, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        });
      }
    } else if (intent === 'join') {
      result = await client.rpc('accept_invitation', {
        token: invitationToken.parse(form.get('token')),
        member_name: text(80).parse(form.get('display_name')),
      });
      if (!result.error)
        (await cookies()).set('fairshare-household', result.data, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
        });
    } else if (intent === 'invite') {
      const email = val(form, 'email').trim();
      const link = new URL('/onboarding', configuredAuthOrigin(process.env.NEXT_PUBLIC_SITE_URL));
      result = await client.rpc('create_invitation', {
        h,
        email_address: email ? z.email().parse(email) : null,
      });
      if (!result.error) {
        link.searchParams.set('token', result.data);
        const url = link.toString();
        if (!email)
          return { url, message: 'Invitation created. Copy the private link to share it.' };

        const tokenHash = createHash('sha256').update(result.data).digest('hex');
        const delivery = await sendEmail({
          to: email,
          subject: 'You’re invited to join a Fairshare household',
          text: `You’ve been invited to join a household on Fairshare.\n\nOpen your private invitation:\n${url}\n\nSign in or create an account using this email address, then accept the invitation. The link can be used once and expires in seven days.`,
          idempotencyKey: `fairshare/invitation/${tokenHash}`,
        });
        if (delivery === 'accepted')
          return { url, message: `Invitation email queued for ${email}.` };
        return { url, error: invitationEmailErrors[delivery] };
      }
    } else if (intent === 'entry' || intent === 'replace') {
      const d = entrySchema.parse(Object.fromEntries(form));
      let metadata: Record<string, string | number> = {};
      if (d.kind === 'trip')
        metadata = {
          vehicle_id: uuid.parse(form.get('vehicle_id')),
          driver: uuid.parse(form.get('driver')),
          distance: decimal.parse(form.get('distance')),
          price: decimal.parse(form.get('price')),
          tolls_cents: cents(val(form, 'tolls') || '0'),
          parking_cents: cents(val(form, 'parking') || '0'),
          ...(val(form, 'fuel_price_id')
            ? { fuel_price_id: uuid.parse(form.get('fuel_price_id')) }
            : {}),
        };
      if (d.kind === 'bill')
        metadata = {
          provider: text(100).parse(form.get('provider')),
          reminder_days: z.coerce
            .number()
            .int()
            .min(0)
            .max(30)
            .parse(form.get('reminder_days') || 1),
          ...(val(form, 'period_start')
            ? {
                period_start: date.parse(form.get('period_start')),
                period_end: date.parse(form.get('period_end')),
              }
            : {}),
        };
      result = await client.rpc(intent === 'replace' ? 'replace_entry' : 'record_entry', {
        ...(intent === 'replace' ? { eid: uuid.parse(form.get('expense_id')) } : { h }),
        d: {
          ...d,
          amount_cents: d.kind === 'trip' ? 1 : cents(val(form, 'amount')),
          participants: participants(form),
          metadata,
          ...(d.kind === 'bill' ? { due_on: date.parse(form.get('due_on')) } : {}),
        },
      });
      message = 'Recorded. The selected beneficiaries’ shares were calculated by the database.';
    } else if (intent === 'adjustment') {
      result = await client.rpc('record_adjustment', {
        h,
        d: {
          expense_id: uuid.parse(form.get('expense_id')),
          creditor: uuid.parse(form.get('creditor')),
          debtor: uuid.parse(form.get('debtor')),
          amount_cents: cents(val(form, 'amount')),
          occurred_on: date.parse(form.get('occurred_on')),
          reason: text(150).parse(form.get('reason')),
          request_id: uuid.parse(form.get('request_id')),
        },
      });
      message =
        'Agreed adjustment recorded as a separate obligation. Original history is preserved.';
    } else if (intent === 'repayment') {
      result = await client.rpc('record_repayment', {
        h,
        d: {
          expense_id: uuid.parse(form.get('expense_id')),
          amount_cents: cents(val(form, 'amount')),
          occurred_on: date.parse(form.get('occurred_on')),
          note: val(form, 'note').slice(0, 2000),
          request_id: uuid.parse(form.get('request_id')),
        },
      });
      message =
        'Repayment recorded as pending. The recipient must confirm receipt before your balance changes.';
    } else if (intent === 'review')
      result = await client.rpc('review_repayment', {
        rid: uuid.parse(form.get('repayment_id')),
        approve: val(form, 'approve') === 'true',
      });
    else if (intent === 'void')
      result = await client.rpc('void_entry', { eid: uuid.parse(form.get('expense_id')) });
    else if (intent === 'vehicle') {
      result = await client.rpc('save_vehicle', {
        h,
        d: {
          ...(val(form, 'vehicle_id') ? { id: uuid.parse(form.get('vehicle_id')) } : {}),
          name: text(100).parse(form.get('name')),
          owner: uuid.parse(form.get('owner')),
          model: val(form, 'model').slice(0, 100),
          registration: val(form, 'registration').slice(0, 30),
          fuel_type: text(40).parse(form.get('fuel_type')),
          efficiency: decimal.parse(form.get('efficiency')),
          tank_litres: decimal.parse(form.get('tank_litres')),
          notes: val(form, 'notes').slice(0, 2000),
          active: val(form, 'active') !== 'false',
        },
      });
    } else if (intent === 'fuel')
      result = await client.rpc('record_fuel_price', {
        h,
        d: {
          vehicle_id: uuid.parse(form.get('vehicle_id')),
          price: decimal.parse(form.get('price')),
          fuel_type: text(40).parse(form.get('fuel_type')),
          observed_on: date.parse(form.get('observed_on')),
        },
      });
    else if (intent === 'rent') {
      result = await client.rpc('configure_rent', {
        h,
        d: {
          request_id: uuid.parse(form.get('request_id')),
          amount_cents: cents(val(form, 'amount')),
          paid_by: uuid.parse(form.get('paid_by')),
          anchor_date: date.parse(form.get('anchor_date')),
          interval_days: z.coerce
            .number()
            .pipe(z.union([z.literal(7), z.literal(14), z.literal(28)]))
            .parse(form.get('interval_days')),
          split_method: z.enum(['equal', 'amount', 'percentage']).parse(form.get('split_method')),
          participants: participants(form),
          reminder_days: z.coerce
            .number()
            .int()
            .min(1)
            .max(14)
            .parse(form.get('reminder_days') || 1),
        },
      });
      message =
        'Rent configured. Prior and settled obligations are preserved. Unpaid future cycles on or after the new anchor are superseded in the audit trail.';
    } else if (intent === 'cleaning')
      result = await client.rpc('save_cleaning_task', {
        h,
        d: {
          ...(val(form, 'task_id') ? { id: uuid.parse(form.get('task_id')) } : {}),
          title: text(150).parse(form.get('title')),
          description: val(form, 'description').slice(0, 2000),
          frequency: z
            .enum(['daily', 'weekly', 'fortnightly', 'monthly'])
            .parse(form.get('frequency')),
          anchor_date: date.parse(form.get('anchor_date')),
          rotation: z.array(uuid).min(1).parse(form.getAll('participants')),
          duration_minutes: z.coerce
            .number()
            .int()
            .min(1)
            .max(1440)
            .parse(form.get('duration_minutes') || 20),
          active: val(form, 'active') !== 'false',
        },
      });
    else if (intent === 'assignment')
      result = await client.rpc('update_assignment', {
        aid: uuid.parse(form.get('assignment_id')),
        d: val(form, 'assigned_to')
          ? { assigned_to: uuid.parse(form.get('assigned_to')) }
          : { note: val(form, 'note').slice(0, 2000) },
      });
    else if (intent === 'household') {
      const action = z
        .enum(['settings', 'external_paid', 'leave', 'role'])
        .parse(form.get('action'));
      result = await client.rpc('manage_household', {
        h,
        d: {
          action,
          ...(action === 'settings'
            ? {
                name: text(80).parse(form.get('name')),
                description: val(form, 'description').slice(0, 2000),
                timezone: text(80).parse(form.get('timezone')),
              }
            : action === 'external_paid'
              ? {
                  expense_id: uuid.parse(form.get('expense_id')),
                  paid: val(form, 'paid') === 'true',
                }
              : { user_id: uuid.parse(form.get('user_id')), role: val(form, 'role') }),
        },
      });
    } else if (intent === 'profile') {
      result = await client.rpc('update_profile', {
        account_name: text(80).parse(form.get('display_name')),
        account_timezone: text(80).parse(form.get('timezone')),
      });
      message = 'Your account details were saved.';
    } else if (intent === 'preferences')
      result = await client.rpc('set_preferences', {
        email_on: form.get('email_enabled') === 'on',
        activity_on: form.get('activity_enabled') === 'on',
      });
    else if (intent === 'read') result = await client.rpc('mark_notifications_read');
    else if (intent === 'upload') {
      const file = form.get('document');
      if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024)
        throw new Error('Select a PDF or image under 5 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime =
        bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
          ? 'application/pdf'
          : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
            ? 'image/jpeg'
            : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
              ? 'image/png'
              : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
                  String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
                ? 'image/webp'
                : null;
      if (!mime || mime !== file.type)
        throw new Error('File contents must match PDF, JPEG, PNG or WebP type.');
      const target = z
        .enum(['expense_id', 'fuel_price_id', 'repayment_id', 'assignment_id'])
        .parse(form.get('target'));
      result = await client.rpc('register_document', {
        h,
        d: {
          [target]: uuid.parse(form.get('record_id')),
          name: file.name,
          size_bytes: file.size,
          mime,
        },
      });
      if (!result.error) {
        const uploaded = await client.storage
          .from('household-documents')
          .upload(`${h}/${result.data}`, bytes, { contentType: mime, upsert: false });
        if (uploaded.error)
          return {
            error: 'The record is saved, but the document upload failed. Please try again.',
          };
      }
    } else return { error: 'Unknown action.' };
    if (result?.error)
      return {
        error:
          result.error.code === 'P0001'
            ? result.error.message
            : 'Unable to save. Check your values and permissions, then try again.',
      };
    if (h && ['rent', 'cleaning'].includes(intent)) await client.rpc('generate_schedule', { h });
    revalidatePath('/app', 'layout');
    if (intent === 'profile') revalidatePath('/onboarding');
    if (intent === 'create_household' || intent === 'join') redirect('/app/overview');
    return { message };
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    return { error: safeError(error) };
  }
}
export async function switchHousehold(form: FormData) {
  const h = uuid.parse(form.get('household_id'));
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await client
    .from('household_members')
    .select('user_id')
    .eq('household_id', h)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle();
  if (!data) redirect('/onboarding');
  (await cookies()).set('fairshare-household', h, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  revalidatePath('/app', 'layout');
  redirect('/app/overview');
}
export async function signOut(form?: FormData) {
  if (configured()) {
    const c = await supabase();
    const { error } = await c.auth.signOut({ scope: 'local' });
    if (error) redirect('/login?error=signout');
  }
  (await cookies()).delete('fairshare-household');
  const invitation = invitationToken.safeParse(form?.get('invitation'));
  if (invitation.success) redirect(`/login?mode=signin&token=${invitation.data}`);
  redirect('/');
}
