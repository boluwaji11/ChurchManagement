/**
 * A CSV reader, written rather than installed.
 *
 * CSV is small enough to do correctly and the details are the whole job: quoted
 * fields containing commas and newlines, doubled quotes inside quoted fields, a
 * byte order mark that Excel puts on every file it exports, and CRLF. A parser
 * that splits on commas works on the demo file and fails on a real church's
 * directory, where somebody has an address with a comma in it.
 *
 * Tab separated files are the same grammar with a different delimiter, and they
 * are what you get when a spreadsheet is pasted, so they are read too.
 */

export interface Sheet {
  headers: string[];
  /** One entry per data row, keyed by header. Short rows pad, long rows keep the extra. */
  rows: Record<string, string>[];
  /** File line numbers, so a message can say which line of their file is wrong. */
  lineNumbers: number[];
}

/** Picks the delimiter by counting candidates outside quotes on the header line. */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const counts = [",", "\t", ";", "|"].map((d) => [d, firstLine.split(d).length - 1] as const);
  const best = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : ",";
}

/** Splits into rows of cells. Nothing is interpreted, everything is a string. */
export function parseDelimited(text: string, delimiter?: string): { cells: string[][]; lines: number[] } {
  // Excel writes a byte order mark. Left in, it becomes part of the first header,
  // and the mapping silently fails to recognise a column called "First name".
  const input = text.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(input);

  const cells: string[][] = [];
  const lines: number[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowStartedAt = 1;
  let started = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    cells.push(row);
    lines.push(rowStartedAt);
    row = [];
    started = false;
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (!started) {
      rowStartedAt = line;
      started = true;
    }

    if (quoted) {
      if (c === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        if (c === "\n") line++;
        field += c;
      }
      continue;
    }

    if (c === '"' && field === "") {
      quoted = true;
    } else if (c === d) {
      endField();
    } else if (c === "\r") {
      // Part of CRLF. The \n that follows ends the row.
    } else if (c === "\n") {
      line++;
      endRow();
    } else {
      field += c;
    }
  }

  // A file that does not end in a newline still has a last row.
  if (started || field !== "" || row.length > 0) endRow();

  return { cells, lines };
}

/** Removes rows that are entirely blank, which trailing newlines and Excel both produce. */
const isBlank = (row: string[]) => row.every((c) => c.trim() === "");

/**
 * Reads a sheet with its first row as headers.
 *
 * Duplicate headers are suffixed rather than silently overwriting each other,
 * because a file with two columns called "Email" is a file where the second one
 * is about to disappear without anybody being told.
 */
export function readSheet(text: string, delimiter?: string): Sheet {
  const { cells, lines } = parseDelimited(text, delimiter);
  const body = cells.filter((r) => !isBlank(r));
  const bodyLines = lines.filter((_, i) => !isBlank(cells[i]!));

  if (body.length === 0) return { headers: [], rows: [], lineNumbers: [] };

  const seen = new Map<string, number>();
  const headers = body[0]!.map((h, i) => {
    const name = h.trim() || `Column ${i + 1}`;
    const count = seen.get(name.toLowerCase()) ?? 0;
    seen.set(name.toLowerCase(), count + 1);
    return count === 0 ? name : `${name} (${count + 1})`;
  });

  const rows = body.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });

  return { headers, rows, lineNumbers: bodyLines.slice(1) };
}

/**
 * Reads whatever the person chose.
 *
 * A workbook arrives as bytes, a text file as text. The rest of the import
 * pipeline sees one shape either way, so nothing downstream has to know which
 * button somebody pressed in their old system.
 */
export async function readImportFile(input: {
  filename: string;
  text?: string;
  bytes?: Buffer | ArrayBuffer;
}): Promise<Sheet> {
  const { isWorkbookName, readWorkbook } = await import("./xlsx");
  if (input.bytes && isWorkbookName(input.filename)) return readWorkbook(input.bytes);
  if (input.text !== undefined) return readSheet(input.text);
  if (input.bytes) return readSheet(Buffer.from(input.bytes as ArrayBuffer).toString("utf8"));
  return { headers: [], rows: [], lineNumbers: [] };
}
