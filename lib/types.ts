export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string;
  timezone: string;
  email_verified_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Member = {
  user_id: string;
  household_id: string;
  display_name: string;
  role: 'admin' | 'member';
  left_at: string | null;
};
export type Household = {
  id: string;
  name: string;
  description: string;
  timezone: string;
  currency: string;
};
export type Expense = {
  id: string;
  household_id: string;
  created_by: string;
  paid_by: string;
  description: string;
  category: string;
  amount_cents: number;
  occurred_on: string;
  due_on: string | null;
  kind: 'expense' | 'bill' | 'trip' | 'rent';
  split_method: 'equal' | 'amount' | 'percentage';
  notes: string;
  metadata: Record<string, string | number>;
  status: 'active' | 'void';
  external_paid: boolean;
  created_at: string;
};
export type Share = { expense_id: string; user_id: string; amount_cents: number };
export type Repayment = {
  id: string;
  expense_id: string;
  payer: string;
  recipient: string;
  amount_cents: number;
  status: 'pending' | 'confirmed' | 'rejected';
  occurred_on: string;
  note: string;
};
export type Vehicle = {
  id: string;
  name: string;
  model: string;
  registration: string;
  owner: string;
  fuel_type: string;
  efficiency: number;
  tank_litres: number;
  notes: string;
  active: boolean;
};
export type Fuel = {
  id: string;
  vehicle_id: string;
  price_per_litre: number;
  fuel_type: string;
  observed_on: string;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  frequency: string;
  rotation: string[];
  active: boolean;
  duration_minutes: number;
  anchor_date: string;
};
export type Assignment = {
  id: string;
  task_id: string;
  assigned_to: string;
  due_on: string;
  completed_at: string | null;
  completion_note: string;
};
export type Notice = {
  id: string;
  message: string;
  href: string;
  read_at: string | null;
  created_at: string;
  essential: boolean;
};
export type Rent = {
  id: string;
  amount_cents: number;
  anchor_date: string;
  interval_days: number;
  collector: string;
  reminder_days: number;
  active: boolean;
};
export type Document = {
  id: string;
  name: string;
  path: string;
  expense_id: string | null;
  repayment_id: string | null;
  assignment_id: string | null;
  fuel_price_id: string | null;
  url?: string;
};
export type Audit = {
  id: string;
  action: string;
  actor: string;
  created_at: string;
  record_id: string | null;
};
export type Snapshot = {
  profile: UserProfile;
  userId: string;
  email: string;
  household: Household;
  households: Household[];
  members: Member[];
  expenses: Expense[];
  shares: Share[];
  repayments: Repayment[];
  vehicles: Vehicle[];
  fuel: Fuel[];
  tasks: Task[];
  assignments: Assignment[];
  notifications: Notice[];
  rent: Rent[];
  documents: Document[];
  audit: Audit[];
  preferences: { email_enabled: boolean; activity_enabled: boolean };
  demo: boolean;
  today: string;
};
