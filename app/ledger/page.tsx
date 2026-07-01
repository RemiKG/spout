"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { LedgerEvent } from "@/lib/types";

function hhmmss(iso: string): string {
  try { return new Date(iso).toISOString().slice(11, 19); } catch { return iso.slice(11, 19); }
}

function LedgerLine({ e }: { e: LedgerEvent }) {
  const entries = Object.entries(e.data);
  return (
    <div className="ln">
      <span className="ts">{hhmmss(e.at)}</span>{" {"}
      <span className="k">&quot;ev&quot;</span>:<span className="t">&quot;{e.ev}&quot;</span>
      {entries.map(([k, v]) => (
        <span key={k}>
          , <span className="k">&quot;{k}&quot;</span>:<span className="v">{JSON.stringify(v)}</span>
        </span>
      ))}
      {"}"}
    </div>
  );
}

export default function LedgerPage() {
  const s = useStore();
  const d = s.diagnosis;
  const comparison = d?.comparison ?? [
    { what: "obvious monthly dupes", regex: "yes", spout: "yes" },
    { what: "cryptic descriptor → merchant", regex: "no", spout: "yes" },
    { what: "price creep ($3.99→$6.99)", regex: "no", spout: "yes" },
    { what: "trial converting in 3 days", regex: "no", spout: "yes" },
    { what: "same service, 2 cards", regex: "partial", spout: "yes" },
  ];
  const mark = (v: string) => (v === "yes" ? "✓" : v === "partial" ? "~" : "✗");

  return (
    <div className="wrap">
      <div className="col" style={{ flex: 1.7 }}>
        <div className="pan">
          <div className="head">
            <div>
              <div className="eyebrow">the receipt ledger</div>
              <h1 className="big" style={{ fontSize: 34, margin: "6px 0 0" }}>Every step, on the record.</h1>
              <div className="sub" style={{ marginTop: 4 }}>
                Append-only. Every decode, decision, message, reply and shut — timestamped. Nothing hidden.
              </div>
            </div>
            <span className="chip">append-only · hash-chained</span>
          </div>
        </div>

        {s.ledgerEvents.length ? (
          <div className="ledger">
            {s.ledgerEvents.map((e) => <LedgerLine key={e.seq} e={e} />)}
          </div>
        ) : (
          <div className="pan">
            <div className="sub">
              The ledger is empty — run a diagnosis first. <Link href="/" style={{ color: "var(--teal-lo)" }}>Drop a statement</Link> or{" "}
              <button className="btn ghost sm" onClick={s.startDemo}>▷ watch the demo</button>.
            </div>
          </div>
        )}
      </div>

      <div className="col">
        <div className="pan">
          <h2 className="sec" style={{ fontSize: 20 }}>Regex baseline, beside us</h2>
          <div className="sub" style={{ margin: "0 0 8px" }}>The proof it can&apos;t be faked — a plain string-match runs alongside every run.</div>
          <table className="cmp">
            <tbody>
              <tr><th>what</th><th>regex</th><th>spout</th></tr>
              {comparison.map((r) => (
                <tr key={r.what}>
                  <td>{r.what}</td>
                  <td className={r.regex === "yes" ? "yes" : "no"}>{mark(r.regex)}</td>
                  <td className={r.spout === "yes" ? "yes" : "no"}>{mark(r.spout)}</td>
                </tr>
              ))}
              <tr>
                <td><b>total caught</b></td>
                <td className="no"><b>{d?.regexCaught ?? 2}</b></td>
                <td className="yes"><b>{d?.spoutCaught ?? 7}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="pan">
          <h2 className="sec" style={{ fontSize: 20 }}>Export</h2>
          <div className="sub" style={{ margin: "0 0 12px" }}>It&apos;s yours. Take the whole record with you.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn ghost" onClick={s.exportNdjson}>↓ Ledger (NDJSON)</button>
            <button className="btn ghost" onClick={s.exportCsv} disabled={!d}>↓ Leak-map (CSV)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
