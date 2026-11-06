const DAY = 24 * 60 * 60 * 1000;

export function describeCoverage({ sessions, oldest, now = Date.now() }) {
  const sessionCount = `${sessions} ${sessions === 1 ? 'session' : 'sessions'}`;
  if (oldest == null) return sessionCount;

  const days = Math.max(1, Math.ceil((now - oldest) / DAY));
  return `${sessionCount} from the last ${days === 1 ? 'day' : `${days} days`}`;
}

export function renderTable(rows, columns) {
  const widths = columns.map(({ header, value }) =>
    Math.max(header.length, ...rows.map((row) => String(value(row)).length)));
  const pad = (text, index) => (columns[index].align === 'right'
    ? String(text).padStart(widths[index])
    : String(text).padEnd(widths[index]));
  const line = (cells) => cells.map(pad).join('  ').trimEnd();

  return [
    line(columns.map((column) => column.header)),
    line(widths.map((width) => '-'.repeat(width))),
    ...rows.map((row) => line(columns.map((column) => column.value(row)))),
  ].join('\n');
}
