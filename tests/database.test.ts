import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { invitationToken } from '../lib/validation';
let db: PGlite;
const users = Array.from(
  { length: 12 },
  (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
);
async function owner(sql: string, params: unknown[] = []) {
  await db.exec('reset role');
  return db.query(sql, params);
}
async function as(user: string, sql: string, params: unknown[] = []) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec('set role authenticated');
  return db.query(sql, params);
}
async function rpc(user: string, fn: string, args: unknown[] = []) {
  const r = await as(
    user,
    `select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as result`,
    args,
  );
  return (r.rows[0] as { result: unknown }).result as string;
}
async function house(count = 5) {
  await owner('delete from rate_limits');
  const h = await rpc(users[0], 'create_household', [
    JSON.stringify({ name: 'Test house', display_name: 'Alex', timezone: 'Australia/Sydney' }),
  ]);
  for (let i = 1; i < count; i++)
    await owner(
      "insert into household_members(household_id,user_id,display_name,role) values($1,$2,$3,'member')",
      [h, users[i], `Member ${i}`],
    );
  return h;
}
function entry(overrides: Record<string, unknown> = {}) {
  return {
    request_id: randomUUID(),
    kind: 'expense',
    description: 'Groceries',
    amount_cents: 9000,
    category: 'Groceries',
    paid_by: users[0],
    occurred_on: '2026-11-05',
    split_method: 'equal',
    participants: users.slice(0, 3).map((user_id) => ({ user_id })),
    ...overrides,
  };
}
async function shares(e: string) {
  const r = await owner(
    'select user_id,amount_cents from expense_participants where expense_id=$1 order by user_id',
    [e],
  );
  return r.rows as { user_id: string; amount_cents: number }[];
}
const supabaseBootstrap = `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}',created_at timestamptz not null default now(),last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(supabaseBootstrap);
  for (let i = 0; i < users.length; i++)
    await owner('insert into auth.users values($1,$2,now())', [
      users[i],
      `member${i}@example.test`,
    ]);
  await db.exec(readFileSync('supabase/migrations/202611050001_fairshare.sql', 'utf8'));
  const profileMigration = readdirSync('supabase/migrations').find((f) =>
    f.endsWith('_user_profiles.sql'),
  );
  if (!profileMigration) throw new Error('User profiles migration missing');
  await db.exec(readFileSync('supabase/migrations/' + profileMigration, 'utf8'));
});
afterAll(async () => {
  await db?.close();
});
describe('authoritative financial ledger', () => {
  it('splits $90 among selected three, including purchaser, without charging others', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    expect((await shares(e)).map((s) => s.amount_cents)).toEqual([3000, 3000, 3000]);
  });
  it('allocates every remainder cent deterministically', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [
      h,
      entry({
        amount_cents: 100,
        participants: users
          .slice(0, 3)
          .reverse()
          .map((user_id) => ({ user_id })),
      }),
    ]);
    expect((await shares(e)).map((s) => s.amount_cents)).toEqual([34, 33, 33]);
  });
  it('accepts custom amounts and percentages', async () => {
    const h = await house();
    for (const [method, values] of [
      ['amount', [1000, 2000, 6000]],
      ['percentage', [1000, 2000, 7000]],
    ] as const) {
      const e = await rpc(users[0], 'record_entry', [
        h,
        entry({
          split_method: method,
          participants: values.map((value, i) => ({ user_id: users[i], value })),
        }),
      ]);
      expect((await shares(e)).reduce((s, p) => s + p.amount_cents, 0)).toBe(9000);
    }
  });
  it('supports excluding the purchaser', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [
      h,
      entry({ participants: [{ user_id: users[1] }] }),
    ]);
    expect((await shares(e))[0]).toEqual({ user_id: users[1], amount_cents: 9000 });
  });
  it('rejects invalid or duplicate shares atomically', async () => {
    const h = await house();
    for (const override of [
      { split_method: 'amount', participants: [{ user_id: users[1], value: 100 }] },
      { split_method: 'percentage', participants: [{ user_id: users[1], value: 9999 }] },
      { participants: [{ user_id: users[1] }, { user_id: users[1] }] },
      { participants: [{ user_id: users[8] }] },
      { amount_cents: -1 },
    ])
      await expect(rpc(users[0], 'record_entry', [h, entry(override)])).rejects.toThrow();
    const r = await owner('select count(*)::int n from expenses where household_id=$1', [h]);
    expect(r.rows).toEqual([{ n: 0 }]);
  });
  it('prevents duplicate expense submissions', async () => {
    const h = await house();
    const d = entry();
    expect(await rpc(users[0], 'record_entry', [h, d])).toBe(
      await rpc(users[0], 'record_entry', [h, d]),
    );
  });
  it('reserves pending repayments, confirms once, and preserves unrelated debts', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    const d = {
      expense_id: e,
      amount_cents: 1500,
      occurred_on: '2026-11-05',
      request_id: randomUUID(),
    };
    const r = await rpc(users[1], 'record_repayment', [h, d]);
    expect(await rpc(users[1], 'record_repayment', [h, d])).toBe(r);
    await expect(
      rpc(users[1], 'record_repayment', [
        h,
        { ...d, request_id: randomUUID(), amount_cents: 2000 },
      ]),
    ).rejects.toThrow();
    let check = await owner(
      "select coalesce(sum(amount_cents),0)::int n from repayments where expense_id=$1 and status='confirmed'",
      [e],
    );
    expect(check.rows).toEqual([{ n: 0 }]);
    await expect(rpc(users[2], 'review_repayment', [r, true])).rejects.toThrow();
    await rpc(users[0], 'review_repayment', [r, true]);
    await rpc(users[0], 'review_repayment', [r, true]);
    const r2 = await rpc(users[1], 'record_repayment', [h, { ...d, request_id: randomUUID() }]);
    await rpc(users[0], 'review_repayment', [r2, true]);
    check = await owner(
      "select payer,sum(amount_cents)::int n from repayments where expense_id=$1 and status='confirmed' group by payer",
      [e],
    );
    expect(check.rows).toEqual([{ payer: users[1], n: 3000 }]);
    await expect(rpc(users[0], 'void_entry', [e])).rejects.toThrow();
  });
  it('rejects repayment without reducing obligation and permits retry', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    const d = {
      expense_id: e,
      amount_cents: 3000,
      occurred_on: '2026-11-05',
      request_id: randomUUID(),
    };
    const r = await rpc(users[1], 'record_repayment', [h, d]);
    await rpc(users[0], 'review_repayment', [r, false]);
    await expect(
      rpc(users[1], 'record_repayment', [h, { ...d, request_id: randomUUID() }]),
    ).resolves.toBeTypeOf('string');
  });
});
describe('vehicles, rent, bills and cleaning', () => {
  it('calculates 63km / 12km/L × $1.85 = 5.25L and $9.71; snapshots prices; adds tolls and parking', async () => {
    const h = await house();
    const v = await rpc(users[0], 'save_vehicle', [
      h,
      { name: 'Car', owner: users[0], efficiency: '12', tank_litres: '60', fuel_type: 'Unleaded' },
    ]);
    const f = await rpc(users[0], 'record_fuel_price', [
      h,
      { vehicle_id: v, price: '1.85', fuel_type: 'Unleaded', observed_on: '2026-11-05' },
    ]);
    const e = await rpc(users[0], 'record_entry', [
      h,
      entry({
        kind: 'trip',
        amount_cents: 999999,
        participants: users.slice(0, 4).map((user_id) => ({ user_id })),
        metadata: {
          vehicle_id: v,
          driver: users[0],
          distance: '63',
          fuel_price_id: f,
          tolls_cents: 100,
          parking_cents: 200,
        },
      }),
    ]);
    const result = await owner('select amount_cents,metadata from expenses where id=$1', [e]);
    const row = result.rows[0] as {
      amount_cents: number;
      metadata: { litres: number; fuel_cents: number; price: number };
    };
    expect(row.amount_cents).toBe(1271);
    expect(Number(row.metadata.litres)).toBe(5.25);
    expect(row.metadata.fuel_cents).toBe(971);
    await rpc(users[0], 'record_fuel_price', [
      h,
      { vehicle_id: v, price: '2.15', fuel_type: 'Unleaded', observed_on: '2026-11-06' },
    ]);
    expect(
      (await owner("select metadata->>'price' price from expenses where id=$1", [e])).rows,
    ).toEqual([{ price: '1.8500' }]);
    await expect(
      rpc(users[0], 'record_entry', [
        h,
        entry({
          kind: 'trip',
          metadata: { vehicle_id: v, driver: users[0], distance: '-1', price: '1.85' },
        }),
      ]),
    ).rejects.toThrow();
    await expect(
      rpc(users[0], 'save_vehicle', [
        h,
        { name: 'Bad', owner: users[0], efficiency: 0, tank_litres: 60, fuel_type: 'Unleaded' },
      ]),
    ).rejects.toThrow();
  });
  it('generates fortnightly rent on anchor dates and idempotent due reminders in household timezone', async () => {
    const h = await house();
    const today = (
      (await owner("select (now() at time zone 'Australia/Sydney')::date::text d")).rows[0] as {
        d: string;
      }
    ).d;
    await rpc(users[0], 'configure_rent', [
      h,
      { ...entry(), amount_cents: 150000, anchor_date: today, interval_days: 14, reminder_days: 1 },
    ]);
    await rpc(users[0], 'generate_schedule', [h]);
    await rpc(users[0], 'generate_schedule', [h]);
    const r = await owner(
      "select count(*)::int n, sum(amount_cents)::int total from expenses where household_id=$1 and kind='rent'",
      [h],
    );
    expect(r.rows).toEqual([{ n: 2, total: 300000 }]);
    const diff = await owner(
      "select max(due_on)-min(due_on) n from expenses where household_id=$1 and kind='rent'",
      [h],
    );
    expect(diff.rows).toEqual([{ n: 14 }]);
    const n = await owner(
      "select count(*)::int n from notifications where household_id=$1 and event_key like 'due:%'",
      [h],
    );
    expect(n.rows).toEqual([{ n: 3 }]);
  });
  it('supports bills with selected custom contributions', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [
      h,
      entry({
        kind: 'bill',
        due_on: '2026-11-20',
        metadata: { provider: 'Electricity', reminder_days: 3 },
        split_method: 'percentage',
        participants: [
          { user_id: users[0], value: 2500 },
          { user_id: users[1], value: 7500 },
        ],
      }),
    ]);
    expect((await shares(e)).map((p) => p.amount_cents)).toEqual([2250, 6750]);
  });
  it('rotates tasks for ten members, preserves completion and restricts completion to assignee', async () => {
    const h = await house(10);
    const today = (
      (await owner("select (now() at time zone 'Australia/Sydney')::date::text d")).rows[0] as {
        d: string;
      }
    ).d;
    const t = await rpc(users[0], 'save_cleaning_task', [
      h,
      {
        title: 'Kitchen',
        frequency: 'daily',
        anchor_date: today,
        rotation: users.slice(0, 10),
        duration_minutes: 20,
      },
    ]);
    await rpc(users[0], 'generate_schedule', [h]);
    await rpc(users[0], 'generate_schedule', [h]);
    const a = (
      await owner('select * from cleaning_assignments where task_id=$1 order by due_on', [t])
    ).rows as { id: string; assigned_to: string }[];
    expect(a.length).toBe(15);
    expect(a.slice(0, 10).map((x) => x.assigned_to)).toEqual(users.slice(0, 10));
    await expect(rpc(users[2], 'update_assignment', [a[1].id, {}])).rejects.toThrow();
    await rpc(users[1], 'update_assignment', [a[1].id, { note: 'Done' }]);
    await rpc(users[0], 'save_cleaning_task', [
      h,
      { id: t, title: 'Kitchen', rotation: [users[2], users[3]], active: true },
    ]);
    expect(
      (await owner('select assigned_to from cleaning_assignments where id=$1', [a[1].id])).rows,
    ).toEqual([{ assigned_to: users[1] }]);
    await expect(
      rpc(users[0], 'update_assignment', [a[1].id, { assigned_to: users[2] }]),
    ).rejects.toThrow();
  });
});
describe('access control and invitations', () => {
  it('creates, accepts, rejects expired and prevents reused invitations', async () => {
    const h = await house(1);
    const token = await rpc(users[0], 'create_invitation', [h, 'member1@example.test']);
    await expect(rpc(users[2], 'accept_invitation', [token, 'Wrong email'])).rejects.toThrow();
    const link = `http://localhost:3000/onboarding?token=${token}`;
    expect(invitationToken.parse(token)).toBe(token);
    expect(invitationToken.safeParse(`${link}&token=${token}`).success).toBe(false);
    expect(
      await rpc(users[1], 'accept_invitation', [invitationToken.parse(` ${link} `), 'Jamie']),
    ).toBe(h);
    await expect(rpc(users[2], 'accept_invitation', [token, 'Reuse'])).rejects.toThrow();
    const expired = await rpc(users[0], 'create_invitation', [h, null]);
    await owner(
      "update household_invitations set expires_at=now()-interval '1 day' where household_id=$1",
      [h],
    );
    await expect(rpc(users[2], 'accept_invitation', [expired, 'Sam'])).rejects.toThrow();
  });
  it('blocks unrelated household reads, forged payer, role escalation and internal allocator RPCs', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    expect((await as(users[9], 'select * from expenses where id=$1', [e])).rows).toHaveLength(0);
    expect((await as(users[4], 'select * from expenses where id=$1', [e])).rows).toHaveLength(0);
    await expect(rpc(users[9], 'record_entry', [h, entry()])).rejects.toThrow();
    await expect(rpc(users[1], 'record_entry', [h, entry()])).rejects.toThrow();
    await expect(
      rpc(users[1], 'manage_household', [h, { action: 'role', user_id: users[1], role: 'admin' }]),
    ).rejects.toThrow();
    await expect(rpc(users[1], 'create_entry', [h, users[0], entry()])).rejects.toThrow();
    await expect(
      as(users[1], "update household_members set role='admin' where household_id=$1", [h]),
    ).rejects.toThrow();
  });
  it('preserves departing member history and prevents removal of last admin', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    await expect(
      rpc(users[0], 'manage_household', [h, { action: 'leave', user_id: users[0] }]),
    ).rejects.toThrow();
    await rpc(users[1], 'manage_household', [h, { action: 'leave', user_id: users[1] }]);
    expect((await as(users[1], 'select * from expenses where id=$1', [e])).rows).toHaveLength(0);
    expect(await shares(e)).toHaveLength(3);
  });
  it('protects document registration, private objects and signed-url read policy', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    await expect(
      rpc(users[4], 'register_document', [
        h,
        { expense_id: e, name: 'bill.pdf', mime: 'application/pdf', size_bytes: 100 },
      ]),
    ).rejects.toThrow();
    const doc = await rpc(users[0], 'register_document', [
      h,
      { expense_id: e, name: 'bill.pdf', mime: 'application/pdf', size_bytes: 100 },
    ]);
    await as(
      users[0],
      "insert into storage.objects(bucket_id,name) values('household-documents',$1)",
      [`${h}/${doc}`],
    );
    expect((await as(users[4], 'select * from storage.objects')).rows).toHaveLength(0);
    expect(
      (await as(users[1], 'select * from storage.objects where name=$1', [`${h}/${doc}`])).rows,
    ).toHaveLength(1);
    await expect(
      as(
        users[4],
        "insert into storage.objects(bucket_id,name) values('household-documents','forged')",
      ),
    ).rejects.toThrow();
  });
  it('keeps scheduler restricted to the service role', async () => {
    await expect(rpc(users[0], 'process_schedules')).rejects.toThrow();
    await db.exec('reset role;set role anon');
    await expect(db.query('select generate_schedule($1)', [randomUUID()])).rejects.toThrow();
  });
});

