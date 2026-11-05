import type { ReactNode } from 'react';
import type { Member, Snapshot } from '@/lib/types';
export function Field({
  label,
  name,
  type = 'text',
  value,
  required = true,
  help,
  step,
  min,
  max,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  required?: boolean;
  help?: string;
  step?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {!required && <small> optional</small>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
      />
      {help && <small>{help}</small>}
    </label>
  );
}
export function Select({
  label,
  name,
  children,
  value,
  required = false,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: ReactNode;
  value?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={value} required={required}>
        {children}
      </select>
    </label>
  );
}
export function MemberSelect({
  members,
  label = 'Paid by',
  name = 'paid_by',
  value,
  restrict,
}: {
  members: Member[];
  label?: string;
  name?: string;
  value?: string;
  restrict?: string;
}) {
  return (
    <Select label={label} name={name} value={value} required>
      {members
        .filter((m) => !m.left_at && (!restrict || m.user_id === restrict))
        .map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.display_name}
          </option>
        ))}
    </Select>
  );
}
export function Notes({
  name = 'notes',
  label = 'Notes',
  value,
}: {
  name?: string;
  label?: string;
  value?: string;
}) {
  return (
    <label className="field">
      <span>
        {label}
        <small> optional</small>
      </span>
      <textarea name={name} rows={3} maxLength={2000} defaultValue={value} />
    </label>
  );
}
export function Context({ s }: { s: Snapshot }) {
  return <input type="hidden" name="household_id" value={s.household.id} />;
}
