'use client';
import { useState } from 'react';
import type { Snapshot, Expense } from '@/lib/types';
import { cents, money, split, tripEstimate } from '@/lib/money';
import { ActionForm } from './action-form';
import { Field, MemberSelect, Notes, Select } from './fields';
export function Participants({
  s,
  total = 0,
  onChange,
  initial,
}: {
  s: Snapshot;
  total?: number;
  onChange?: (method: string) => void;
  initial?: Expense;
}) {
  const [method, setMethod] = useState<'equal' | 'amount' | 'percentage'>(
    initial ? 'amount' : 'equal',
  );
  const [selected, setSelected] = useState<string[]>(
    initial
      ? s.shares.filter((p) => p.expense_id === initial.id).map((p) => p.user_id)
      : [s.userId],
  );
  const [values, setValues] = useState<Record<string, string>>(
    initial
      ? Object.fromEntries(
          s.shares
            .filter((p) => p.expense_id === initial.id)
            .map((p) => [p.user_id, (p.amount_cents / 100).toFixed(2)]),
        )
      : {},
  );
  let preview: ReturnType<typeof split> = [];
  let error = '';
  try {
    if (total > 0)
      preview = split(
        total,
        selected.map((user_id) => ({
          user_id,
          value: method === 'equal' ? 0 : cents(values[user_id] || '0'),
        })),
        method,
      );
  } catch (e) {
    error = e instanceof Error ? e.message : 'Check allocations';
  }
  return (
    <div className="participant-picker">
      <label className="field">
        <span>Split method</span>
        <select
          name="split_method"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as typeof method);
            onChange?.(e.target.value);
          }}
        >
          <option value="equal">Split equally</option>
          <option value="amount">Custom amounts (AUD)</option>
          <option value="percentage">Custom percentages</option>
        </select>
      </label>
      <div className="field-label">Who is this for?</div>
      <p className="muted small">
        Only selected members receive a share. Remainder cents follow member ID order.
      </p>
      {s.members
        .filter((m) => !m.left_at)
        .map((m) => (
          <div className="participant-row" key={m.user_id}>
            <label className="check">
              <input
                type="checkbox"
                name="participants"
                value={m.user_id}
                checked={selected.includes(m.user_id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, m.user_id]
                      : selected.filter((x) => x !== m.user_id),
                  )
                }
              />
              {m.display_name}
              {m.user_id === s.userId && <small>(you)</small>}
            </label>
            {method !== 'equal' && selected.includes(m.user_id) ? (
              <label className="share-input">
                <span className="sr-only">
                  {m.display_name} {method === 'percentage' ? 'percentage' : 'amount'}
                </span>
                <input
                  name={'share_' + m.user_id}
                  inputMode="decimal"
                  placeholder={method === 'percentage' ? '0.00%' : '$0.00'}
                  value={values[m.user_id] || ''}
                  onChange={(e) => setValues({ ...values, [m.user_id]: e.target.value })}
                  required
                />
              </label>
            ) : (
              <span className="small">
                {preview.find((p) => p.user_id === m.user_id)
                  ? money(preview.find((p) => p.user_id === m.user_id)!.amount_cents)
                  : '—'}
              </span>
            )}
          </div>
        ))}
      {error && (
        <p className="muted small" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
export function ExpenseForm({
  s,
  kind = 'expense',
  initial,
}: {
  s: Snapshot;
  kind?: 'expense' | 'bill' | 'trip';
  initial?: Expense;
}) {
  const admin = s.members.find((m) => m.user_id === s.userId)?.role === 'admin';
  const [amount, setAmount] = useState(initial ? (initial.amount_cents / 100).toFixed(2) : '');
  const [distance, setDistance] = useState('');
  const [vehicle, setVehicle] = useState(s.vehicles.find((v) => v.active)?.id || '');
  const [price, setPrice] = useState('1.85');
  const [fuelId, setFuelId] = useState('');
  const [tolls, setTolls] = useState('0');
  const [parking, setParking] = useState('0');
  let total = 0,
    estimate;
  try {
    if (kind === 'trip') {
      const v = s.vehicles.find((v) => v.id === vehicle);
      const recorded = s.fuel.find((f) => f.id === fuelId);
      estimate = tripEstimate(
        distance,
        String(v?.efficiency || 0),
        String(recorded?.price_per_litre || price),
        cents(tolls || '0'),
        cents(parking || '0'),
      );
      total = estimate.total_cents;
    } else total = cents(amount);
  } catch {}
  return (
    <ActionForm
      intent={initial ? 'replace' : 'entry'}
      householdId={s.household.id}
      demo={s.demo}
      label={initial ? 'Save correction' : `Record ${kind}`}
    >
      {initial && <input type="hidden" name="expense_id" value={initial.id} />}
      <input type="hidden" name="kind" value={kind} />
      <Field
        name="description"
        label={kind === 'trip' ? 'Destination or purpose' : 'Description'}
        placeholder={kind === 'trip' ? 'A trip to the coast' : 'What was it for?'}
        value={initial?.description}
      />
      <div className="form-grid">
        <Field
          label={kind === 'bill' ? 'Issue date' : 'Date'}
          name="occurred_on"
          type="date"
          value={initial?.occurred_on || s.today}
        />
        <MemberSelect
          members={s.members}
          value={initial?.paid_by || s.userId}
          restrict={admin ? undefined : s.userId}
          label={
            kind === 'bill'
              ? 'Contribution collector'
              : kind === 'trip'
                ? 'Reimburse / paid by'
                : 'Paid by'
          }
        />
      </div>
      <Select
        label="Category"
        name="category"
        value={
          initial?.category ||
          (kind === 'trip' ? 'Fuel' : kind === 'bill' ? 'Electricity' : 'Groceries')
        }
      >
        {(kind === 'bill'
          ? ['Electricity', 'Gas', 'Water', 'Lawn mowing', 'Cleaning services', 'Internet', 'Other']
          : [
              'Groceries',
              'Household supplies',
              'Food and dining',
              'Transport',
              'Fuel',
              'Cleaning',
              'Utilities',
              'Entertainment',
              'Other',
            ]
        ).map((c) => (
          <option key={c}>{c}</option>
        ))}
      </Select>
      {kind !== 'trip' ? (
        <label className="field">
          <span>Total amount (AUD)</span>
          <input
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      ) : (
        <>
          <label className="field">
            <span>Vehicle</span>
            <select
              name="vehicle_id"
              required
              value={vehicle}
              onChange={(e) => {
                setVehicle(e.target.value);
                setFuelId('');
              }}
            >
              <option value="" disabled>
                Choose a vehicle
              </option>
              {s.vehicles
                .filter((v) => v.active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.efficiency} km/L
                  </option>
                ))}
            </select>
          </label>
          <div className="form-grid">
            <MemberSelect members={s.members} name="driver" label="Driver" value={s.userId} />
            <label className="field">
              <span>Total round-trip distance (km)</span>
              <input
                name="distance"
                inputMode="decimal"
                required
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="63"
              />
            </label>
          </div>
          <label className="field">
            <span>Fuel-price observation</span>
            <select name="fuel_price_id" value={fuelId} onChange={(e) => setFuelId(e.target.value)}>
              <option value="">Enter an agreed price</option>
              {s.fuel
                .filter((f) => f.vehicle_id === vehicle)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    ${f.price_per_litre}/L · {f.observed_on}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Agreed fuel price (AUD/L)</span>
            <input
              name="price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              readOnly={!!fuelId}
            />
            <small>The selected observation overrides this price when present.</small>
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Tolls (AUD)</span>
              <input
                name="tolls"
                inputMode="decimal"
                value={tolls}
                onChange={(e) => setTolls(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Parking (AUD)</span>
              <input
                name="parking"
                inputMode="decimal"
                value={parking}
                onChange={(e) => setParking(e.target.value)}
              />
            </label>
          </div>
          {estimate && (
            <div className="calculation">
              {estimate.litres.toFixed(3)} L estimated × recorded price ={' '}
              {money(estimate.fuel_cents)} fuel
              <br />
              <strong>{money(total)} including tolls and parking</strong>
            </div>
          )}
          <p className="small muted">
            Choose who receives reimbursement. The owner can be excluded from beneficiaries. Fuel,
            tolls and parking use the same selected group.
          </p>
        </>
      )}
      {kind === 'bill' && (
        <>
          <div className="form-grid">
            <Field
              label="Provider"
              name="provider"
              value={initial ? String(initial.metadata.provider || '') : undefined}
            />
            <Field label="Due date" name="due_on" type="date" value={initial?.due_on || s.today} />
          </div>
          <div className="form-grid">
            <Field
              label="Period starts"
              name="period_start"
              type="date"
              required={false}
              value={initial ? String(initial.metadata.period_start || '') : undefined}
            />
            <Field
              label="Period ends"
              name="period_end"
              type="date"
              required={false}
              value={initial ? String(initial.metadata.period_end || '') : undefined}
            />
          </div>
          <Field
            name="reminder_days"
            label="Reminder days before due"
            type="number"
            min="0"
            max="30"
            value={initial ? Number(initial.metadata.reminder_days ?? 1) : 1}
          />
          <p className="small muted">
            Recording a bill creates contributions to the collector. It does not confirm that the
            provider has been paid. Attach the document after saving.
          </p>
        </>
      )}
      <Participants s={s} total={total} initial={initial} />
      <Notes value={initial?.notes} />
    </ActionForm>
  );
}