describe('corrections, schedule changes and delivery retries', () => {
  it('atomically replaces an unsettled expense, preserving original shares and preventing key reuse', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    const changed = entry({ description: 'Corrected groceries', amount_cents: 12000 });
    const replacement = await rpc(users[0], 'replace_entry', [e, changed]);
    expect(await rpc(users[0], 'replace_entry', [e, changed])).toBe(replacement);
    expect((await owner('select status from expenses where id=$1', [e])).rows).toEqual([
      { status: 'void' },
    ]);
    expect((await shares(replacement)).map((p) => p.amount_cents)).toEqual([4000, 4000, 4000]);
    expect(await shares(e)).toHaveLength(3);
    const e2 = await rpc(users[0], 'record_entry', [h, entry()]);
    await expect(rpc(users[0], 'replace_entry', [e2, changed])).rejects.toThrow();
    expect((await owner('select status from expenses where id=$1', [e2])).rows).toEqual([
      { status: 'active' },
    ]);
  });
  it('rolls back a correction if the replacement allocation is invalid', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    await expect(
      rpc(users[0], 'replace_entry', [e, entry({ participants: [] })]),
    ).rejects.toThrow();
    expect((await owner('select status from expenses where id=$1', [e])).rows).toEqual([
      { status: 'active' },
    ]);
  });
  it('requires an explicit adjustment after settlement and preserves the confirmed repayment', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    const r = await rpc(users[1], 'record_repayment', [
      h,
      { expense_id: e, amount_cents: 3000, occurred_on: '2026-11-05', request_id: randomUUID() },
    ]);
    await rpc(users[0], 'review_repayment', [r, true]);
    await expect(
      rpc(users[0], 'replace_entry', [e, entry({ amount_cents: 6000 })]),
    ).rejects.toThrow();
    const d = {
      expense_id: e,
      creditor: users[1],
      debtor: users[0],
      amount_cents: 1000,
      occurred_on: '2026-11-05',
      reason: 'Agreed refund',
      request_id: randomUUID(),
    };
    await expect(rpc(users[1], 'record_adjustment', [h, d])).rejects.toThrow();
    const a = await rpc(users[0], 'record_adjustment', [h, d]);
    expect(await rpc(users[0], 'record_adjustment', [h, d])).toBe(a);
    expect((await shares(a)).map((p) => p.amount_cents)).toEqual([1000]);
    expect((await owner('select status from repayments where id=$1', [r])).rows).toEqual([
      { status: 'confirmed' },
    ]);
  });
  it('rejects changed financial payloads submitted with an existing idempotency key', async () => {
    const h = await house();
    const d = entry();
    await rpc(users[0], 'record_entry', [h, d]);
    await expect(
      rpc(users[0], 'record_entry', [h, { ...d, amount_cents: 8000 }]),
    ).rejects.toThrow();
  });
  it('supersedes only unpaid future rent, prevents duplicates and preserves settled future cycles', async () => {
    const h = await house();
    const today = (
      (await owner("select (now() at time zone 'Australia/Sydney')::date::text d")).rows[0] as {
        d: string;
      }
    ).d;
    const d = {
      ...entry(),
      amount_cents: 150000,
      anchor_date: today,
      interval_days: 14,
      reminder_days: 1,
    };
    const c = await rpc(users[0], 'configure_rent', [h, d]);
    expect(await rpc(users[0], 'configure_rent', [h, d])).toBe(c);
    await rpc(users[0], 'generate_schedule', [h]);
    await rpc(users[0], 'configure_rent', [
      h,
      { ...d, request_id: randomUUID(), amount_cents: 180000 },
    ]);
    await rpc(users[0], 'generate_schedule', [h]);
    expect(
      (
        await owner(
          "select count(*)::int n from expenses where household_id=$1 and kind='rent' and status='active'",
          [h],
        )
      ).rows,
    ).toEqual([{ n: 2 }]);
    const e = (
      (
        await owner(
          "select id from expenses where household_id=$1 and kind='rent' and status='active' order by due_on desc limit 1",
          [h],
        )
      ).rows[0] as { id: string }
    ).id;
    await rpc(users[1], 'record_repayment', [
      h,
      { expense_id: e, amount_cents: 1000, occurred_on: today, request_id: randomUUID() },
    ]);
    await expect(
      rpc(users[0], 'configure_rent', [h, { ...d, request_id: randomUUID() }]),
    ).rejects.toThrow();
  });
  it('handles month-end cleaning recurrence without losing the original anchor day', async () => {
    const h = await house();
    const today = (
      (await owner("select (now() at time zone 'Australia/Sydney')::date::text d")).rows[0] as {
        d: string;
      }
    ).d;
    const year = Number(today.slice(0, 4)) - 1;
    const t = await rpc(users[0], 'save_cleaning_task', [
      h,
      {
        title: 'Monthly fridge',
        frequency: 'monthly',
        anchor_date: `${year}-01-31`,
        rotation: users.slice(0, 3),
        duration_minutes: 20,
      },
    ]);
    await rpc(users[0], 'generate_schedule', [h]);
    const dates = (
      await owner(
        'select due_on::text from cleaning_assignments where task_id=$1 order by due_on limit 3',
        [t],
      )
    ).rows;
    expect(dates).toEqual([
      { due_on: `${year}-01-31` },
      { due_on: `${year}-02-${year % 4 === 0 ? '29' : '28'}` },
      { due_on: `${year}-03-31` },
    ]);
  });
  it('creates one outbox entry per opted-in recipient and leases retries safely', async () => {
    const h = await house();
    await rpc(users[1], 'set_preferences', [true, true]);
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    const out = (
      await owner(
        'select o.* from email_outbox o join notifications n on n.id=o.notification_id where n.event_key=$1',
        ['entry:' + e],
      )
    ).rows;
    expect(out).toHaveLength(1);
    await owner("select set_config('request.jwt.claim.sub','',false)");
    await db.exec('set role service_role');
    const first = await db.query('select * from claim_emails()');
    expect(first.rows).toHaveLength(1);
    const second = await db.query('select * from claim_emails()');
    expect(second.rows).toHaveLength(0);
    await owner("update email_outbox set lease_until=now()-interval '1 minute' where id=$1", [
      (out[0] as { id: string }).id,
    ]);
    await owner("select set_config('request.jwt.claim.sub','',false)");
    await db.exec('set role service_role');
    expect((await db.query('select * from claim_emails()')).rows).toHaveLength(1);
  });
});

