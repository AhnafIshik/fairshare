import { z } from 'zod';
export const uuid = z.uuid();
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Choose a valid date');
export const text = (max = 200) => z.string().trim().min(1).max(max);
const invitationHelp = 'Paste the full Fairshare invitation link or its 64-character token.';
export const invitationToken = z
  .string({ error: invitationHelp })
  .trim()
  .max(2048, invitationHelp)
  .transform((value) => {
    try {
      const link = new URL(value);
      if (['http:', 'https:'].includes(link.protocol) && link.pathname === '/onboarding') {
        const tokens = link.searchParams.getAll('token');
        if (tokens.length === 1) return tokens[0];
      }
    } catch {
      // A raw invitation token is also accepted.
    }
    return value;
  })
  .pipe(
    z
      .string()
      .regex(/^[a-f0-9]{64}$/i, invitationHelp)
      .toLowerCase(),
  );
export const decimal = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Enter a positive number, with up to four decimal places')
  .refine((v) => Number(v) > 0 && Number(v) <= 100000);
export const entrySchema = z.object({
  description: text(),
  category: text(60),
  occurred_on: date,
  paid_by: uuid,
  split_method: z.enum(['equal', 'amount', 'percentage']),
  kind: z.enum(['expense', 'bill', 'trip']),
  notes: z.string().max(2000),
  request_id: uuid,
});
export function participants(form: FormData) {
  const method = z
    .enum(['equal', 'amount', 'percentage'])
    .parse(form.get('split_method') || 'equal');
  const ids = z
    .array(uuid)
    .min(1, 'Choose at least one beneficiary')
    .max(1000)
    .parse(form.getAll('participants'));
  if (new Set(ids).size !== ids.length) throw new Error('Choose each beneficiary once');
  return ids.map((user_id) => ({
    user_id,
    value: method === 'equal' ? 0 : minor(String(form.get('share_' + user_id) ?? '')),
  }));
}
function minor(v: string) {
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(v.trim());
  if (!m)
    throw new Error(
      'Enter each selected share as dollars or a percentage with up to two decimal places',
    );
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}
