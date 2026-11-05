import { describe, it, expect } from 'vitest';
import { cents, split, tripEstimate } from '../lib/money';
import { localDate, nextDue, addDays, dateLabel } from '../lib/dates';
import { csvCell } from '../lib/csv';
import { obligations, paymentStatus } from '../lib/balances';
import type { Expense } from '../lib/types';
describe('financial inputs and recurrence', () => {
  it('parses currency exactly and rejects ambiguous decimals', () => {
    expect(cents('0.01')).toBe(1);
    expect(cents('90')).toBe(9000);
    for (const s of ['-1', '1.001', '1e3', 'NaN', '1,000', '']) expect(() => cents(s)).toThrow();
  });
  it('deterministically preserves every cent for equal and percentage shares', () => {
    expect(
      split(100, [{ user_id: 'b' }, { user_id: 'a' }, { user_id: 'c' }], 'equal').map(
        (p) => p.amount_cents,
      ),
    ).toEqual([34, 33, 33]);
    expect(
      split(
        971,
        [
          { user_id: 'a', value: 2500 },
          { user_id: 'b', value: 7500 },
        ],
        'percentage',
      ).reduce((s, p) => s + p.amount_cents, 0),
    ).toBe(971);
    expect(() => split(100, [{ user_id: 'a', value: 99 }], 'amount')).toThrow();
  });
  it('calculates the specified fuel example and extras with decimal integer arithmetic', () => {
    expect(tripEstimate('63', '12', '1.85')).toEqual({
      litres: 5.25,
      fuel_cents: 971,
      total_cents: 971,
    });
    expect(tripEstimate('63', '12', '1.85', 100, 200).total_cents).toBe(1271);
    expect(() => tripEstimate('63', '0', '1.85')).toThrow();
  });
  it('anchors Thursday rent every fourteen days across DST with Wednesday reminders', () => {
    expect(nextDue('2026-10-01', '2026-10-02')).toBe('2026-10-15');
    expect(addDays('2026-10-15', -1)).toBe('2026-10-14');
    expect(new Date('2026-10-14T12:00:00Z').getUTCDay()).toBe(3);
    expect(new Date('2026-10-15T12:00:00Z').getUTCDay()).toBe(4);
  });
  it('uses household timezones, including opposite sides of midnight', () => {
    const d = new Date('2026-11-04T14:00:00Z');
    expect(localDate('Australia/Sydney', d)).toBe('2026-11-05');
    expect(localDate('America/Los_Angeles', d)).toBe('2026-11-04');
  });
  it('distinguishes partial, due and overdue statuses', () => {
    expect(paymentStatus('2026-11-04', '2026-11-05', 100, 200)).toBe('Partially paid · overdue');
    expect(paymentStatus('2026-11-04', '2026-11-05', 200, 200)).toBe('Overdue');
    expect(paymentStatus('2026-11-05', '2026-11-05', 200, 200)).toBe('Due today');
    expect(paymentStatus(null, '2026-11-05', 0, 200)).toBe('Paid');
  });
  it('counts confirmed repayments only and keeps unrelated debts separate', () => {
    const e = { id: 'e', paid_by: 'a', status: 'active' } as Expense;
    const shares = [
      { expense_id: 'e', user_id: 'a', amount_cents: 3000 },
      { expense_id: 'e', user_id: 'b', amount_cents: 3000 },
      { expense_id: 'e', user_id: 'c', amount_cents: 3000 },
    ];
    expect(obligations([e], shares, []).map((r) => r.remaining)).toEqual([3000, 3000]);
  });
  it('escapes CSV quotes and spreadsheet formulas', () => {
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });
});

it('formats timestamp dates in the household timezone while preserving date-only anchors', () => {
  expect(dateLabel('2026-11-04T14:00:00Z', 'Australia/Sydney')).toBe('5 Nov 2026');
  expect(dateLabel('2026-11-04T14:00:00Z', 'America/Los_Angeles')).toBe('4 Nov 2026');
  expect(dateLabel('2026-11-04', 'Australia/Sydney')).toBe('4 Nov 2026');
});
