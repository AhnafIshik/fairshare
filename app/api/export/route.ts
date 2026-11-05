import { loadSnapshot } from '@/lib/data';
import { csv } from '@/lib/csv';
import { configured } from '@/lib/supabase/server';
import { obligations } from '@/lib/balances';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!configured()) return Response.json({ error: 'Connect Supabase first' }, { status: 503 });
  const s = await loadSnapshot();
  const name = (id: string) =>
    s.members.find((m) => m.user_id === id)?.display_name || 'Former member';
  const rows: unknown[][] = [
    [
      'Type',
      'Date',
      'Description',
      'Category',
      'Paid by / collector',
      'Expense total AUD (repeated per share)',
      'Beneficiary',
      'Share AUD',
      'Confirmed repayment AUD',
      'Outstanding AUD',
      'Status',
    ],
  ];
  const debt = obligations(s.expenses, s.shares, s.repayments);
  for (const e of s.expenses)
    for (const p of s.shares.filter((p) => p.expense_id === e.id)) {
      const r = debt.find((r) => r.expense.id === e.id && r.debtor === p.user_id);
      const visible =
        s.members.find((m) => m.user_id === s.userId)?.role === 'admin' ||
        e.paid_by === s.userId ||
        p.user_id === s.userId;
      rows.push([
        e.kind,
        e.occurred_on,
        e.description,
        e.category,
        name(e.paid_by),
        (e.amount_cents / 100).toFixed(2),
        name(p.user_id),
        (p.amount_cents / 100).toFixed(2),
        visible ? ((r?.confirmed || 0) / 100).toFixed(2) : '',
        visible ? ((r?.remaining || 0) / 100).toFixed(2) : '',
        e.status,
      ]);
    }
  return new Response(csv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fairshare-transactions.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