describe('consistent RLS snapshots', () => {
  it('returns a complete authorised ledger and hides unrelated records and other repayments', async () => {
    const h = await house();
    const e = await rpc(users[0], 'record_entry', [h, entry()]);
    const r = await rpc(users[2], 'record_repayment', [
      h,
      { expense_id: e, amount_cents: 1000, occurred_on: '2026-11-05', request_id: randomUUID() },
    ]);
    await rpc(users[0], 'review_repayment', [r, true]);
    const snap = (await rpc(users[1], 'household_snapshot', [h])) as unknown as {
      expenses: { id: string }[];
      shares: unknown[];
      repayments: unknown[];
      audit: unknown[];
    };
    expect(snap.expenses.map((e) => e.id)).toEqual([e]);
    expect(snap.shares).toHaveLength(3);
    expect(snap.repayments).toHaveLength(0);
    expect(snap.audit).toHaveLength(0);
    await expect(rpc(users[8], 'household_snapshot', [h])).rejects.toThrow();
  });
  it('generates the lead reminder in household timezone once, including the collector', async () => {
    const h = await house();
    await owner("update households set timezone='America/Los_Angeles' where id=$1", [h]);
    const tomorrow = (
      (await owner("select ((now() at time zone 'America/Los_Angeles')::date+1)::text d"))
        .rows[0] as { d: string }
    ).d;
    await rpc(users[0], 'configure_rent', [
      h,
      { ...entry(), anchor_date: tomorrow, interval_days: 14, reminder_days: 1 },
    ]);
    await rpc(users[0], 'generate_schedule', [h]);
    await rpc(users[0], 'generate_schedule', [h]);
    expect(
      (
        await owner(
          "select count(*)::int n from notifications where household_id=$1 and event_key like 'due:%'",
          [h],
        )
      ).rows,
    ).toEqual([{ n: 3 }]);
  });
});
it('does not expose another user’s membership through a helper RPC', async () => {
  const h = await house();
  await expect(rpc(users[9], 'is_member', [h, users[0]])).rejects.toThrow();
  expect(await rpc(users[9], 'is_member', [h])).toBe(false);
});

