import Table from "cli-table3";

/**
 * Renders a formatted terminal table from the provided headers and rows.
 *
 * @param headers - Column headers.
 * @param rows - Table rows (already converted to strings).
 * @returns A formatted table string ready for printing.
 */
export function renderTable(headers: string[], rows: string[][]): string {
  const table = new Table({
    head: headers,
  });

  table.push(...rows);

  return table.toString();
}
