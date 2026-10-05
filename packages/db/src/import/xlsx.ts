import ExcelJS from "exceljs";
import type { Sheet } from "./csv";

/**
 * R19.1. Reading a real .xlsx workbook.
 *
 * Unlike CSV, this is not written by hand. An xlsx file is a zip of XML where a
 * date is stored as a number and the only way to know it is a date is to follow
 * the cell's style to a number format. Get that wrong and every birthday in a
 * church directory lands in 1900. That is not a detail worth being clever about,
 * so the parsing is delegated and only the interpretation lives here.
 */

/** A cell, as the text the rest of the import pipeline expects. */
function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    // Excel holds a date as a number and a format. ExcelJS hands back a Date in
    // UTC, and the import pipeline speaks ISO, so the conversion happens once,
    // here, rather than in six places downstream.
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    // A formula cell carries its last computed result. A church's export often
    // has a "Full name" column that is a formula, and the result is what they
    // see on screen and what they mean.
    if ("result" in value && value.result !== undefined && value.result !== null) {
      const r = value.result as unknown;
      if (r instanceof Date) return r.toISOString().slice(0, 10);
      if (typeof r === "object" && r !== null && "error" in r) return "";
      return String(r).trim();
    }
    // Rich text: one string broken into runs because somebody bolded a word.
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("hyperlink" in value && typeof value.text === "string") return String(value.text).trim();
    return "";
  }

  if (typeof value === "number") {
    // Long decimals come back from a stored float. A phone number typed into a
    // numeric cell must not become 5.12555e9.
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
  }

  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

/**
 * Reads the first worksheet, first row as headers.
 *
 * Only the first sheet. A church exporting from their old system produces one
 * sheet of members, and asking a volunteer which tab they meant, before they have
 * seen anything work, is a question too early.
 */
export async function readWorkbook(data: Buffer | ArrayBuffer): Promise<Sheet> {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data));
  await workbook.xlsx.load(buffer as never);

  const worksheet = workbook.worksheets.find((w) => w.state !== "hidden") ?? workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [], lineNumbers: [] };

  const table: { cells: string[]; line: number }[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: string[] = [];
    // eachCell skips gaps, so the row is walked by position instead. A blank
    // column in the middle must not shift every value to its left.
    const width = Math.max(row.cellCount, worksheet.columnCount);
    for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c)));
    if (cells.some((v) => v !== "")) table.push({ cells, line: rowNumber });
  });

  if (table.length === 0) return { headers: [], rows: [], lineNumbers: [] };

  const seen = new Map<string, number>();
  const headers = table[0]!.cells.map((h, i) => {
    const name = h.trim() || `Column ${i + 1}`;
    const count = seen.get(name.toLowerCase()) ?? 0;
    seen.set(name.toLowerCase(), count + 1);
    return count === 0 ? name : `${name} (${count + 1})`;
  });

  // Trailing empty header columns are Excel's, not the church's.
  while (headers.length > 0 && /^Column \d+$/.test(headers[headers.length - 1]!)) {
    const index = headers.length - 1;
    if (table.some((r) => (r.cells[index] ?? "") !== "")) break;
    headers.pop();
  }

  const rows = table.slice(1).map((r) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (r.cells[i] ?? "").trim();
    });
    return row;
  });

  return { headers, rows, lineNumbers: table.slice(1).map((r) => r.line) };
}

/** True for a name a spreadsheet program would open as a workbook. */
export const isWorkbookName = (filename: string): boolean => /\.xlsx?$/i.test(filename);
