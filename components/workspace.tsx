import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ReceiptText,
  CarFront,
  Sparkles,
  Leaf,
  Users,
  CalendarDays,
  Check,
  Clock3,
  Download,
  Wallet,
  House,
  Bell,
  ChevronRight,
  FileText,
  TrendingUp,
} from 'lucide-react';
import type { Snapshot, Expense } from '@/lib/types';
import { money, cents } from '@/lib/money';
import { dateLabel, nextDue } from '@/lib/dates';
import { obligations, totals, paymentStatus } from '@/lib/balances';
import { Sidebar } from './nav';
import { ActionForm, Modal } from './action-form';
import { ExpenseForm, Participants } from './expense-form';
import { Field, MemberSelect, Notes, Select } from './fields';
type Search = Record<string, string | string[] | undefined>;
const titles: Record<string, [string, string]> = {
  overview: ['A happy home starts here.', 'A little clarity for everything you share.'],
  expenses: [
    'Every little share, in one place.',
    'Record what you paid. Choose who it was for. We’ll do the maths.',
  ],
  balances: ['All square feels good.', 'A clear view of what you owe, and what comes back to you.'],
  bills: [
    'One less thing to remember.',
    'Keep shared bills and individual contributions together.',
  ],
  rent: [
    'Room for peace of mind.',
    'Your rent cycle, contributions and due dates, clearly laid out.',
  ],
  vehicles: [
    'The journey, shared fairly.',
    'Your household vehicles, fuel observations and trip costs.',
  ],
  cleaning: ['Many hands. A lighter home.', 'A simple rotation that keeps everyone in the loop.'],
  notifications: ['You’re in the loop.', 'Reminders and updates, just for you.'],
  settings: ['Make yourself at home.', 'Manage your household, housemates and preferences.'],
};
const name = (s: Snapshot, id: string) =>
  s.members.find((m) => m.user_id === id)?.display_name || 'Former member';
