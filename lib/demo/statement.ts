// ============================================================================
// The pre-seeded DEMO statement (clearly labelled with a DEMO ribbon in the UI).
// It is a realistic, anonymised 3-month statement so the regex baseline GENUINELY
// runs on it and surfaces exactly 2 obvious recurring charges, while the full
// engine surfaces 7 silent ones. Merchant names are fictionalised where needed.
// Canonical numbers: $412/yr = 5 cuts.
// ============================================================================
import type { RawLine, Charge, Negotiation, ComparisonRow } from "../types";

const L = (descriptor: string, amount: number, date: string, card?: string): RawLine => ({
  id: `${date}:${descriptor}:${amount}`, descriptor, amount, date, card,
});

// Debits are negative, credits (income) positive. Only descriptor·amount·date
// are present — this is the post-redaction shape (no acct#, balance or name).
export const DEMO_STATEMENT_LINES: RawLine[] = [
  // income
  L("PAYROLL DEP ACME CORP", 3200.0, "2026-05-01"),
  L("PAYROLL DEP ACME CORP", 3200.0, "2026-06-01"),
  L("PAYROLL DEP ACME CORP", 3200.0, "2026-07-01"),
  // rent (July has a late fee → breaks the identical-×3 signature, honestly)
  L("RENT ACH MAPLEWOOD", -1800.0, "2026-05-01"),
  L("RENT ACH MAPLEWOOD", -1800.0, "2026-06-01"),
  L("RENT ACH MAPLEWOOD", -1825.0, "2026-07-01"),
  // groceries / coffee / utilities (varying → not "obvious recurring")
  L("WHOLEFOODS MKT #123", -84.2, "2026-05-05", "4021"),
  L("TRADER JOES #455", -52.71, "2026-05-18", "4021"),
  L("SQ *BLUEBOTTLE", -5.75, "2026-05-09", "4021"),
  L("SHELL OIL 9982", -48.1, "2026-05-14", "4021"),
  L("CITY POWER UTIL", -96.4, "2026-05-28", "4021"),
  L("WHOLEFOODS MKT #123", -103.44, "2026-06-06", "4021"),
  L("TRADER JOES #455", -61.02, "2026-06-19", "4021"),
  L("SQ *BLUEBOTTLE", -6.5, "2026-06-11", "4021"),
  L("CITY POWER UTIL", -88.15, "2026-06-27", "4021"),
  L("WHOLEFOODS MKT #123", -77.88, "2026-07-05", "4021"),
  L("SQ *BLUEBOTTLE", -5.75, "2026-07-02", "4021"),
  L("AMZN MKTP US*2X4Q1", -34.99, "2026-05-22", "4021"),
  L("UBER *TRIP", -18.4, "2026-06-09", "4021"),
  L("AMZN MKTP US*9F1K0", -12.25, "2026-07-11", "4021"),
  // --- the recurring subscriptions ---
  // Anytime Fitness — clean identical ×3 → the regex baseline WILL catch this one
  L("SQ *GYM8XJ209", -12.99, "2026-05-03", "4021"),
  L("SQ *GYM8XJ209", -12.99, "2026-06-03", "4021"),
  L("SQ *GYM8XJ209", -12.99, "2026-07-03", "4021"),
  // iCloud+ — clean identical ×3 → regex catches (but it's a sacred KEEP)
  L("APLPAY 8.99", -8.99, "2026-05-08", "4021"),
  L("APLPAY 8.99", -8.99, "2026-06-08", "4021"),
  L("APLPAY 8.99", -8.99, "2026-07-08", "4021"),
  // NewsPlus — price creep 3.99 → 6.99 (no single amount ×3 → regex misses the creep)
  L("DD/BILL 4457", -3.99, "2026-05-12", "4021"),
  L("DD/BILL 4457", -6.99, "2026-06-12", "4021"),
  L("DD/BILL 4457", -6.99, "2026-07-12", "4021"),
  // Streamflix — duplicated across TWO cards (each descriptor only ×2 → regex misses the dup)
  L("NFLX*7742", -6.99, "2026-06-15", "4021"),
  L("NFLX*7742", -6.99, "2026-07-15", "4021"),
  L("NFLX*7108", -6.99, "2026-06-15", "7108"),
  L("NFLX*7108", -6.99, "2026-07-15", "7108"),
  // MealBoxes — paused usage but still billing (started June → only ×2)
  L("SQ*MB2231", -4.33, "2026-06-20", "4021"),
  L("SQ*MB2231", -4.33, "2026-07-20", "4021"),
  // PhotoApp — ambiguous (needed or abandoned?) → ASK, not guess
  L("PP*PHOTOZ 3.33", -3.33, "2026-06-22", "4021"),
  L("PP*PHOTOZ 3.33", -3.33, "2026-07-22", "4021"),
  // RingtoneClub — a new unrecognised "gray" micro-charge (×1)
  L("BILL*RNG88", -2.99, "2026-07-06", "4021"),
  // CloudGym — free trial that converts to $19.99 in 3 days ($0 now)
  L("GOOGLE*TEMP 0.00", 0.0, "2026-07-01", "4021"),
];

