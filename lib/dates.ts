export function localDate(timezone = 'Australia/Sydney', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function dateLabel(value: string, timezone = 'Australia/Sydney') {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: value.length === 10 ? 'UTC' : timezone,
  }).format(new Date(value.length === 10 ? value + 'T12:00:00Z' : value));
}
export function addDays(day: string, days: number) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function nextDue(anchor: string, today: string, interval = 14) {
  const delta = Math.floor(
    (Date.parse(today + 'T12:00:00Z') - Date.parse(anchor + 'T12:00:00Z')) / 86400000,
  );
  return addDays(anchor, Math.max(0, Math.ceil(delta / interval)) * interval);
}
