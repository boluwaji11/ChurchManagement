/**
 * HRT-38. Reading a real .xlsx workbook (R19.1).
 *
 * Every case here is built by writing a workbook and reading it back, rather
 * than by checking a fixture somebody trimmed until it passed. The cases are the
 * ones a church's export actually contains: a birthday stored as a date, a phone
 * number typed into a numeric cell, a name that is a formula, a bolded word, and
 * a blank column in the middle.
 */
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { readWorkbook, isWorkbookName } from "../src/import/xlsx";

async function workbook(build: (sheet: ExcelJS.Worksheet) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("People");
  build(sheet);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("reading a workbook", () => {
  it("reads headers and rows", async () => {
    const file = await workbook((s) => {
      s.addRow(["First Name", "Last Name"]);
      s.addRow(["Sarah", "Bennett"]);
      s.addRow(["Daniel", "Ramirez"]);
    });

    const sheet = await readWorkbook(file);
    expect(sheet.headers).toEqual(["First Name", "Last Name"]);
    expect(sheet.rows).toEqual([
      { "First Name": "Sarah", "Last Name": "Bennett" },
      { "First Name": "Daniel", "Last Name": "Ramirez" },
    ]);
  });

  it("reads a date cell as a date, not as the number Excel stores", async () => {
    const file = await workbook((s) => {
      s.addRow(["First Name", "DOB"]);
      const row = s.addRow(["Sarah", new Date(Date.UTC(1986, 3, 12))]);
      row.getCell(2).numFmt = "dd/mm/yyyy";
    });

    const sheet = await readWorkbook(file);
    // Not 31514, and not 1900 either.
    expect(sheet.rows[0]!["DOB"]).toBe("1986-04-12");
  });

  it("does not turn a numeric phone number into scientific notation", async () => {
    const file = await workbook((s) => {
      s.addRow(["First Name", "Phone"]);
      s.addRow(["Sarah", 5125550148]);
    });

    const sheet = await readWorkbook(file);
    expect(sheet.rows[0]!["Phone"]).toBe("5125550148");
  });

  it("takes the result of a formula, which is what the person sees", async () => {
    const file = await workbook((s) => {
      s.addRow(["First Name", "Full Name"]);
      s.addRow(["Sarah", { formula: 'A2&" Bennett"', result: "Sarah Bennett" }]);
    });

    const sheet = await readWorkbook(file);
    expect(sheet.rows[0]!["Full Name"]).toBe("Sarah Bennett");
  });

  it("reads a cell whose text was partly bolded as one string", async () => {
    const file = await workbook((s) => {
      s.addRow(["First Name"]);
      s.addRow([{ richText: [{ text: "Sar" }, { text: "ah", font: { bold: true } }] }]);
    });

    const sheet = await readWorkbook(file);
    expect(sheet.rows[0]!["First Name"]).toBe("Sarah");
  });

  it("keeps a blank column in the middle from shifting the values past it", async () => {
    const file = await workbook((s) => {
      s.addRow(["First Name", "Unused", "Last Name"]);
      const row = s.addRow([]);
      row.getCell(1).value = "Sarah";
      row.getCell(3).value = "Bennett";
    });

    const sheet = await readWorkbook(file);
    expect(sheet.rows[0]).toEqual({ "First Name": "Sarah", Unused: "", "Last Name": "Bennett" });
  });

  it("ignores blank rows and reports the sheet's own row numbers", async () => {
    const file = await workbook((s) => {
      s.addRow(["First Name"]);
      s.addRow([]);
      s.addRow(["Sarah"]);
    });

    const sheet = await readWorkbook(file);
    expect(sheet.rows).toHaveLength(1);
    // Row 3 of the sheet, so a message can say "row 3".
    expect(sheet.lineNumbers[0]).toBe(3);
  });

  it("does not let a second column of the same name eat the first", async () => {
    const file = await workbook((s) => {
      s.addRow(["Email", "Email"]);
      s.addRow(["a@example.org", "b@example.org"]);
    });

    const sheet = await readWorkbook(file);
    expect(sheet.headers).toEqual(["Email", "Email (2)"]);
  });

  it("returns nothing for an empty workbook rather than throwing", async () => {
    const file = await workbook(() => {});
    expect(await readWorkbook(file)).toEqual({ headers: [], rows: [], lineNumbers: [] });
  });

  it("recognises a workbook by its name", () => {
    expect(isWorkbookName("directory.xlsx")).toBe(true);
    expect(isWorkbookName("DIRECTORY.XLS")).toBe(true);
    expect(isWorkbookName("directory.csv")).toBe(false);
  });
});