// The canonical decoded leak-map (what the real Qwen path would return on this
// statement; shown verbatim in the DEMO path). Order = as in Gate 1.
export const DEMO_CHARGES: Charge[] = [
  {
    id: "anytime", descriptor: "SQ *GYM8XJ209", merchant: "Anytime Fitness",
    category: "gym membership", confidence: 0.97, cadence: "monthly",
    amountMonthly: 12.99, amountYear: 156, verdict: "cut", channel: "email", regexCaught: true,
    reasons: [{ kind: "unused", label: "unused 5 months", detail: { months: 5 } }],
  },
  {
    id: "newsplus", descriptor: "DD/BILL 4457", merchant: "NewsPlus",
    category: "news subscription", confidence: 0.92, cadence: "monthly",
    amountMonthly: 6.99, amountYear: 84, verdict: "cut", channel: "email",
    reasons: [{ kind: "price_creep", label: "▲ price creep · $3.99 → $6.99", detail: { from: 3.99, to: 6.99 } }],
  },
  {
    id: "streamflix", descriptor: "NFLX*7742 · ·7108", descriptors: ["NFLX*7742", "NFLX*7108"],
    merchant: "Streamflix — 2nd card", category: "video streaming", confidence: 0.98, cadence: "monthly",
    amountMonthly: 6.99, amountYear: 84, verdict: "cut", channel: "email",
    reasons: [{ kind: "duplicate", label: "duplicate · 2 cards", detail: { cards: 2 } }],
  },
  {
    id: "mealboxes", descriptor: "SQ*MB2231", merchant: "MealBoxes",
    category: "meal-kit", confidence: 0.95, cadence: "monthly",
    amountMonthly: 4.33, amountYear: 52, verdict: "cut", channel: "portal",
    reasons: [{ kind: "paused", label: "paused · still billing" }],
  },
  {
    id: "ringtoneclub", descriptor: "BILL*RNG88", merchant: "RingtoneClub",
    category: "premium SMS", confidence: 0.88, cadence: "monthly",
    amountMonthly: 2.99, amountYear: 36, verdict: "cut", channel: "phone",
    reasons: [{ kind: "gray", label: "gray charge · unrecognized" }],
  },
  {
    id: "cloudgym", descriptor: "GOOGLE*TEMP 0.00", merchant: "CloudGym — free trial",
    category: "fitness app", confidence: 0.9, cadence: "trial",
    amountMonthly: 19.99, amountYear: 240, verdict: "cut", channel: "email",
    reasons: [{ kind: "trial_converting", label: "converts to $19.99 in 3 days", detail: { in_days: 3, to: 19.99 } }],
  },
  {
    id: "photoapp", descriptor: "PP*PHOTOZ 3.33", merchant: "PhotoApp — unclear",
    category: "photo app", confidence: 0.62, cadence: "monthly",
    amountMonthly: 3.33, amountYear: 40, verdict: "ask", channel: "portal",
    reasons: [{ kind: "ambiguous", label: "need iCloud, or abandoned? · I'll ask" }],
  },
];

export const DEMO_KEPT: Charge[] = [
  {
    id: "icloud", descriptor: "APLPAY 8.99", merchant: "iCloud+",
    category: "cloud storage", confidence: 0.99, cadence: "monthly",
    amountMonthly: 8.99, amountYear: 108, verdict: "keep", channel: "portal", sacred: true, regexCaught: true,
    reasons: [{ kind: "recurring", label: "you use it every day" }],
  },
];

export const DEMO_COMPARISON: ComparisonRow[] = [
  { what: "obvious monthly dupes", regex: "yes", spout: "yes" },
  { what: "cryptic descriptor → merchant", regex: "no", spout: "yes" },
  { what: "price creep ($3.99→$6.99)", regex: "no", spout: "yes" },
  { what: "trial converting in 3 days", regex: "no", spout: "yes" },
  { what: "same service, 2 cards", regex: "partial", spout: "yes" },
];

export const DEMO_NEGOTIATION: Negotiation = {
  chargeId: "newsplus",
  merchant: "NewsPlus",
  offer: { kind: "discount", label: "50% off for 6 months", monthly: 3.49, months: 6 },
  winRateVsNaive: 0.38,
  thread: [
    {
      role: "user", from: "you@gmail.com", to: "NewsPlus",
      at: "2026-07-08T09:38:00Z",
      body: "Please cancel my NewsPlus subscription effective the end of this billing cycle, and confirm in writing.",
    },
    {
      role: "merchant", from: "NewsPlus Retention <stay@newsplus.example>",
      at: "2026-07-08T09:40:00Z",
      body: "We'd hate to see you go! Here's an exclusive 50% off for 6 months — that's just $3.49/mo. Reply STAY to keep your subscription at this rate.",
    },
    {
      role: "draft", from: "◆ Otter's draft — not sent yet", draft: true,
      at: "2026-07-08T09:41:00Z",
      body: "Thanks, but 50% for 6 months and then back to $6.99 isn't worth it to me. I'll stay only if you can lock $3.49/mo for 12 months. Otherwise, please proceed with the cancellation at the end of the cycle and confirm in writing.",
    },
  ],
};

/** A downloadable CSV of the demo statement, so a visitor can also exercise the
 *  REAL upload path with it (parse + redact + baseline all run for real). */
export function demoCsv(): string {
  const head = "Date,Description,Amount,Card";
  const rows = DEMO_STATEMENT_LINES.map(
    (l) => `${l.date},"${l.descriptor}",${l.amount.toFixed(2)},${l.card ?? ""}`
  );
  return [head, ...rows].join("\n");
}