const href = (s: Snapshot, path: string) => `/app/${path}${s.demo ? '?demo=1' : ''}`;
const admin = (s: Snapshot) => s.members.find((m) => m.user_id === s.userId)?.role === 'admin';
function Avatar({ s, id }: { s: Snapshot; id: string }) {
  return (
    <span className={`avatar tone-${s.members.findIndex((m) => m.user_id === id) % 5}`}>
      {name(s, id)
        .split(' ')
        .map((x) => x[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
function Empty({
  text = 'Nothing here yet. Add your first record to get started.',
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Leaf size={24} />
      </span>
      <h3>A little breathing room.</h3>
      <p>{text}</p>
    </div>
  );
}
function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Status({ label }: { label: string }) {
  return (
    <Badge
      tone={
        label === 'Paid' || label === 'Completed'
          ? 'positive'
          : label.toLowerCase().includes('overdue')
            ? 'danger'
            : label === 'Due today' || label === 'Partially paid'
              ? 'amber'
              : 'neutral'
      }
    >
      {label}
    </Badge>
  );
}
function RecordButton({
  s,
  kind = 'expense',
  secondary = false,
}: {
  s: Snapshot;
  kind?: 'expense' | 'bill' | 'trip';
  secondary?: boolean;
}) {
  return (
    <Modal
      title={kind === 'trip' ? 'Record a trip' : kind === 'bill' ? 'Add a bill' : 'Add an expense'}
      trigger={kind === 'trip' ? 'Record trip' : kind === 'bill' ? 'Add bill' : 'Add expense'}
      secondary={secondary}
    >
      <ExpenseForm s={s} kind={kind} />
    </Modal>
  );
}
export function Workspace({
  s,
  section,
  search,
}: {
  s: Snapshot;
  section: string;
  search: Search;
}) {
  const [title, subtitle] = titles[section] || titles.overview;
  return (
    <div className="app-shell">
      <Sidebar s={s} section={section} />
      <main className="workspace">
        <header className="workspace-top">
          <div className="breadcrumb">
            <span>{s.household.name}</span>
            <ChevronRight size={13} />
            <strong>
              {section === 'overview'
                ? 'Overview'
                : section.charAt(0).toUpperCase() + section.slice(1)}
            </strong>
          </div>
          <div className="top-meta">
            <span>
              <CalendarDays size={14} />
              {dateLabel(s.today)}
            </span>
            <Link
              aria-label="Notifications"
              href={href(s, 'notifications')}
              className="icon-button"
            >
              <Bell size={18} />
              {s.notifications.some((n) => !n.read_at) && <i className="notification-dot" />}
            </Link>
          </div>
        </header>
        {s.demo && (
          <div className="demo-banner">
            <span>
              <strong>Sample household</strong> · Read-only preview. These are fictional records.
            </span>
            <Link href="/login?mode=signup">
              Create your real household <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <div className="page-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {section === 'overview'
                  ? `HELLO, ${name(s, s.userId).split(' ')[0].toUpperCase()}`
                  : 'YOUR SHARED HOME'}
              </span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {['overview', 'expenses'].includes(section) ? (
              <RecordButton s={s} />
            ) : section === 'bills' ? (
              <RecordButton s={s} kind="bill" />
            ) : section === 'vehicles' ? (
              <RecordButton s={s} kind="trip" />
            ) : null}
          </div>
          {section === 'overview' ? (
            <Overview s={s} />
          ) : section === 'expenses' ? (
            <Transactions s={s} search={search} />
          ) : section === 'balances' ? (
            <Balances s={s} />
          ) : section === 'bills' ? (
            <Bills s={s} />
          ) : section === 'rent' ? (
            <Rent s={s} />
          ) : section === 'vehicles' ? (
            <Vehicles s={s} search={search} />
          ) : section === 'cleaning' ? (
            <Cleaning s={s} />
          ) : section === 'notifications' ? (
            <Notifications s={s} />
          ) : (
            <Settings s={s} />
          )}
          <footer className="workspace-footer">
            <span>
              <Leaf size={13} /> A little fairer. A lot easier.
            </span>
            <span>
              {s.household.timezone} · AUD{' '}
              <Link href="/support">
                Help & support <ArrowUpRight size={12} />
              </Link>
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function Overview({ s }: { s: Snapshot }) {
  const total = totals(s.userId, s.expenses, s.shares, s.repayments);
  const myRent = s.shares
    .filter(
      (p) =>
        p.user_id === s.userId &&
        s.expenses.some(
          (e) =>
            e.id === p.expense_id &&
            e.kind === 'rent' &&
            e.status === 'active' &&
            e.due_on! >= s.today,
        ),
    )
    .sort((a, b) =>
      s.expenses
        .find((e) => e.id === a.expense_id)!
        .due_on!.localeCompare(s.expenses.find((e) => e.id === b.expense_id)!.due_on!),
    )[0];
  const debt = obligations(s.expenses, s.shares, s.repayments);
  const upcoming = s.expenses
    .filter(
      (e) =>
        ['rent', 'bill'].includes(e.kind) &&
        e.status === 'active' &&
        ((!e.external_paid && (admin(s) || e.paid_by === s.userId)) ||
          debt.some(
            (r) =>
              r.expense.id === e.id &&
              r.remaining > 0 &&
              (admin(s) || r.debtor === s.userId || r.creditor === s.userId),
          )),
    )
    .sort((a, b) => (a.due_on || '').localeCompare(b.due_on || ''));
  const chores = s.assignments.filter((a) => !a.completed_at).slice(0, 3);
  const recorded = s.expenses.filter((e) => e.status === 'active' && e.kind !== 'rent');
  const spent = recorded.reduce((n, e) => n + e.amount_cents, 0);
  const byCategory = Array.from(new Set(recorded.map((e) => e.category)))
    .map((c) => ({
      category: c,
      amount: recorded.filter((e) => e.category === c).reduce((n, e) => n + e.amount_cents, 0),
    }))
    .sort((a, b) => b.amount - a.amount);
  const categories =
    byCategory.length > 4
      ? [
          ...byCategory.slice(0, 3),
          {
            category: 'Other categories',
            amount: byCategory.slice(3).reduce((n, c) => n + c.amount, 0),
          },
        ]
      : byCategory;
  return (
    <>
      <div className="summary-grid">
        <div className="summary-card feature">
          <div className="summary-label">
            You’re owed <ArrowDownLeft size={18} />
          </div>
          <strong className="big-amount">{money(total.owedToYou)}</strong>
          <span>Includes generated rent and bills</span>
          <Link href={href(s, 'balances')}>
            See your balances <ArrowUpRight size={15} />
          </Link>
          <div className="decor-ring" />
        </div>
        <div className="summary-card">
          <div className="summary-label">
            You owe <ArrowUpRight size={18} />
          </div>
          <strong className="big-amount">{money(total.owed)}</strong>
          <span>Confirmed repayments included</span>
          <Link href={href(s, 'balances')}>
            View what’s outstanding <ArrowRight size={14} />
          </Link>
        </div>
        <div className="summary-card">
          <div className="summary-label">
            Your next rent <House size={18} />
          </div>
          <strong className="big-amount">{money(myRent?.amount_cents || 0)}</strong>
          <span>
            {myRent
              ? 'Due ' + dateLabel(s.expenses.find((e) => e.id === myRent.expense_id)!.due_on!)
              : 'No upcoming rent configured'}
          </span>
          <Link href={href(s, 'rent')}>
            View rent schedule <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <div className="overview-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent expenses</h2>
              <p>The little things that keep home running.</p>
            </div>
            <Link className="text-link" href={href(s, 'expenses')}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recorded.length ? (
            <div className="transaction-list">
              {recorded.slice(0, 4).map((e) => (
                <ExpenseRow s={s} e={e} key={e.id} compact />
              ))}
            </div>
          ) : (
            <Empty text="Add your first shared expense. Your balances will appear here." />
          )}
          <div className="panel-bottom">
            <span>
              <Users size={15} />
              {s.members.filter((m) => !m.left_at).length} housemates sharing the load
            </span>
            <Link href={href(s, 'settings')}>
              Manage household <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Coming up at home</h2>
              <p>A heads-up for your week.</p>
            </div>
            <CalendarDays size={19} />
          </div>
          <div className="upcoming-list">
            {upcoming.slice(0, 3).map((e) => (
              <Link
                key={e.id}
                href={href(s, e.kind === 'rent' ? 'rent' : 'bills')}
                className="upcoming-item"
              >
                <span className="date-box">
                  <strong>{e.due_on?.slice(8)}</strong>
                  <small>
                    {new Date(e.due_on + 'T12:00:00Z').toLocaleDateString('en-AU', {
                      month: 'short',
                    })}
                  </small>
                </span>
                <div>
                  <strong>{e.description}</strong>
                  <small>
                    {e.kind === 'rent' ? 'Household rent' : 'Shared bill'} · {dateLabel(e.due_on!)}
                  </small>
                </div>
                <span className="amount">{money(e.amount_cents)}</span>
              </Link>
            ))}
            {!upcoming.length && <Empty text="No bills or rent due yet." />}
          </div>
          <Link className="subtle-link" href={href(s, 'bills')}>
            Keep on top of shared bills <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      <div className="overview-columns lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>A little home care</h2>
              <p>Small jobs. A nicer place to live.</p>
            </div>
            <Link className="text-link" href={href(s, 'cleaning')}>
              Schedule <ArrowRight size={14} />
            </Link>
          </div>
          {chores.map((a) => (
            <div className="chore-row" key={a.id}>
              <span className="chore-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <strong>{s.tasks.find((t) => t.id === a.task_id)?.title}</strong>
                <small>
                  {name(s, a.assigned_to).split(' ')[0]} ·{' '}
                  {a.due_on === s.today ? 'Today' : dateLabel(a.due_on)}
                </small>
              </div>
              <Status
                label={
                  a.due_on < s.today ? 'Overdue' : a.due_on === s.today ? 'Due today' : 'Upcoming'
                }
              />
            </div>
          ))}
          {!chores.length && <Empty text="Your household has a clear schedule." />}
        </section>
        <section className="panel spending-panel">
          <div className="panel-heading">
            <div>
              <h2>Where it all goes</h2>
              <p>Visible shared costs · excluding rent</p>
            </div>
            <TrendingUp size={19} />
          </div>
          <div className="spending-total">
            {money(spent)}
            <span>total recorded</span>
          </div>
          <div
            className="spending-bar"
            role="img"
            aria-label={categories.map((c) => `${c.category}: ${money(c.amount)}`).join(', ')}
          >
            {categories.map((c, i) => (
              <span
                key={c.category}
                className={`segment seg-${i}`}
                style={{ width: `${spent ? (c.amount / spent) * 100 : 0}%` }}
              />
            ))}
          </div>
          <div className="spending-legend">
            {categories.map((c, i) => (
              <div key={c.category}>
                <span>
                  <i className={`legend-dot seg-${i}`} />
                  {c.category}
                </span>
                <strong>{money(c.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="quick-strip">
        <div>
          <span className="quick-icon">
            <Leaf size={22} />
          </span>
          <span>
            <strong>Life happens. Keep it shared.</strong>
            <small>All the everyday essentials, right here.</small>
          </span>
        </div>
        <div className="quick-links">
          <Link href={href(s, 'bills')}>
            <ReceiptText size={16} />
            Bills
          </Link>
          <Link href={href(s, 'vehicles')}>
            <CarFront size={16} />
            Record a trip
          </Link>
          <Link href={href(s, 'balances')}>
            <Wallet size={16} />
            Repayments
          </Link>
        </div>
      </div>
    </>
  );
}
function Upload({ s, id, target = 'expense_id' }: { s: Snapshot; id: string; target?: string }) {
  return (
    <details className="upload">
      <summary>
        <FileText size={14} />
        Attach document or photo
      </summary>
      <ActionForm
        intent="upload"
        householdId={s.household.id}
        demo={s.demo}
        label="Upload securely"
      >
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="record_id" value={id} />
        <label className="field">
          <span>PDF, JPEG, PNG or WebP · up to 5 MB</span>
          <input
            type="file"
            name="document"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            required
          />
        </label>
        <p className="small muted">
          Stored privately. Authorised members can open a short-lived download link.
        </p>
      </ActionForm>
    </details>
  );
}
function Documents({ s, id }: { s: Snapshot; id: string }) {
  return (
    <div className="document-links">
      {s.documents
        .filter((d) =>
          [d.expense_id, d.repayment_id, d.fuel_price_id, d.assignment_id].includes(id),
        )
        .map((d) =>
          d.url ? (
            <a key={d.id} href={d.url} rel="noopener noreferrer" target="_blank">
              <FileText size={14} />
              {d.name} <ArrowUpRight size={12} />
            </a>
          ) : (
            <span key={d.id} className="muted small">
              {d.name}: file unavailable; refresh to retry.
            </span>
          ),
        )}
    </div>
  );
}
function ExpenseRow({ s, e, compact = false }: { s: Snapshot; e: Expense; compact?: boolean }) {
  const Icon = e.kind === 'trip' ? CarFront : e.kind === 'rent' ? House : ReceiptText;
  const my = s.shares.find((p) => p.expense_id === e.id && p.user_id === s.userId);
  const rows = obligations([e], s.shares, s.repayments);
  const visibleRows =
    admin(s) || e.paid_by === s.userId ? rows : rows.filter((r) => r.debtor === s.userId);
  const remaining = visibleRows.reduce((n, r) => n + r.remaining, 0),
    original = visibleRows.reduce((n, r) => n + r.share, 0);
  const manageable = admin(s) || e.created_by === s.userId || e.paid_by === s.userId;
  return (
    <details className={`expense-detail ${compact ? 'compact' : ''}`}>
      <summary className="transaction-row">
        <span className={`transaction-icon ${e.kind}`}>
          <Icon size={19} />
        </span>
        <div className="transaction-name">
          <strong>{e.description}</strong>
          <small>
            {e.category} <span>·</span> {name(s, e.paid_by).split(' ')[0]}{' '}
            {e.metadata.adjusts
              ? 'is owed'
              : e.kind === 'bill' || e.kind === 'rent'
                ? 'collects'
                : 'paid'}{' '}
            <span>·</span> {dateLabel(e.occurred_on)}
          </small>
        </div>
        <div className="transaction-amount">
          <strong>{money(e.amount_cents)}</strong>
          <small>
            {e.status === 'void'
              ? 'Voided'
              : my
                ? 'Your share ' + money(my.amount_cents)
                : 'You paid'}
          </small>
        </div>
        <ChevronRight size={14} className="detail-chevron" />
      </summary>
      <div className="expense-body">
        <div className="detail-meta">
          <Badge>
            {e.split_method === 'equal'
              ? 'Equal split'
              : e.split_method === 'percentage'
                ? 'Percentage split'
                : 'Custom amounts'}
          </Badge>
          {e.status === 'void' ? (
            <Badge>Voided</Badge>
          ) : (
            <Status label={paymentStatus(e.due_on, s.today, remaining, original)} />
          )}
        </div>
        {e.notes && <p>{e.notes}</p>}
        {e.due_on && (
          <p className="small">
            Due {dateLabel(e.due_on)}
            {e.metadata.provider && <> · Provider: {e.metadata.provider}</>}
          </p>
        )}
        {e.kind === 'trip' && (
          <div className="calculation">
            {e.metadata.distance} km ÷ {e.metadata.efficiency} km/L ={' '}
            {Number(e.metadata.litres).toFixed(3)} L estimated
            <br />
            {Number(e.metadata.litres).toFixed(3)} L × ${Number(e.metadata.price).toFixed(4)}/L ={' '}
            <strong>{money(Number(e.metadata.fuel_cents))}</strong> fuel
            <br />
            Tolls {money(Number(e.metadata.tolls_cents))} + parking{' '}
            {money(Number(e.metadata.parking_cents))}
            <p className="small">
              Vehicle: {e.metadata.vehicle_name} · Driver: {name(s, String(e.metadata.driver))}.
              Values are fixed snapshots from the time of recording.
            </p>
          </div>
        )}
        <div className="share-table">
          <div className="share-table-head">
            <span>Beneficiary</span>
            <span>Share</span>
            <span>Remaining</span>
          </div>
          {s.shares
            .filter((p) => p.expense_id === e.id)
            .map((p) => (
              <div key={p.user_id}>
                <span>
                  {name(s, p.user_id)}
                  {p.user_id === e.paid_by && <small> · own share</small>}
                </span>
                <strong>{money(p.amount_cents)}</strong>
                <span>
                  {p.user_id === e.paid_by
                    ? '—'
                    : !admin(s) && e.paid_by !== s.userId && p.user_id !== s.userId
                      ? 'Private'
                      : money(
                          e.status === 'void'
                            ? 0
                            : rows.find((r) => r.debtor === p.user_id)?.remaining || 0,
                        )}
                </span>
              </div>
            ))}
        </div>
        <p className="small muted">
          Original shares total {money(e.amount_cents)}. Status reflects contributions visible to
          you. Remaining = original share − confirmed repayments. The payer’s own share creates no
          debt.
        </p>
        {e.metadata.corrects && (
          <p className="small muted">Corrects an earlier entry. The original remains in history.</p>
        )}
        {e.metadata.adjusts && (
          <p className="small muted">
            Agreed adjustment to an earlier record; no payment is implied.
          </p>
        )}
        <Documents s={s} id={e.id} />
        {manageable && (
          <>
            <Upload s={s} id={e.id} />
            {e.status === 'active' &&
              ['expense', 'bill'].includes(e.kind) &&
              !s.repayments.some((r) => r.expense_id === e.id && r.status !== 'rejected') && (
                <Modal title="Correct this record" secondary>
                  <p className="small muted">
                    The original is retained as void and a replacement is recorded atomically.
                    Attachments stay with the original.
                  </p>
                  <ExpenseForm s={s} kind={e.kind as 'expense' | 'bill'} initial={e} />
                </Modal>
              )}
            {admin(s) && (
              <Modal title="Record an agreed adjustment" secondary>
                <ActionForm
                  intent="adjustment"
                  householdId={s.household.id}
                  demo={s.demo}
                  label="Record separate adjustment"
                >
                  <input type="hidden" name="expense_id" value={e.id} />
                  <MemberSelect
                    members={s.members}
                    name="creditor"
                    label="Who is owed the adjustment?"
                  />
                  <MemberSelect
                    members={s.members}
                    name="debtor"
                    label="Who owes the adjustment?"
                  />
                  <Field name="amount" label="Adjustment amount (AUD)" />
                  <Field name="reason" label="Agreed reason" />
                  <Field name="occurred_on" label="Agreement date" type="date" value={s.today} />
                  <p className="small muted">
                    Use only an adjustment agreed with the members involved. This adds a separate
                    obligation linked to the original. It does not move money, cancel the original
                    debt or alter repayments.
                  </p>
                </ActionForm>
              </Modal>
            )}
            {e.status === 'active' && (
              <ActionForm
                intent="void"
                householdId={s.household.id}
                demo={s.demo}
                label="Void this record"
                className="inline-form danger-form"
                confirm="Void this record? It stays in history. Pending or confirmed repayments prevent voiding."
              >
                <input type="hidden" name="expense_id" value={e.id} />
              </ActionForm>
            )}
          </>
        )}
      </div>
    </details>
  );
}
function Transactions({ s, search }: { s: Snapshot; search: Search }) {
  const str = (k: string) => String(search[k] || '');
  let min = 0,
    max = Infinity;
  try {
    if (str('min')) min = cents(str('min'));
    if (str('max')) max = cents(str('max'));
  } catch {
    min = Infinity;
  }
  const rows = s.expenses.filter(
    (e) =>
      (!str('q') || e.description.toLowerCase().includes(str('q').toLowerCase())) &&
      (!str('category') || e.category === str('category')) &&
      (!str('kind') || e.kind === str('kind')) &&
      (!str('paid_by') || e.paid_by === str('paid_by')) &&
      (!str('beneficiary') ||
        s.shares.some((p) => p.expense_id === e.id && p.user_id === str('beneficiary'))) &&
      (!str('start') || e.occurred_on >= str('start')) &&
      (!str('end') || e.occurred_on <= str('end')) &&
      e.amount_cents >= min &&
      e.amount_cents <= max &&
      (!str('status') || e.status === str('status')),
  );
  return (
    <>
      <section className="panel filters">
        <form method="get">
          {s.demo && <input type="hidden" name="demo" value="1" />}
          <div className="filter-main">
            <label className="field">
              <span>Search transactions</span>
              <input name="q" placeholder="Search by description…" defaultValue={str('q')} />
            </label>
            <Select label="Category" name="category" value={str('category')}>
              <option value="">All categories</option>
              {Array.from(new Set(s.expenses.map((e) => e.category)))
                .sort()
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </Select>
            <Select label="Type" name="kind" value={str('kind')}>
              <option value="">All types</option>
              {['expense', 'bill', 'trip', 'rent'].map((t) => (
                <option value={t} key={t}>
                  {t}
                </option>
              ))}
            </Select>
            <button className="button secondary">Apply filters</button>
          </div>
          <details>
            <summary>More filters</summary>
            <div className="form-grid">
              <Select label="Paid by / collector" name="paid_by" value={str('paid_by')}>
                <option value="">Anyone</option>
                {s.members.map((m) => (
                  <option value={m.user_id} key={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </Select>
              <Select label="Beneficiary" name="beneficiary" value={str('beneficiary')}>
                <option value="">Anyone</option>
                {s.members.map((m) => (
                  <option value={m.user_id} key={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </Select>
              <Field
                label="From date"
                name="start"
                type="date"
                required={false}
                value={str('start')}
              />
              <Field label="To date" name="end" type="date" required={false} value={str('end')} />
              <Field label="Minimum AUD" name="min" required={false} value={str('min')} />
              <Field label="Maximum AUD" name="max" required={false} value={str('max')} />
              <Select label="Record status" name="status" value={str('status')}>
                <option value="">All records</option>
                <option value="active">Active</option>
                <option value="void">Voided</option>
              </Select>
            </div>
          </details>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Transaction history</h2>
            <p>{rows.length} visible records · open a row for the calculation</p>
          </div>
          {!s.demo && (
            <a href="/api/export" className="button secondary small-button">
              <Download size={15} />
              Export all CSV
            </a>
          )}
        </div>
        {rows.length ? (
          rows.map((e) => <ExpenseRow s={s} e={e} key={e.id} />)
        ) : (
          <Empty text="No transactions match these filters." />
        )}
      </section>
    </>
  );
}
function Balances({ s }: { s: Snapshot }) {
  const debt = obligations(s.expenses, s.shares, s.repayments),
    total = totals(s.userId, s.expenses, s.shares, s.repayments);
  const mine = debt.filter(
    (r) => r.remaining > 0 && (r.debtor === s.userId || r.creditor === s.userId || admin(s)),
  );
  const payable = debt.filter((r) => r.debtor === s.userId && r.remaining - r.pending > 0);
  return (
    <>
      <div className="balance-intro">
        <div>
          <span>You owe</span>
          <strong>{money(total.owed)}</strong>
        </div>
        <span className="balance-divider" />
        <div>
          <span>You’re owed</span>
          <strong>{money(total.owedToYou)}</strong>
        </div>
        <p>
          Derived from original shares and confirmed repayments.
          <br />
          Pending payments keep their outstanding balance.
        </p>
      </div>
      <div className="section-toolbar">
        <h2>Outstanding contributions</h2>
        {payable.length > 0 && (
          <Modal title="Record a repayment">
            <ActionForm
              intent="repayment"
              householdId={s.household.id}
              demo={s.demo}
              label="Record pending repayment"
            >
              <Select name="expense_id" label="Obligation">
                {payable.map((r) => (
                  <option key={r.expense.id} value={r.expense.id}>
                    {r.expense.description} · to {name(s, r.creditor)} ·{' '}
                    {money(r.remaining - r.pending)} available
                  </option>
                ))}
              </Select>
              <Field name="amount" label="Repayment amount (AUD)" />
              <Field name="occurred_on" label="Date paid" type="date" value={s.today} />
              <Notes name="note" />
              <p className="small muted">
                Record a transfer you made outside Fairshare. This does not move money. The
                recipient confirms receipt.
              </p>
            </ActionForm>
          </Modal>
        )}
      </div>
      <section className="panel">
        {mine.length ? (
          mine.map((r) => (
            <div className="obligation-row" key={r.expense.id + r.debtor}>
              <Avatar s={s} id={r.debtor} />
              <div>
                <strong>
                  {name(s, r.debtor)} <ArrowRight size={13} /> {name(s, r.creditor)}
                </strong>
                <small>
                  {r.expense.description} · Original {money(r.share)} · Confirmed{' '}
                  {money(r.confirmed)}
                  {r.pending > 0 && <> · Pending {money(r.pending)}</>}
                </small>
              </div>
              <strong>{money(r.remaining)}</strong>
            </div>
          ))
        ) : (
          <Empty text="No outstanding contributions in your view. Lovely." />
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recorded repayments</h2>
            <p>Only a recipient’s confirmation reduces an obligation.</p>
          </div>
        </div>
        {s.repayments.length ? (
          s.repayments.map((r) => (
            <div className="repayment-card" key={r.id}>
              <div className="obligation-row">
                <Avatar s={s} id={r.payer} />
                <div>
                  <strong>
                    {name(s, r.payer)} → {name(s, r.recipient)}
                  </strong>
                  <small>
                    {s.expenses.find((e) => e.id === r.expense_id)?.description} ·{' '}
                    {dateLabel(r.occurred_on)}
                  </small>
                </div>
                <strong>{money(r.amount_cents)}</strong>
                <Badge
                  tone={
                    r.status === 'confirmed'
                      ? 'positive'
                      : r.status === 'pending'
                        ? 'amber'
                        : 'neutral'
                  }
                >
                  {r.status}
                </Badge>
              </div>
              {r.note && <p className="small muted">{r.note}</p>}
              {r.status === 'pending' && r.recipient === s.userId && (
                <div className="button-row">
                  {[true, false].map((approve) => (
                    <ActionForm
                      key={String(approve)}
                      intent="review"
                      householdId={s.household.id}
                      demo={s.demo}
                      label={approve ? 'Confirm received' : 'Reject'}
                      confirm={
                        approve ? 'Confirm you received this money outside Fairshare?' : undefined
                      }
                    >
                      <input type="hidden" name="repayment_id" value={r.id} />
                      <input type="hidden" name="approve" value={String(approve)} />
                    </ActionForm>
                  ))}
                </div>
              )}
              <Documents s={s} id={r.id} />
              {r.payer === s.userId && <Upload s={s} id={r.id} target="repayment_id" />}
            </div>
          ))
        ) : (
          <Empty text="Repayments will appear here when a member records one." />
        )}
      </section>
    </>
  );
}
function Bills({ s }: { s: Snapshot }) {
  const bills = s.expenses.filter((e) => e.kind === 'bill');
  return (
    <>
      <div className="info-note">
        <ReceiptText size={20} />
        <p>
          Contributions and provider payments are tracked separately. A settled household
          contribution does not mean the electricity company has been paid.
        </p>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Household bills</h2>
            <p>Open a bill to review responsible members and documents.</p>
          </div>
        </div>
        {bills.length ? (
          bills.map((e) => (
            <div key={e.id}>
              <ExpenseRow s={s} e={e} />
              <ExternalPaid s={s} e={e} />
            </div>
          ))
        ) : (
          <Empty text="Record a bill when it arrives, then attach its document." />
        )}
      </section>
    </>
  );
}
function ExternalPaid({ s, e }: { s: Snapshot; e: Expense }) {
  return (
    <div className="external-paid">
      <span className="small">
        Provider / landlord payment:{' '}
        <strong>{e.external_paid ? 'Reported paid' : 'Not yet reported paid'}</strong>
      </span>
      {admin(s) && e.status === 'active' && (
        <ActionForm
          intent="household"
          householdId={s.household.id}
          demo={s.demo}
          label={e.external_paid ? 'Undo payment report' : 'Report paid externally'}
          confirm="This records your report only. Fairshare does not transfer money."
        >
          <input type="hidden" name="action" value="external_paid" />
          <input type="hidden" name="expense_id" value={e.id} />
          <input type="hidden" name="paid" value={String(!e.external_paid)} />
        </ActionForm>
      )}
    </div>
  );
}
function Rent({ s }: { s: Snapshot }) {
  const config = s.rent.find((c) => c.active),
    rent = s.expenses
      .filter((e) => e.kind === 'rent')
      .sort((a, b) => (a.due_on || '').localeCompare(b.due_on || ''));
  return (
    <>
      <div className="rent-banner">
        <span className="rent-house">
          <House size={36} />
        </span>
        <div>
          <span className="eyebrow">YOUR RENT RHYTHM</span>
          <h2>
            {config
              ? `${money(config.amount_cents)} every ${config.interval_days} days`
              : 'Give rent a routine.'}
          </h2>
          <p>
            {config
              ? `Next cycle ${dateLabel(nextDue(config.anchor_date, s.today, config.interval_days))} · collected by ${name(s, config.collector)}`
              : 'Set the anchor date and agree each housemate’s contribution.'}
          </p>
        </div>
        {admin(s) && (
          <Modal title="Configure rent" trigger={config ? 'Update rent' : 'Set up rent'}>
            <ActionForm
              intent="rent"
              householdId={s.household.id}
              demo={s.demo}
              label="Save rent schedule"
            >
              <Field name="amount" label="Total household rent (AUD)" />
              <div className="form-grid">
                <Field
                  name="anchor_date"
                  label="Next due date (cycle anchor)"
                  type="date"
                  value={s.today}
                  min={s.today}
                />
                <Select name="interval_days" label="Payment frequency" value="14">
                  <option value="7">Weekly · every 7 days</option>
                  <option value="14">Fortnightly · every 14 days</option>
                  <option value="28">Every 28 days</option>
                </Select>
              </div>
              <MemberSelect
                members={s.members}
                value={s.userId}
                label="Pays landlord / collects contributions"
              />
              <Field
                name="reminder_days"
                label="Remind days before due"
                type="number"
                min="1"
                max="14"
                value={1}
              />
              <Participants s={s} />
              <p className="small muted">
                A Thursday anchor with a one-day reminder gives Wednesday and Thursday notifications
                every fortnight. Changes retain past and settled cycles. Unpaid future cycles on or
                after this new anchor are voided and replaced, with an audit trail. Choose an anchor
                after any pending or settled future cycle.
              </p>
            </ActionForm>
          </Modal>
        )}
      </div>
      <div className="info-note">
        <CalendarDays size={20} />
        <p>
          Dates stay anchored to the configured cycle in {s.household.timezone}. Reminders appear
          before, on and once after the due date. Scheduler setup is required for delivery while
          nobody is using the app.
        </p>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Rent contributions</h2>
            <p>Amounts are obligations to your nominated collector, not automatic transfers.</p>
          </div>
        </div>
        {rent.length ? (
          rent.map((e) => (
            <div key={e.id}>
              <ExpenseRow s={s} e={e} />
              <ExternalPaid s={s} e={e} />
            </div>
          ))
        ) : (
          <Empty text="Your administrator can configure the household’s rent schedule." />
        )}
      </section>
    </>
  );
}
function Vehicles({ s, search }: { s: Snapshot; search: Search }) {
  const trips = s.expenses.filter(
    (e) =>
      e.kind === 'trip' &&
      (!search.vehicle || e.metadata.vehicle_id === search.vehicle) &&
      (!search.member ||
        s.shares.some((p) => p.expense_id === e.id && p.user_id === search.member)) &&
      (!search.start || e.occurred_on >= String(search.start)) &&
      (!search.end || e.occurred_on <= String(search.end)),
  );
  return (
    <>
      <div className="section-toolbar">
        <h2>Household garage</h2>
        {admin(s) && (
          <Modal title="Register a vehicle" trigger="Add vehicle" secondary>
            <VehicleForm s={s} />
          </Modal>
        )}
      </div>
      <div className="vehicle-grid">
        {s.vehicles.map((v) => (
          <section className="panel vehicle-card" key={v.id}>
            <div className="vehicle-art">
              <CarFront size={64} strokeWidth={1.25} />
              <Badge tone={v.active ? 'positive' : 'neutral'}>
                {v.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="vehicle-info">
              <span className="eyebrow">{v.fuel_type}</span>
              <h2>{v.name}</h2>
              <p>
                {v.model} · Owned by {name(s, v.owner)}
              </p>
              <div className="vehicle-specs">
                <div>
                  <strong>
                    {v.efficiency}
                    <small> km/L</small>
                  </strong>
                  <span>Average efficiency</span>
                </div>
                <div>
                  <strong>
                    {v.tank_litres}
                    <small> L</small>
                  </strong>
                  <span>Tank capacity</span>
                </div>
                <div>
                  <strong>
                    {Math.round(v.efficiency * v.tank_litres)}
                    <small> km</small>
                  </strong>
                  <span>Estimated range</span>
                </div>
              </div>
              <p className="small muted">
                Registration: {v.registration || 'Not provided'}. Range and trip fuel use are
                estimates.
              </p>
              <div className="button-row">
                <Modal title="Record fuel price" secondary>
                  <ActionForm
                    intent="fuel"
                    householdId={s.household.id}
                    demo={s.demo}
                    label="Save observation"
                  >
                    <input type="hidden" name="vehicle_id" value={v.id} />
                    <input type="hidden" name="fuel_type" value={v.fuel_type} />
                    <Field name="price" label="Price per litre (AUD/L)" placeholder="1.85" />
                    <Field name="observed_on" label="Date observed" type="date" value={s.today} />
                    <p className="small muted">
                      Historical observations are retained. Photos can be attached after saving.
                      Observations are not independently verified.
                    </p>
                  </ActionForm>
                </Modal>
                {(admin(s) || v.owner === s.userId) && (
                  <Modal title="Update vehicle" secondary>
                    <VehicleForm s={s} vehicleId={v.id} />
                  </Modal>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
      {!s.vehicles.length && (
        <section className="panel">
          <Empty text="Your administrator can register a vehicle. You don’t need one to use Fairshare." />
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Fuel-price observations</h2>
            <p>Historical prices are never substituted into an old trip.</p>
          </div>
        </div>
        {s.fuel.length ? (
          s.fuel.map((f) => (
            <details className="fuel-detail" key={f.id}>
              <summary>
                <span>
                  {s.vehicles.find((v) => v.id === f.vehicle_id)?.name} · {f.fuel_type}
                </span>
                <strong>${Number(f.price_per_litre).toFixed(3)}/L</strong>
                <small>{dateLabel(f.observed_on)}</small>
              </summary>
              <Documents s={s} id={f.id} />
              <Upload s={s} id={f.id} target="fuel_price_id" />
            </details>
          ))
        ) : (
          <Empty text="Record a price observation, or use an agreed price when adding a trip." />
        )}
      </section>
      <section className="panel filters">
        <form method="get">
          {s.demo && <input type="hidden" name="demo" value="1" />}
          <div className="form-grid">
            <Select label="Vehicle" name="vehicle" value={String(search.vehicle || '')}>
              <option value="">All vehicles</option>
              {s.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
            <Select label="Participant" name="member" value={String(search.member || '')}>
              <option value="">All members</option>
              {s.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </Select>
            <Field
              name="start"
              label="From date"
              type="date"
              value={String(search.start || '')}
              required={false}
            />
            <Field
              name="end"
              label="To date"
              type="date"
              value={String(search.end || '')}
              required={false}
            />
          </div>
          <button className="button secondary">Filter trips</button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Trips together</h2>
            <p>Open a trip to see its fuel calculation and participant shares.</p>
          </div>
        </div>
        {trips.length ? (
          trips.map((e) => <ExpenseRow s={s} e={e} key={e.id} />)
        ) : (
          <Empty text="No trips match this view. Record your next shared journey." />
        )}
      </section>
    </>
  );
}
function VehicleForm({ s, vehicleId }: { s: Snapshot; vehicleId?: string }) {
  const v = s.vehicles.find((v) => v.id === vehicleId);
  return (
    <ActionForm
      intent="vehicle"
      householdId={s.household.id}
      demo={s.demo}
      label={v ? 'Update vehicle' : 'Register vehicle'}
    >
      {v && <input type="hidden" name="vehicle_id" value={v.id} />}
      <Field name="name" label="Display name" value={v?.name} />
      <Field name="model" label="Make and model" value={v?.model} required={false} />
      <Field name="registration" label="Registration" value={v?.registration} required={false} />
      <MemberSelect
        members={s.members}
        label="Vehicle owner"
        name="owner"
        value={v?.owner || s.userId}
      />
      <Select name="fuel_type" label="Fuel type" value={v?.fuel_type || 'Unleaded 91'}>
        {['Unleaded 91', 'Premium 95', 'Premium 98', 'Diesel', 'LPG'].map((f) => (
          <option key={f}>{f}</option>
        ))}
      </Select>
      <div className="form-grid">
        <Field
          name="efficiency"
          label="Average efficiency (km/L)"
          value={v?.efficiency}
          placeholder="12"
        />
        <Field
          name="tank_litres"
          label="Tank capacity (L)"
          value={v?.tank_litres}
          placeholder="60"
        />
      </div>
      {v && (
        <Select name="active" label="Status" value={String(v.active)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      )}
      <Notes />
    </ActionForm>
  );
}
function Cleaning({ s }: { s: Snapshot }) {
  const complete = s.assignments.filter((a) => a.completed_at).length,
    upcoming = s.assignments.filter((a) => !a.completed_at);
  return (
    <>
      <div className="section-toolbar">
        <div className="button-row">
          <Badge tone="positive">{complete} completed</Badge>
          <Badge>{upcoming.length} upcoming / outstanding</Badge>
        </div>
        {admin(s) && (
          <Modal title="Create cleaning rotation" trigger="Add a task">
            <ActionForm
              intent="cleaning"
              householdId={s.household.id}
              demo={s.demo}
              label="Create rotation"
            >
              <Field name="title" label="Task title" placeholder="Kitchen reset" />
              <Notes name="description" label="What needs doing?" />
              <div className="form-grid">
                <Select name="frequency" label="Repeat" value="weekly">
                  {['daily', 'weekly', 'fortnightly', 'monthly'].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
                <Field name="anchor_date" label="First due date" type="date" value={s.today} />
              </div>
              <Field name="duration_minutes" label="Estimated minutes" type="number" value={20} />
              <fieldset className="rotation-picker">
                <legend>Rotate through selected members</legend>
                {s.members
                  .filter((m) => !m.left_at)
                  .map((m) => (
                    <label className="check" key={m.user_id}>
                      <input type="checkbox" name="participants" value={m.user_id} defaultChecked />
                      {m.display_name}
                    </label>
                  ))}
              </fieldset>
              <p className="small muted">
                Rotation follows the order shown and supports any household size. Existing generated
                assignments stay in history.
              </p>
            </ActionForm>
          </Modal>
        )}
      </div>
      <div className="cleaning-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>The home-care schedule</h2>
              <p>Upcoming jobs and completion history.</p>
            </div>
          </div>
          {s.assignments.length ? (
            s.assignments.map((a) => {
              const task = s.tasks.find((t) => t.id === a.task_id);
              const can = admin(s) || a.assigned_to === s.userId;
              return (
                <details className="assignment" key={a.id}>
                  <summary>
                    <span className={`task-check ${a.completed_at ? 'checked' : ''}`}>
                      {a.completed_at ? <Check size={17} /> : <Sparkles size={17} />}
                    </span>
                    <div>
                      <strong>{task?.title}</strong>
                      <small>
                        {name(s, a.assigned_to)} · {dateLabel(a.due_on)} · ~{task?.duration_minutes}{' '}
                        min
                      </small>
                    </div>
                    <Status
                      label={
                        a.completed_at
                          ? 'Completed'
                          : a.due_on < s.today
                            ? 'Overdue'
                            : a.due_on === s.today
                              ? 'Due today'
                              : 'Upcoming'
                      }
                    />
                  </summary>
                  <div className="assignment-body">
                    <p>{task?.description}</p>
                    {a.completed_at ? (
                      <p className="small">
                        Completed {dateLabel(a.completed_at, s.household.timezone)}.{' '}
                        {a.completion_note}
                      </p>
                    ) : (
                      <>
                        {can && (
                          <ActionForm
                            intent="assignment"
                            householdId={s.household.id}
                            demo={s.demo}
                            label="Mark completed"
                          >
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <Notes name="note" label="Completion note" />
                          </ActionForm>
                        )}
                        {admin(s) && (
                          <ActionForm
                            intent="assignment"
                            householdId={s.household.id}
                            demo={s.demo}
                            label="Reassign task"
                          >
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <MemberSelect
                              members={s.members}
                              name="assigned_to"
                              label="Assigned member"
                              value={a.assigned_to}
                            />
                          </ActionForm>
                        )}
                      </>
                    )}
                    <Documents s={s} id={a.id} />
                    {can && <Upload s={s} id={a.id} target="assignment_id" />}
                  </div>
                </details>
              );
            })
          ) : (
            <Empty text="Create a rotation and give every little job a place." />
          )}
        </section>
        <div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Sharing the care</h2>
                <p>Assignments and completions in this view.</p>
              </div>
            </div>
            {s.members
              .filter((m) => !m.left_at)
              .map((m) => (
                <div className="fairness-row" key={m.user_id}>
                  <Avatar s={s} id={m.user_id} />
                  <div>
                    <strong>{m.display_name.split(' ')[0]}</strong>
                    <small>
                      {s.assignments.filter((a) => a.assigned_to === m.user_id).length} assigned ·{' '}
                      {
                        s.assignments.filter((a) => a.assigned_to === m.user_id && a.completed_at)
                          .length
                      }{' '}
                      completed
                    </small>
                  </div>
                </div>
              ))}
            <p className="panel-caption">
              A starting point for a conversation about workload, rather than a fairness score.
            </p>
          </section>
          {admin(s) && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Rotation settings</h2>
              </div>
              {s.tasks.map((t) => (
                <details className="rotation-setting" key={t.id}>
                  <summary>
                    {t.title}
                    <Badge tone={t.active ? 'positive' : 'neutral'}>
                      {t.active ? 'Running' : 'Paused'}
                    </Badge>
                  </summary>
                  <ActionForm
                    intent="cleaning"
                    householdId={s.household.id}
                    demo={s.demo}
                    label="Update future rotation"
                  >
                    <input type="hidden" name="task_id" value={t.id} />
                    <input type="hidden" name="title" value={t.title} />
                    <input type="hidden" name="frequency" value={t.frequency} />
                    <input type="hidden" name="anchor_date" value={t.anchor_date} />
                    <Select name="active" label="Rotation status" value={String(t.active)}>
                      <option value="true">Running</option>
                      <option value="false">Paused</option>
                    </Select>
                    <span className="field-label">Include in future assignments</span>
                    {s.members
                      .filter((m) => !m.left_at)
                      .map((m) => (
                        <label className="check" key={m.user_id}>
                          <input
                            type="checkbox"
                            name="participants"
                            value={m.user_id}
                            defaultChecked={t.rotation.includes(m.user_id)}
                          />
                          {m.display_name}
                        </label>
                      ))}
                    <p className="small muted">
                      Exclusions apply to assignments generated next. Reassign any already scheduled
                      jobs separately.
                    </p>
                  </ActionForm>
                </details>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
function Notifications({ s }: { s: Snapshot }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Your notification centre</h2>
          <p>Only updates relevant to your account.</p>
        </div>
        <ActionForm intent="read" demo={s.demo} label="Mark all as read" />
      </div>
      {s.notifications.length ? (
        s.notifications.map((n) => (
          <Link
            key={n.id}
            href={s.demo ? href(s, n.href.split('/').pop() || 'overview') : n.href}
            className={`notice ${!n.read_at ? 'unread' : ''}`}
          >
            <span className="notice-icon">
              <Bell size={19} />
            </span>
            <div>
              <strong>{n.message}</strong>
              <small>
                {dateLabel(n.created_at, s.household.timezone)} ·{' '}
                {n.essential ? 'Financial / task reminder' : 'Activity update'} ·{' '}
                {n.read_at ? 'Read' : 'Unread'}
              </small>
            </div>
            <ArrowUpRight size={16} />
          </Link>
        ))
      ) : (
        <Empty text="You’re all caught up. New reminders will appear here." />
      )}
    </section>
  );
}
function Settings({ s }: { s: Snapshot }) {
  return (
    <>
      <div className="settings-grid">
        <section className="panel settings-panel account-settings">
          <h2>Your account</h2>
          <p>Your account details are saved privately. Household display names remain separate.</p>
          <label className="field">
            <span>Account email</span>
            <input type="email" value={s.profile.email || s.email} readOnly aria-readonly="true" />
            <small>Managed securely by Fairshare authentication.</small>
          </label>
          <ActionForm intent="profile" demo={s.demo} label="Save account details">
            <Field name="display_name" label="Your name" value={s.profile.display_name} />
            <Field
              name="timezone"
              label="Your default timezone"
              value={s.profile.timezone}
              help="Used when setting up a new household, such as Australia/Sydney."
            />
          </ActionForm>
        </section>
        <section className="panel settings-panel">
          <h2>Household details</h2>
          {admin(s) ? (
            <ActionForm
              intent="household"
              householdId={s.household.id}
              demo={s.demo}
              label="Save household"
            >
              <input type="hidden" name="action" value="settings" />
              <Field name="name" label="Household name" value={s.household.name} />
              <Field
                name="description"
                label="Description"
                value={s.household.description}
                required={false}
              />
              <Field
                name="timezone"
                label="Timezone"
                value={s.household.timezone}
                help="An IANA timezone, such as Australia/Sydney or Australia/Perth."
              />
              <p className="small muted">
                Currency: AUD. Multi-currency accounting is not supported.
              </p>
            </ActionForm>
          ) : (
            <p>
              {s.household.name}
              <br />
              {s.household.description}
              <br />
              {s.household.timezone} · AUD
            </p>
          )}
        </section>
        <section className="panel settings-panel">
          <h2>Your notification preferences</h2>
          <ActionForm intent="preferences" demo={s.demo} label="Save preferences">
            <label className="check">
              <input
                name="email_enabled"
                type="checkbox"
                defaultChecked={s.preferences.email_enabled}
              />
              Email my reminders
            </label>
            <label className="check">
              <input
                name="activity_enabled"
                type="checkbox"
                defaultChecked={s.preferences.activity_enabled}
              />
              Non-essential activity updates
            </label>
            <p className="small muted">
              Essential financial reminders remain in your in-app notification centre. Email
              requires a configured provider and scheduler. Enabling this preference alone does not
              activate delivery.
            </p>
          </ActionForm>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>The people who make it home</h2>
            <p>One account per housemate. No fixed household size.</p>
          </div>
          {admin(s) && (
            <Modal title="Invite a housemate" trigger="Invite member">
              <ActionForm
                intent="invite"
                householdId={s.household.id}
                demo={s.demo}
                label="Create invitation"
              >
                <Field
                  label="Recipient email"
                  name="email"
                  type="email"
                  required={false}
                  help="Enter an email to send an invitation when email delivery is configured. Leave it blank to create a link you can share yourself."
                />
                <p className="small muted">
                  The private link expires in seven days and can be accepted once. If you enter an
                  email, the recipient must verify that address to join.
                </p>
              </ActionForm>
            </Modal>
          )}
        </div>
        {s.members.map((m) => (
          <div className="member-row" key={m.user_id}>
            <Avatar s={s} id={m.user_id} />
            <div>
              <strong>
                {m.display_name}
                {m.user_id === s.userId ? ' (you)' : ''}
              </strong>
              <small>
                {m.left_at
                  ? 'Former housemate'
                  : m.role === 'admin'
                    ? 'Household administrator'
                    : 'Household member'}
              </small>
            </div>
            {!m.left_at && admin(s) && m.user_id !== s.userId && (
              <details className="member-actions">
                <summary>Manage</summary>
                <ActionForm
                  intent="household"
                  householdId={s.household.id}
                  demo={s.demo}
                  label={m.role === 'admin' ? 'Make member' : 'Make administrator'}
                  confirm="Change this member’s permissions?"
                >
                  <input type="hidden" name="action" value="role" />
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <input
                    type="hidden"
                    name="role"
                    value={m.role === 'admin' ? 'member' : 'admin'}
                  />
                </ActionForm>
                <ActionForm
                  intent="household"
                  householdId={s.household.id}
                  demo={s.demo}
                  label="Remove member"
                  confirm="Remove this member? Their financial history is retained, access ends, and future rent generation is paused until reconfigured. Outstanding debts are not cancelled."
                >
                  <input type="hidden" name="action" value="leave" />
                  <input type="hidden" name="user_id" value={m.user_id} />
                </ActionForm>
              </details>
            )}
          </div>
        ))}
      </section>
      {admin(s) && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Household audit trail</h2>
              <p>Financial changes and membership events, retained for review.</p>
            </div>
          </div>
          {s.audit.length ? (
            s.audit
              .slice()
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 30)
              .map((a) => (
                <div className="audit-row" key={a.id}>
                  <Clock3 size={15} />
                  <span>
                    <strong>{a.action}</strong>
                    <small>
                      {name(s, a.actor)} · {dateLabel(a.created_at, s.household.timezone)}
                    </small>
                  </span>
                </div>
              ))
          ) : (
            <Empty text="Household changes will appear here." />
          )}
        </section>
      )}
      <section className="panel settings-panel departure">
        <h2>Leave this household</h2>
        <p>
          Your access ends immediately. Historical expenses, repayments and outstanding obligations
          are retained. Save your records and agree any outstanding contributions before leaving. If
          you are the last administrator, appoint another first.
        </p>
        <ActionForm
          intent="household"
          householdId={s.household.id}
          demo={s.demo}
          label="Leave household"
          confirm="Leave this household now? You will lose access; financial records and balances remain. Future rent generation will pause."
        >
          <input type="hidden" name="action" value="leave" />
          <input type="hidden" name="user_id" value={s.userId} />
        </ActionForm>
        <p className="small muted">
          Account deletion: contact the operator at the support channel configured for your
          deployment. Retained financial records need an agreed retention policy; automated account
          erasure is not implemented.
        </p>
      </section>
    </>
  );
}
