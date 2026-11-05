import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (
  process.env.SEED_CONFIRM_DEVELOPMENT !== 'true' ||
  !process.env.SEED_PASSWORD ||
  process.env.SEED_PASSWORD.length < 12
)
  throw new Error(
    'Use a separate DEVELOPMENT project. Set SEED_CONFIRM_DEVELOPMENT=true and a SEED_PASSWORD of at least 12 characters.',
  );
if (!url || !key || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error('Supabase environment variables are missing.');
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const check = await admin.from('households').select('id').eq('name', 'SAMPLE · The Greenhouse');
if (check.error) throw new Error('Apply the database migration first.');
if (check.data.length)
  throw new Error(
    'The sample household already exists. Use its accounts or a fresh development project.',
  );
const names = ['Alex Morgan', 'Jamie Chen', 'Sam Wilson', 'Taylor Smith', 'Jordan Lee'];
const accounts = [];
for (let i = 0; i < 5; i++) {
  const email = `fairshare.member${i + 1}@example.test`;
  const created = await admin.auth.admin.createUser({
    email,
    password: process.env.SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: names[i] },
  });
  if (created.error)
    throw new Error(
      `Cannot create ${email}. Use a fresh development project (partial seeds are not automatically deleted).`,
    );
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: process.env.SEED_PASSWORD,
  });
  if (error) throw error;
  accounts.push({ client, id: data.user.id, email });
}
async function rpc(client, fn, params) {
  const { data, error } = await client.rpc(fn, params);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}
const main = accounts[0].client;
const h = await rpc(main, 'create_household', {
  d: {
    name: 'SAMPLE · The Greenhouse',
    description: 'Fictional development data. Never use for actual household records.',
    display_name: names[0],
    timezone: 'Australia/Sydney',
  },
});
for (let i = 1; i < 5; i++) {
  const token = await rpc(main, 'create_invitation', { h, email_address: accounts[i].email });
  await rpc(accounts[i].client, 'accept_invitation', { token, member_name: names[i] });
}
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Australia/Sydney',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const base = {
  request_id: randomUUID(),
  kind: 'expense',
  description: 'SAMPLE · Weekly groceries',
  amount_cents: 9000,
  category: 'Groceries',
  paid_by: accounts[0].id,
  occurred_on: today,
  split_method: 'equal',
  participants: accounts.slice(0, 3).map((a) => ({ user_id: a.id })),
};
await rpc(main, 'record_entry', { h, d: base });
const v = await rpc(main, 'save_vehicle', {
  h,
  d: {
    name: 'SAMPLE · The little Subaru',
    model: 'Subaru Impreza',
    owner: accounts[0].id,
    fuel_type: 'Unleaded 91',
    efficiency: '12',
    tank_litres: '60',
  },
});
const f = await rpc(main, 'record_fuel_price', {
  h,
  d: { vehicle_id: v, price: '1.85', fuel_type: 'Unleaded 91', observed_on: today },
});
await rpc(main, 'record_entry', {
  h,
  d: {
    ...base,
    request_id: randomUUID(),
    kind: 'trip',
    description: 'SAMPLE · Coastal day trip',
    metadata: {
      vehicle_id: v,
      driver: accounts[0].id,
      fuel_price_id: f,
      distance: '63',
      tolls_cents: 0,
      parking_cents: 0,
    },
    participants: accounts.slice(0, 4).map((a) => ({ user_id: a.id })),
  },
});
await rpc(main, 'record_entry', {
  h,
  d: {
    ...base,
    request_id: randomUUID(),
    kind: 'bill',
    description: 'SAMPLE · Electricity bill',
    amount_cents: 20000,
    due_on: today,
    metadata: { provider: 'Sample provider', reminder_days: 1 },
  },
});
await rpc(main, 'configure_rent', {
  h,
  d: {
    ...base,
    amount_cents: 150000,
    anchor_date: today,
    interval_days: 14,
    reminder_days: 1,
    participants: accounts.map((a) => ({ user_id: a.id })),
  },
});
await rpc(main, 'save_cleaning_task', {
  h,
  d: {
    title: 'SAMPLE · Kitchen reset',
    frequency: 'weekly',
    anchor_date: today,
    rotation: accounts.map((a) => a.id),
    duration_minutes: 20,
  },
});
await rpc(main, 'generate_schedule', { h });
console.log(
  'Development sample household created. Sign in using SEED_PASSWORD and one of these accounts:',
);
accounts.forEach((a) => console.log(a.email));
