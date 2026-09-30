/**
 * Writing CSV, which is the other half of reading it.
 *
 * Excel opens a UTF-8 file as the local codepage unless it finds a byte order
 * mark, so a church in Texas exporting a member called Zoë gets Zoë back. The
 * BOM is three bytes and removes an entire category of support email.
 */

/** Quoted when the value carries a delimiter, a quote, a newline, or edge space. */
const needsQuoting = (value: string): boolean => /[",\n\r]/.test(value) || value !== value.trim();

const escape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const raw =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  // A cell beginning with one of these is treated as a formula by Excel, Numbers
  // and Sheets. Prefixing with an apostrophe keeps it a string. A church's own
  // data should never execute when they open their own export.
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;

  return needsQuoting(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_BOM = "﻿";

/** A table of objects as a CSV string, with a header row. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const headers = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  if (headers.length === 0) return CSV_BOM;

  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  // CRLF, because that is what every spreadsheet writes and some still expect.
  return CSV_BOM + lines.join("\r\n") + "\r\n";
}
