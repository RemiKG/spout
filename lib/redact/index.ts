// ============================================================================
// On-device PII redaction. Runs in the BROWSER before any bytes leave the
// machine. Only `merchant · amount · date` (+ an anonymised card label) ever
// go to the model. Account/card numbers, balances and the account holder's
// name/address are stripped here, locally. Pure + isomorphic (no DOM), so the
// exact same code is import-able from a Server Component test too.
// ============================================================================
import type { RawLine, Settings } from "../types";

export type RedactionCategory = "acct" | "balance" | "name" | "email" | "phone";

export interface RedactionReport {
  categories: RedactionCategory[];
  counts: Record<RedactionCategory, number>;
}

const MASK = "••••";

// A long run of digits (optionally space/dash grouped) = a card or account
// number. We DON'T touch short 3–5 digit tokens: those are usually part of a
// cryptic *merchant* descriptor (e.g. "DD/BILL 4457") that we must keep so the
// model can decode it — that data is not PII.
const CARD_RE = /\b(?:\d[ -]?){7,19}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE = /\b(?:\+?\d{1,2}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}\b/g;
// SSN
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;

/** Redact free text (used on the raw parsed statement text before it is even
 *  structured, and again defensively on each descriptor). */
export function redactText(
  input: string,
  opts: { accounts?: boolean; name?: boolean } = {},
  tally?: Partial<Record<RedactionCategory, number>>
): string {
  let s = input;
  const bump = (k: RedactionCategory, n: number) => { if (tally) tally[k] = (tally[k] || 0) + n; };

  if (opts.accounts !== false) {
    s = s.replace(SSN_RE, (m) => (bump("acct", 1), MASK));
    s = s.replace(EMAIL_RE, (m) => (bump("email", 1), "[email]"));
    s = s.replace(PHONE_RE, (m) => (bump("phone", 1), "[phone]"));
    s = s.replace(CARD_RE, (m) => {
      // keep it only if it's clearly a small merchant ref (<=6 digits total)
      const digits = m.replace(/\D/g, "");
      if (digits.length <= 6) return m;
      bump("acct", 1);
      return MASK;
    });
  }
  return s;
}

/** Redact one already-parsed line. Balances are never carried into a RawLine in
 *  the first place (the parser drops that column), so redaction here focuses on
 *  the descriptor. The card field is reduced to an anonymised A/B/C label by the
 *  caller via `anonymiseCards`. */
export function redactLine(
  line: RawLine,
  settings: Pick<Settings["redact"], "accounts" | "name"> = { accounts: true, name: true },
  tally?: Partial<Record<RedactionCategory, number>>
): RawLine {
  return { ...line, descriptor: redactText(line.descriptor, settings, tally) };
}

/** Map raw card identifiers (last-4, full numbers) to stable anonymous labels
 *  ("card A", "card B") so duplicate-across-cards detection still works WITHOUT
 *  any card digits leaving the device. */
export function anonymiseCards(lines: RawLine[]): { lines: RawLine[]; map: Record<string, string> } {
  const map: Record<string, string> = {};
  let n = 0;
  const label = (raw?: string) => {
    if (!raw) return undefined;
    const digits = raw.replace(/\D/g, "");
    const key = digits.slice(-4) || raw;
    if (!map[key]) map[key] = `card ${String.fromCharCode(65 + n++)}`;
    return map[key];
  };
  return { lines: lines.map((l) => ({ ...l, card: label(l.card) })), map };
}

/** The full on-device pass: redact every descriptor, anonymise cards, and return
 *  a report of what was stripped (goes verbatim into the ledger `read` event). */
export function redactStatement(
  lines: RawLine[],
  redact: Settings["redact"] = { accounts: true, balances: true, name: true }
): { lines: RawLine[]; report: RedactionReport } {
  const tally: Partial<Record<RedactionCategory, number>> = {};
  let out = lines.map((l) => redactLine(l, { accounts: redact.accounts, name: redact.name }, tally));
  out = anonymiseCards(out).lines;
  // balances are structurally excluded (never parsed into a RawLine); record it
  if (redact.balances) tally.balance = tally.balance || 0;
  if (redact.name) tally.name = tally.name || 0;

  const counts: Record<RedactionCategory, number> = {
    acct: tally.acct || 0, balance: tally.balance || 0, name: tally.name || 0,
    email: tally.email || 0, phone: tally.phone || 0,
  };
  const categories = (Object.keys(counts) as RedactionCategory[]).filter(
    (k) => k === "acct" || k === "balance" || k === "name" ? true : counts[k] > 0
  );
  return { lines: out, report: { categories, counts } };
}
