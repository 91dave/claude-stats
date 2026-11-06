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
