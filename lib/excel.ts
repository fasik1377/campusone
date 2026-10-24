import "server-only";
import ExcelJS from "exceljs";
import { badRequest } from "./api";

export type SheetSpec = {
  name: string;
  title?: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, unknown>[];
  /** Columns the user should not edit when re-uploading (shaded grey). */
  lockedKeys?: string[];
};

const NAVY = "FF102A43";
const GOLD = "FFD6A84F";

export async function buildWorkbook(sheets: SheetSpec[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CampusOne";
  wb.created = new Date();
  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name.slice(0, 31));
    ws.columns = spec.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(14, c.header.length + 4) }));
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    header.border = { bottom: { style: "thin", color: { argb: GOLD } } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const row of spec.rows) ws.addRow(row);
    if (spec.lockedKeys?.length) {
      for (const key of spec.lockedKeys) {
        ws.getColumn(key).eachCell((cell, rowNumber) => {
          if (rowNumber > 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        });
      }
    }
  }
  return wb.xlsx.writeBuffer();
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Reads the first worksheet into objects keyed by the header row (trimmed, case-insensitive lookups via `get`). */
export async function readUploadedSheet(file: File | null) {
  if (!file || typeof file === "string") throw badRequest("Please choose an Excel (.xlsx) file to upload.");
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest("The file is larger than 5 MB.");
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw badRequest("Only .xlsx Excel files are supported.");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
  } catch {
    throw badRequest("The file could not be read as an Excel workbook.");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw badRequest("The workbook has no worksheets.");
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = cellText(cell.value).trim().toLowerCase();
  });
  const rows: { rowNumber: number; get: (header: string) => string }[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (headers[col]) values[headers[col]] = cellText(cell.value).trim();
    });
    if (Object.values(values).every((v) => !v)) return;
    rows.push({ rowNumber, get: (h) => values[h.toLowerCase()] ?? "" });
  });
  return rows;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("hyperlink" in value) return String(value.hyperlink);
  }
  return String(value);
}

export const stamp = () => new Date().toISOString().slice(0, 10);

export const STUDENT_COLUMNS = [
  { header: "Student ID", key: "studentId", width: 16 },
  { header: "First Name", key: "firstName", width: 18 },
  { header: "Last Name", key: "lastName", width: 18 },
  { header: "Email", key: "email", width: 28 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Gender", key: "gender", width: 10 },
  { header: "Date of Birth", key: "dateOfBirth", width: 15 },
  { header: "Program Code", key: "programCode", width: 15 },
  { header: "Cohort", key: "cohort", width: 10 },
  { header: "Study Mode", key: "studyMode", width: 14 },
];

export const fmtDate = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
