// ============================================================================
// The Receipt Ledger — append-only, hash-chained NDJSON. Every decode, decision,
// message, reply and shut is written here, timestamped and linked to the prior
// line by hash. Exportable as NDJSON or CSV. Persists in the browser (and,
// optionally, server-side on the Alibaba deploy). Nothing hidden.
// ============================================================================
import type { LedgerEvent, LedgerEventType, Charge, Diagnosis } from "../types";
import { sha256 } from "./sha256";

export class Ledger {
  events: LedgerEvent[] = [];

  constructor(events: LedgerEvent[] = []) {
    this.events = events;
  }

  private lastHash(): string {
    return this.events.length ? this.events[this.events.length - 1].hash : "";
  }

  /** Append an event; returns it. `at` is injectable for deterministic tests. */
  append(ev: LedgerEventType, data: Record<string, unknown>, at?: string): LedgerEvent {
    const seq = this.events.length;
    const prev = this.lastHash();
    const stamp = at ?? new Date().toISOString();
    const payload = JSON.stringify({ seq, at: stamp, ev, data, prev });
    const hash = sha256(payload);
    const e: LedgerEvent = { ev, at: stamp, seq, prev, hash, data };
    this.events.push(e);
    return e;
  }

  /** Verify the chain is intact (no line altered or removed). */
  verify(): { ok: boolean; brokenAt?: number } {
    let prev = "";
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      const payload = JSON.stringify({ seq: e.seq, at: e.at, ev: e.ev, data: e.data, prev });
      if (sha256(payload) !== e.hash || e.prev !== prev || e.seq !== i) return { ok: false, brokenAt: i };
      prev = e.hash;
    }
    return { ok: true };
  }

  toNDJSON(): string {
    return this.events
      .map((e) => JSON.stringify({ ts: e.at, seq: e.seq, ev: e.ev, ...e.data, _prev: e.prev.slice(0, 8), _hash: e.hash.slice(0, 8) }))
      .join("\n");
  }

  toJSON(): LedgerEvent[] {
    return this.events;
  }

  clear() {
    this.events = [];
  }
}

/** Turn a diagnosis into a leak-map CSV (the "↓ Leak-map (CSV)" export). */
export function leakMapCsv(d: Diagnosis): string {
  const head = "descriptor,merchant,category,confidence,cadence,monthly,per_year,reasons,verdict,channel";
  const row = (c: Charge) =>
    [
      csv(c.descriptor), csv(c.merchant ?? ""), csv(c.category ?? ""), c.confidence.toFixed(2),
      c.cadence, c.amountMonthly.toFixed(2), String(c.amountYear),
      csv(c.reasons.map((r) => r.label).join("; ")), c.verdict, c.channel,
    ].join(",");
  return [head, ...d.charges.map(row), ...d.kept.map(row)].join("\n");
}

function csv(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A reason's `detail` should be a structured object, but the detect model may
 *  return a plain string — never spread a string (it explodes into per-char keys). */
function detailFields(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return v == null || v === "" ? {} : { detail: String(v) };
}

/** Seed the read/decode/detect/ask events for a completed diagnosis. Stamps are
 *  real wall-clock times: the pipeline just finished, so the sequence is anchored
 *  to end at "now", one line per second, in order. */
export function seedLedgerFromDiagnosis(d: Diagnosis): Ledger {
  const rows: { ev: LedgerEventType; data: Record<string, unknown> }[] = [
    { ev: "read", data: { stmt: d.demo ? "demo-statement.csv" : "statement", lines: d.lines, redacted: ["acct", "balance", "name"] } },
  ];
  for (const c of d.charges) {
    rows.push({ ev: "decode", data: { raw: c.descriptor, merchant: c.merchant, conf: c.confidence } });
  }
  for (const c of d.charges) {
    const r = c.reasons[0];
    if (r && r.kind !== "recurring") rows.push({ ev: "detect", data: { merchant: c.merchant, pattern: r.kind, ...detailFields(r.detail) } });
    if (c.verdict === "ask") rows.push({ ev: "ask", data: { merchant: c.merchant, q: r?.label ?? "needed, or abandoned?", guess: null } });
  }
  const led = new Ledger();
  const base = Date.now() - rows.length * 1000;
  rows.forEach((row, i) => led.append(row.ev, row.data, new Date(base + (i + 1) * 1000).toISOString()));
  // NB: the live `gate1` event is appended by the store when the user approves —
  // the seed stops at read/decode/detect/ask so it isn't duplicated.
  return led;
}
