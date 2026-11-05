/** Quote every field and neutralise spreadsheet formula injection. */
export function csvCell(value: unknown) {
  let s = String(value ?? '');
  if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function csv(rows: unknown[][]) {
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
