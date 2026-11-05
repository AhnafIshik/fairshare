/** Strict decimal input to minor units: no floating point arithmetic for money. */
export function cents(value: string): number {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Enter an amount with up to two decimal places.');
  const amount = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 100_000_000)
    throw new Error('Amount is too large.');
  return amount;
}
export const money = (amount: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount / 100);
export type Allocation = { user_id: string; value?: number };
export function split(
  total: number,
  participants: Allocation[],
  method: 'equal' | 'amount' | 'percentage',
) {
  if (
    !Number.isInteger(total) ||
    total < 1 ||
    total > 100_000_000 ||
    !participants.length ||
    new Set(participants.map((p) => p.user_id)).size !== participants.length
  )
    throw new Error('Invalid allocation');
  const sorted = [...participants].sort((a, b) => a.user_id.localeCompare(b.user_id));
  if (method !== 'equal' && sorted.some((p) => !Number.isInteger(p.value) || p.value! < 0))
    throw new Error('Invalid allocation');
  if (method === 'amount' && sorted.reduce((s, p) => s + p.value!, 0) !== total)
    throw new Error('Shares must equal the total');
  if (method === 'percentage' && sorted.reduce((s, p) => s + p.value!, 0) !== 10000)
    throw new Error('Percentages must total 100%');
  const result = sorted.map((p) => ({
    user_id: p.user_id,
    amount_cents:
      method === 'amount'
        ? p.value!
        : method === 'equal'
          ? Math.floor(total / sorted.length)
          : Number((BigInt(total) * BigInt(p.value!)) / 10000n),
  }));
  let remainder = total - result.reduce((s, p) => s + p.amount_cents, 0);
  return result.map((p) => ({ ...p, amount_cents: p.amount_cents + (remainder-- > 0 ? 1 : 0) }));
}
export function tripEstimate(
  distance: string,
  efficiency: string,
  price: string,
  tolls = 0,
  parking = 0,
) {
  const scaled = (s: string) => {
    if (!/^\d+(\.\d{1,4})?$/.test(s)) throw new Error('Use up to four decimal places');
    const [a, b = ''] = s.split('.');
    return BigInt(a) * 10000n + BigInt(b.padEnd(4, '0'));
  };
  const d = scaled(distance),
    e = scaled(efficiency),
    p = scaled(price);
  if (d <= 0n || e <= 0n || p <= 0n || tolls < 0 || parking < 0)
    throw new Error('Use positive distance, efficiency and fuel price');
  const numerator = d * p * 100n,
    denominator = e * 10000n;
  const fuel = Number((numerator + denominator / 2n) / denominator);
  return { litres: Number(d) / Number(e), fuel_cents: fuel, total_cents: fuel + tolls + parking };
}
