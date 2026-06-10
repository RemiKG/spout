// ============================================================================
// Client-side statement parsing. Runs in the BROWSER so the raw file never has
// to leave the device before redaction. CSV + text-PDF are extracted here into
// merchant·amount·date rows; images/scanned PDFs are handed to the VL reader
// (qwen3-vl-plus) with an honest note that pixels must reach the model to be read.
// ============================================================================
import Papa from "papaparse";
import type { RawLine } from "../types";

export type ParseKind = "csv" | "pdf" | "image";
export interface ParseResult {
  kind: ParseKind;
  lines: RawLine[];
  /** for images/scanned PDFs: a data URL to send to the VL reader */
  imageDataUrl?: string;
  needsVL?: boolean;
}

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/;
const AMT_RE = /-?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\$?\s?\d+\.\d{2}/g;

let uid = 0;
const nextId = () => `l${Date.now().toString(36)}-${uid++}`;

function toISO(d: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = d.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return d;
  let [, a, b, y] = m;
  if (y.length === 2) y = "20" + y;
  // assume M/D/Y (US bank exports)
  return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  const neg = /^\(|-|DR\b/i.test(s.trim());
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return NaN;
  return neg ? -Math.abs(n) : n;
}

// ---- CSV --------------------------------------------------------------------
function parseCsv(text: string): RawLine[] {
  const res = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = res.data as unknown as string[][];
  if (!rows.length) return [];
  // find header
  const header = rows[0].map((h) => String(h).toLowerCase());
  const looksHeader = header.some((h) => /date|desc|amount|debit|credit|merchant|transaction/.test(h));
  const idx = {
    date: header.findIndex((h) => /date/.test(h)),
    desc: header.findIndex((h) => /desc|merchant|detail|transaction|payee|narrative/.test(h)),
    amount: header.findIndex((h) => /amount|debit|value/.test(h)),
    card: header.findIndex((h) => /card|acct|account|last ?4/.test(h)),
  };
  const body = looksHeader ? rows.slice(1) : rows;
  const out: RawLine[] = [];
  for (const r of body) {
    const cells = r.map((c) => String(c ?? "").trim());
    if (!cells.length) continue;
    let date = idx.date >= 0 ? cells[idx.date] : cells.find((c) => DATE_RE.test(c)) || "";
    let desc = idx.desc >= 0 ? cells[idx.desc] : "";
    let amtCell = idx.amount >= 0 ? cells[idx.amount] : "";
    if (!desc) {
      // pick the longest non-date, non-amount cell as the descriptor
      desc = cells.filter((c) => c && !DATE_RE.test(c) && !/^-?\$?[\d.,]+$/.test(c)).sort((a, b) => b.length - a.length)[0] || "";
    }
    if (!amtCell) amtCell = cells.find((c) => /^-?\(?\$?[\d.,]+\)?$/.test(c)) || "";
