// ============================================================================
// Spout — shared domain types. One vocabulary across the pipeline, the UI, the
// ledger and the MCP servers. Money is measured, never moved.
// ============================================================================

/** A single statement line, AFTER on-device redaction. Only these three fields
 *  ever leave the machine — account #, balance and name are stripped first. */
export interface RawLine {
  id: string;
  /** the cryptic bank descriptor, e.g. "SQ *GYM8XJ209" */
  descriptor: string;
  /** signed amount in the statement's currency (negative = money out) */
  amount: number;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** last-4 of the card this hit, if the statement distinguishes cards (already
   *  redacted to 4 digits) — used to spot the same service billed on two cards */
  card?: string;
}

export type Cadence = "monthly" | "annual" | "weekly" | "quarterly" | "trial" | "one-off" | "unknown";

export type ReasonKind =
  | "unused"
  | "price_creep"
  | "duplicate"
  | "gray"
  | "trial_converting"
  | "paused"
  | "recurring"
  | "ambiguous";

export interface Reason {
  kind: ReasonKind;
  /** short mono label shown as a chip, e.g. "▲ price creep · $3.99 → $6.99" */
  label: string;
  /** structured detail for the ledger */
  detail?: Record<string, unknown>;
}

export type Verdict = "cut" | "keep" | "ask";
export type Channel = "email" | "portal" | "phone";

/** A decoded, clustered, detected recurring charge — the unit of the leak-map. */
export interface Charge {
  id: string;
  /** the raw cryptic descriptor(s) that clustered into this charge */
  descriptor: string;
  /** all descriptors that clustered here (dup-across-cards shows >1) */
  descriptors?: string[];
  /** decoded real merchant, e.g. "Anytime Fitness" (null while unknown) */
  merchant: string | null;
  /** what kind of service, e.g. "gym membership" */
  category?: string;
  /** 0..1 confidence in the decode */
  confidence: number;
  cadence: Cadence;
  /** normalised monthly amount */
  amountMonthly: number;
  /** annualised amount = the money you'd stop paying (measured, not moved) */
  amountYear: number;
  reasons: Reason[];
  /** the recommended verdict; the user always confirms at Gate 1 */
  verdict: Verdict;
  /** how this merchant is cancelled (from the cancel-directory) */
  channel: Channel;
  /** true when this is the sacred, whitelisted keep shown apart */
  sacred?: boolean;
  /** true when regex baseline also independently flagged this as recurring */
  regexCaught?: boolean;
}

export interface Diagnosis {
  /** every flagged silent charge (the "N silent charges") */
  charges: Charge[];
  /** the sacred keeps shown apart (iCloud+ etc.) */
  kept: Charge[];
