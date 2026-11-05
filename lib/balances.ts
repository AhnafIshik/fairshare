import type { Expense, Share, Repayment } from './types';
/** Repayments are bound to one expense and one debtor. Pending payments never reduce debt. */
export function obligations(expenses: Expense[], shares: Share[], repayments: Repayment[]) {
  return shares.flatMap((s) => {
    const e = expenses.find((e) => e.id === s.expense_id && e.status === 'active');
    if (!e || e.paid_by === s.user_id) return [];
    const confirmed = repayments
      .filter((r) => r.expense_id === e.id && r.payer === s.user_id && r.status === 'confirmed')
      .reduce((n, r) => n + r.amount_cents, 0);
    const pending = repayments
      .filter((r) => r.expense_id === e.id && r.payer === s.user_id && r.status === 'pending')
      .reduce((n, r) => n + r.amount_cents, 0);
    return [
      {
        expense: e,
        debtor: s.user_id,
        creditor: e.paid_by,
        share: s.amount_cents,
        confirmed,
        pending,
        remaining: s.amount_cents - confirmed,
      },
    ];
  });
}
export function totals(
  user: string,
  expenses: Expense[],
  shares: Share[],
  repayments: Repayment[],
) {
  const rows = obligations(expenses, shares, repayments);
  return {
    owed: rows.filter((r) => r.debtor === user).reduce((n, r) => n + r.remaining, 0),
    owedToYou: rows.filter((r) => r.creditor === user).reduce((n, r) => n + r.remaining, 0),
  };
}
export function paymentStatus(
  due: string | null,
  today: string,
  remaining: number,
  original: number,
) {
  if (remaining === 0) return 'Paid';
  if (remaining < original)
    return due && due < today ? 'Partially paid · overdue' : 'Partially paid';
  if (!due) return 'Outstanding';
  return due < today ? 'Overdue' : due === today ? 'Due today' : 'Upcoming';
}
