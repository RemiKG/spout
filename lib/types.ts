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
  /** total annualised $ across the charges marked `cut` */
  totalYear: number;
  /** how many the LLM/engine surfaced */
  spoutCaught: number;
  /** how many a plain regex baseline independently surfaced */
  regexCaught: number;
  /** the per-capability comparison rows for the ledger table */
  comparison: ComparisonRow[];
  /** total lines read, recurring count */
  lines: number;
  recurring: number;
  /** true = this is the pre-seeded demo statement (shows the DEMO ribbon) */
  demo: boolean;
  /** true = produced by the real Qwen path; false = regex-only / demo fallback */
  ai: boolean;
}

export interface ComparisonRow {
  what: string;
  regex: "yes" | "no" | "partial";
  spout: "yes" | "no" | "partial";
}

/** A drafted cancellation, its channel, and (for portal/phone) the honest pack. */
export interface Cancellation {
  chargeId: string;
  merchant: string;
  channel: Channel;
  amountYear: number;
  /** email path */
  to?: string;
  subject?: string;
  body?: string;
  /** portal/phone path — the honest one-tap pack */
  pack?: { steps: string[]; deepLink?: string; phone?: string; script?: string };
  state: "drafted" | "sending" | "sent" | "reading_reply" | "pack_ready" | "skipped" | "confirmed";
  /** true when a real send actually went out from the user's inbox */
  sentReal?: boolean;
}

/** A message in a retention negotiation thread. */
export interface ThreadMessage {
  from: string;
  to?: string;
  role: "user" | "merchant" | "draft";
  body: string;
  at: string;
  /** for the draft: not sent yet */
  draft?: boolean;
}

export interface Negotiation {
  chargeId: string;
  merchant: string;
  thread: ThreadMessage[];
  /** the otter's drafted counter, awaiting Gate 3 */
  draftCounter?: string;
  /** structured offer parsed from the merchant reply */
  offer?: { kind: string; label: string; monthly?: number; months?: number };
  winRateVsNaive?: number; // e.g. +0.38
}

// ---- ledger ----
export type LedgerEventType =
  | "read" | "decode" | "detect" | "ask" | "gate1"
  | "draft" | "gate2" | "send" | "pack" | "reply" | "gate3" | "confirm" | "disconnect" | "connect";

export interface LedgerEvent {
  ev: LedgerEventType;
  at: string;               // ISO timestamp
  seq: number;              // monotonic
  prev: string;             // hash of the previous line ("" for genesis)
  hash: string;             // sha256 of {seq,at,ev,data,prev}
  data: Record<string, unknown>;
}

// ---- settings (Control Room) ----
export interface Settings {
  redact: { accounts: boolean; balances: boolean; name: boolean };
  askBelow: number;          // confidence dial, e.g. 0.85
  alwaysAskOverMonthly: number; // $/mo, e.g. 40
  showBaseline: boolean;
  mode: "personal" | "business";
  retentionDays: number;     // ledger retention, e.g. 90
  models: {
    read: string; unmask: string; detect: string; draft: string; negotiate: string;
  };
}

// ---- capability probe (what's live right now) ----
export interface Capabilities {
  qwen: boolean;      // DASHSCOPE_API_KEY present → AI leak-map live
  gmail: boolean;     // Google OAuth configured → real send available
  baseUrl: string;    // the dashscope-intl endpoint (shown in Control Room)
  models: Record<string, string>;
}
