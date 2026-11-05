import type { Snapshot, Expense } from './types';
import { addDays, localDate } from './dates';
export function demoSnapshot(): Snapshot {
  const today = localDate();
  const ids = [
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000005',
  ];
  const h = '20000000-0000-4000-8000-000000000001';
  const household = {
    id: h,
    name: 'The Greenhouse',
    description: 'A little place we call home, in Newtown.',
    currency: 'AUD',
    timezone: 'Australia/Sydney',
  };
  const members = ids.map((user_id, i) => ({
    user_id,
    household_id: h,
    display_name: ['Alex Morgan', 'Jamie Chen', 'Sam Wilson', 'Taylor Smith', 'Jordan Lee'][i],
    role: i === 0 ? ('admin' as const) : ('member' as const),
    left_at: null,
  }));
  const make = (
    id: string,
    description: string,
    amount_cents: number,
    paid_by: string,
    category: string,
    kind: Expense['kind'] = 'expense',
    due_on: string | null = null,
    metadata: Expense['metadata'] = {},
  ): Expense => ({
    id,
    household_id: h,
    description,
    amount_cents,
    paid_by,
    created_by: paid_by,
    category,
    kind,
    due_on,
    occurred_on: addDays(today, -1),
    created_at: new Date().toISOString(),
    status: 'active',
    split_method: 'equal',
    notes: 'Sample record for the read-only preview.',
    metadata,
    external_paid: false,
  });
  const expenses = [
    make('e1', 'The weekly grocery run', 9000, ids[0], 'Groceries'),
    make('e2', 'Internet · November', 8900, ids[1], 'Internet', 'bill', addDays(today, 3), {
      provider: 'Sample internet provider',
      reminder_days: 1,
    }),
    make('e3', 'Coastal day trip', 971, ids[2], 'Fuel', 'trip', null, {
      vehicle_id: 'v1',
      vehicle_name: 'The little Subaru',
      driver: ids[2],
      distance: 63,
      efficiency: 12,
      price: 1.85,
      litres: 5.25,
      fuel_cents: 971,
      tolls_cents: 0,
      parking_cents: 0,
    }),
    make('e4', 'Rent contribution', 150000, ids[0], 'Rent', 'rent', addDays(today, 7)),
    make('e5', 'Kitchen essentials', 4250, ids[3], 'Household supplies'),
  ];
  const shares = expenses.flatMap((e, i) => {
    const people = i === 0 ? ids.slice(0, 3) : i === 2 ? ids.slice(0, 4) : ids;
    return people.map((user_id, j) => ({
      expense_id: e.id,
      user_id,
      amount_cents:
        Math.floor(e.amount_cents / people.length) + (j < e.amount_cents % people.length ? 1 : 0),
    }));
  });
  return {
    profile: {
      id: ids[0],
      email: 'alex@example.test',
      display_name: 'Alex Morgan',
      timezone: 'Australia/Sydney',
      email_verified_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    userId: ids[0],
    email: 'alex@example.test',
    household,
    households: [household],
    members,
    expenses,
    shares,
    repayments: [
      {
        id: 'r1',
        expense_id: 'e1',
        payer: ids[1],
        recipient: ids[0],
        amount_cents: 1500,
        status: 'confirmed',
        occurred_on: today,
        note: 'Sample partial repayment',
      },
    ],
    vehicles: [
      {
        id: 'v1',
        name: 'The little Subaru',
        model: 'Subaru Impreza',
        registration: 'SAMPLE',
        owner: ids[2],
        fuel_type: 'Unleaded 91',
        efficiency: 12,
        tank_litres: 60,
        notes: 'Shared weekend adventures.',
        active: true,
      },
    ],
    fuel: [
      {
        id: 'f1',
        vehicle_id: 'v1',
        price_per_litre: 1.85,
        fuel_type: 'Unleaded 91',
        observed_on: today,
      },
    ],
    tasks: [
      {
        id: 't1',
        title: 'A fresh start for the kitchen',
        description: 'Benches, sink, stovetop and floor.',
        frequency: 'weekly',
        rotation: ids,
        active: true,
        duration_minutes: 25,
        anchor_date: today,
      },
      {
        id: 't2',
        title: 'Bins out, good neighbour',
        description: 'Recycling and general waste.',
        frequency: 'weekly',
        rotation: ids,
        active: true,
        duration_minutes: 10,
        anchor_date: today,
      },
      {
        id: 't3',
        title: 'Bathroom reset',
        description: 'Shower, basin and mirror.',
        frequency: 'weekly',
        rotation: ids,
        active: true,
        duration_minutes: 30,
        anchor_date: today,
      },
    ],
    assignments: [
      {
        id: 'a1',
        task_id: 't1',
        assigned_to: ids[0],
        due_on: today,
        completed_at: null,
        completion_note: '',
      },
      {
        id: 'a2',
        task_id: 't2',
        assigned_to: ids[1],
        due_on: addDays(today, 1),
        completed_at: null,
        completion_note: '',
      },
      {
        id: 'a3',
        task_id: 't3',
        assigned_to: ids[2],
        due_on: addDays(today, -1),
        completed_at: null,
        completion_note: '',
      },
    ],
    notifications: [
      {
        id: 'n1',
        message: 'Your kitchen reset is due today.',
        href: '/app/cleaning?demo=1',
        created_at: new Date().toISOString(),
        read_at: null,
        essential: true,
      },
    ],
    rent: [
      {
        id: 'rc1',
        amount_cents: 150000,
        anchor_date: addDays(today, 7),
        interval_days: 14,
        collector: ids[0],
        reminder_days: 1,
        active: true,
      },
    ],
    documents: [],
    audit: [],
    preferences: { email_enabled: false, activity_enabled: true },
    demo: true,
    today,
  };
}