describe('saved user profiles and ownership', () => {
  it('backfills accounts that existed before the profile migration', async () => {
    const result = await owner('select count(*)::int n from profiles where id=any($1::uuid[])', [
      users,
    ]);
    expect(result.rows).toEqual([{ n: 12 }]);
  });
  it('atomically creates a profile from the authoritative Auth email, with no password column', async () => {
    const id = randomUUID();
    await owner(
      "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'real@example.test',now(),$2)",
      [
        id,
        {
          display_name: '  New housemate  ',
          email: 'forged@example.test',
          role: 'admin',
          password: 'never-store-this',
        },
      ],
    );
    const result = await as(id, 'select * from profiles where id=$1', [id]);
    const profile = result.rows[0] as Record<string, unknown>;
    expect(profile.email).toBe('real@example.test');
    expect(profile.display_name).toBe('New housemate');
    expect(profile).not.toHaveProperty('password');
    expect(profile).not.toHaveProperty('role');
  });
  it('restricts profile reads to their owner, including household administrators', async () => {
    expect((await as(users[0], 'select id from profiles')).rows).toEqual([{ id: users[0] }]);
    expect(
      (await as(users[0], 'select * from profiles where id=$1', [users[1]])).rows,
    ).toHaveLength(0);
    await db.exec('reset role;set role anon');
    await expect(db.query('select * from profiles')).rejects.toThrow();
  });
  it('allows only the current user’s validated account preferences to be updated', async () => {
    const profile = (await rpc(users[1], 'update_profile', [
      ' Jamie Chen ',
      'Australia/Perth',
    ])) as unknown as { id: string; display_name: string; timezone: string };
    expect(profile.id).toBe(users[1]);
    expect(profile.display_name).toBe('Jamie Chen');
    expect(profile.timezone).toBe('Australia/Perth');
    await expect(
      as(users[1], "update profiles set email='forged@example.test' where id=$1", [users[1]]),
    ).rejects.toThrow();
    await expect(
      as(users[1], "update profiles set display_name='Stolen' where id=$1", [users[0]]),
    ).rejects.toThrow();
    await expect(rpc(users[1], 'update_profile', ['', 'Australia/Sydney'])).rejects.toThrow();
    await expect(rpc(users[1], 'update_profile', ['Jamie', 'MadeUp/Zone'])).rejects.toThrow();
  });
  it('syncs verified email/sign-in timestamps without erasing saved preferences', async () => {
    await owner(
      "update auth.users set email='updated@example.test',last_sign_in_at='2026-11-06T02:00:00Z',raw_user_meta_data=$2 where id=$1",
      [users[1], { display_name: 'Provider name' }],
    );
    const profile = (await rpc(users[1], 'ensure_profile')) as unknown as {
      email: string;
      display_name: string;
      timezone: string;
      last_sign_in_at: string;
    };
    expect(profile.email).toBe('updated@example.test');
    expect(profile.display_name).toBe('Jamie Chen');
    expect(profile.timezone).toBe('Australia/Perth');
    expect(profile.last_sign_in_at).toContain('2026-11-06');
  });
  it('rejects unverified users and anonymous calls to profile mutation RPCs', async () => {
    const id = randomUUID();
    await owner("insert into auth.users(id,email) values($1,'unverified@example.test')", [id]);
    await expect(rpc(id, 'ensure_profile')).rejects.toThrow();
    await expect(rpc(id, 'update_profile', ['Unverified', 'Australia/Sydney'])).rejects.toThrow();
    await db.exec('reset role;set role anon');
    await expect(db.query('select public.ensure_profile()')).rejects.toThrow();
  });
  it('repairs a missing profile idempotently without accepting another user ID', async () => {
    const id = randomUUID();
    await owner(
      "insert into auth.users(id,email,email_confirmed_at) values($1,'repair@example.test',now())",
      [id],
    );
    await owner('delete from profiles where id=$1', [id]);
    const p = (await rpc(id, 'ensure_profile')) as unknown as { id: string };
    expect(p.id).toBe(id);
    await rpc(id, 'ensure_profile');
    expect((await owner('select count(*)::int n from profiles where id=$1', [id])).rows).toEqual([
      { n: 1 },
    ]);
    await expect(rpc(users[0], 'ensure_profile', [users[1]])).rejects.toThrow();
  });
});

describe('manual migration recovery', () => {
  it('preserves profile access when the base migration is applied after profiles', async () => {
    const recovery = new PGlite();
    try {
      await recovery.exec(supabaseBootstrap);
      const profileMigration = readdirSync('supabase/migrations').find((f) =>
        f.endsWith('_user_profiles.sql'),
      );
      if (!profileMigration) throw new Error('User profiles migration missing');
      await recovery.exec(readFileSync('supabase/migrations/' + profileMigration, 'utf8'));
      await recovery.query(
        'insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',
        [users[0], 'recovery@example.test'],
      );
      await recovery.exec(readFileSync('supabase/migrations/202611050001_fairshare.sql', 'utf8'));
      await recovery.query("select set_config('request.jwt.claim.sub',$1,false)", [users[0]]);
      await recovery.exec('set role authenticated');
      const original = await recovery.query('select id,email from public.profiles');
      expect(original.rows).toEqual([{ id: users[0], email: 'recovery@example.test' }]);
      await recovery.query('select public.ensure_profile()');
      await recovery.query('select public.update_profile($1,$2)', ['Alex', 'Australia/Sydney']);
      const updated = await recovery.query('select display_name from public.profiles');
      expect(updated.rows).toEqual([{ display_name: 'Alex' }]);
      const permissions = await recovery.query(`select
        has_function_privilege('anon','public.create_household(jsonb)','EXECUTE') as anonymous_write,
        has_function_privilege('authenticated','public.rate_limit(text,integer)','EXECUTE') as internal_access,
        has_table_privilege('authenticated','public.rate_limits','SELECT') as internal_read`);
      expect(permissions.rows).toEqual([
        {
          anonymous_write: false,
          internal_access: false,
          internal_read: false,
        },
      ]);
    } finally {
      await recovery.close();
    }
  });
});
