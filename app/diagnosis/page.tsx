"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import Waterworks from "@/components/Waterworks";
import SplitFlap from "@/components/SplitFlap";
import type { Charge, Verdict } from "@/lib/types";

export default function DiagnosisPage() {
  const s = useStore();
  const { phase, diagnosis } = s;

  if (phase === "idle" && !diagnosis) return <EmptyState />;
  if (phase === "gate3") return <Gate3View />;
  if (phase === "done") return <DoneView />;

  return (
    <div className="wrap">
      <div className="canvas sticky">
        <Waterworks
          caption={
            <div className="cap">
              <span className="chip leak">
                {phase === "reading" ? "● LIVE · your statement" : phase === "shutoff" ? "⚙ shutting — valve by valve" : "● the leak map"}
              </span>
            </div>
          }
        />
        {s.demo && <div className="demo-ribbon">DEMO</div>}
      </div>
      <div className="col">
        {phase === "reading" && <Reading />}
        {phase === "gate1" && <Gate1 />}
        {phase === "shutoff" && <Shutoff />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- empty state
function EmptyState() {
  const { startDemo } = useStore();
  return (
    <div className="hero-center">
      <h1 className="big" style={{ fontSize: 34 }}>No statement loaded.</h1>
      <div className="sub" style={{ maxWidth: 520, margin: "6px auto 18px" }}>
        Drop your statement to find your leaks, or watch the 30-second demo.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link className="btn brass" href="/">Choose a statement</Link>
        <button className="btn ghost" onClick={startDemo}>▷ Watch the demo</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- reading (S2)
function Reading() {
  const { stage, redactionReport } = useStore();
  const stages = ["READ", "UN-MASK", "DETECT", "MAP"];
  return (
    <>
      <div className="pan">
        <div className="head">
          <div>
            <h2 className="sec">Reading your statement…</h2>
            <div className="sub">A wall of cryptic lines → clean, named rows. <span className="spin" /> ~28&nbsp;seconds.</div>
          </div>
        </div>
        <div className="stages">
          {stages.map((st, i) => (
            <span key={st} style={{ display: "contents" }}>
              <span className={`st ${i < stage ? "done" : i === stage ? "now" : ""}`}>{st}{i < stage ? " ✓" : ""}</span>
              {i < stages.length - 1 && <span className="ar">→</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="pan" style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 20px" }}>
        <div style={{ fontSize: 24, color: "var(--teal-lo)" }}>◆</div>
        <div className="sub" style={{ margin: 0 }}>
          <b>Redacted on your device first.</b> Account numbers, balances and names never leave your machine — only
          <i> merchant · amount · date</i> reach the model{redactionReport?.length ? ` (stripped: ${redactionReport.join(", ")})` : ""}.
          Your statement isn&apos;t stored after this session.
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Gate 1 (S3)
function verdictOf(s: ReturnType<typeof useStore>, c: Charge): Verdict {
  return s.verdicts[c.id] ?? c.verdict;
}

function Gate1() {
  const s = useStore();
  const d = s.diagnosis!;
  const cuts = d.charges.filter((c) => verdictOf(s, c) === "cut");
  const billCuts = cuts.filter((c) => c.cadence !== "trial");
  const total = billCuts.reduce((a, c) => a + c.amountYear, 0);
  const askCount = d.charges.filter((c) => verdictOf(s, c) === "ask").length;

  return (
    <>
      <div className="pan">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
          <div>
            <div className="eyebrow">GATE 1 · approve the diagnosis</div>
            <h1 className="big" style={{ fontSize: 38, margin: "6px 0 0" }}>{d.charges.length} silent charges.</h1>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div className="sub" style={{ margin: 0 }}>going out the spout</div>
            <SplitFlap value={`$${total}`} unit="/yr" size={34} />
          </div>
        </div>
        <div className="sub" style={{ marginTop: 12 }}>
          Nothing is sent or shut yet. Confirm each flag — <b>keep</b>, <b>cut</b>, or <b>ask me</b>. A charge you mark
          <b> keep</b> is sacred; I never touch it.
        </div>
        {s.settings.showBaseline && (
          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="reason plain">regex baseline caught {d.regexCaught}</span>
            <span className="ar mut">›</span>
            <span className="reason">Spout caught {d.spoutCaught} — the cryptic &amp; sneaky ones</span>
          </div>
        )}
        {s.notice === "baseline" && (
          <div className="notice" style={{ marginTop: 12 }}>
            <span className="i">◆</span>
            <div>
              This is the <b>honest baseline</b> path — real on-device redaction + a real regex scan of your own rows.
              The AI decode/detect (cryptic → merchant, price creep, trials) turns on when <code>DASHSCOPE_API_KEY</code> is set.
            </div>
          </div>
        )}
      </div>

      <div className="pan">
        {d.charges.map((c) => (
          <ChargeRow key={c.id} charge={c} />
        ))}
        {d.kept.map((k) => (
          <div className="kept-row" key={k.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="chip keep">◆ KEPT — untouched</span>
              <span className="sub" style={{ margin: 0 }}><b>{k.merchant}</b> · {k.descriptor} · {k.reasons[0]?.label || "you use it"}</span>
            </div>
            <span className="amt" style={{ color: "var(--brass-lo)" }}>${k.amountMonthly}/mo</span>
          </div>
        ))}
      </div>

      <div className="gate">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/art/otter-gate.png" alt="the otter, waiting at the valve" />
        <div className="q">
          <div className="t">Shut these {numWord(billCuts.length)}?</div>
          <div className="s">
            ${total}/yr reclaimed.{cuts.some((c) => c.cadence === "trial") ? " The trial I’ll cancel before it charges." : ""}
            {askCount ? ` ${askCount === 1 ? "One charge" : `${askCount} charges`} I’ll ask you about.` : ""}
          </div>
        </div>
        <div className="acts">
          <button className="btn brass" onClick={s.approveGate1} disabled={cuts.length === 0}>
            Approve the {billCuts.length} cut{billCuts.length === 1 ? "" : "s"} →
          </button>
        </div>
      </div>
    </>
  );
}

function ChargeRow({ charge }: { charge: Charge }) {
  const s = useStore();
  const v = verdictOf(s, charge);
  const reason = charge.reasons[0];
  const creep = reason?.kind === "price_creep" || reason?.kind === "trial_converting";
  const dim = v === "keep";
  return (
    <div className={`charge ${dim ? "dimmed" : ""}`}>
      <div className="who">
        <span className="miniplate">
          <div className="c">{(charge.descriptors && charge.descriptors[0]) || charge.descriptor}</div>
          <div className="r">{charge.merchant || "— needs decode"}</div>
        </span>
        {reason && <span className={`reason ${creep ? "creep" : ""}`}>{reason.label}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className={`amt ${charge.cadence === "trial" || v === "ask" ? "mut" : ""}`}>
          {charge.cadence === "trial" ? "$0" : `$${charge.amountYear}`}
          <small>{charge.cadence === "trial" ? `now → $${charge.amountYear}/yr` : `/yr · $${charge.amountMonthly}/mo`}</small>
        </span>
        <span className="seg">
          {(["keep", "cut", "ask"] as Verdict[]).map((k) => (
            <button key={k} className={`${k} ${v === k ? "on" : ""}`} onClick={() => s.setVerdict(charge.id, k)}>{k}</button>
          ))}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- shut-off (S4)
function Shutoff() {
  const s = useStore();
  const d = s.diagnosis!;
  const cuts = d.charges.filter((c) => verdictOf(s, c) === "cut");
  const anyPending = cuts.some((c) => {
    const st = s.cancellations[c.id]?.state;
    return st === "drafted" || st === "pack_ready";
  });

  return (
    <>
      <div className="pan">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          <div>
            <div className="eyebrow">GATE 2 · approve each cancellation</div>
            <h1 className="big" style={{ fontSize: 36, margin: "6px 0 0" }}>Shutting the {numWord(cuts.filter((c) => c.cadence !== "trial").length)}.</h1>
            <div className="sub" style={{ marginTop: 6 }}>
              Each escape is written for the merchant&apos;s <b>own channel</b>, cites your cancellation rights, and — where
              email works — <b>sends from your inbox</b>. Nothing leaves unapproved.
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div className="sub" style={{ margin: 0 }}>reclaimed so far</div>
            <SplitFlap value={`$${s.reclaimed}`} unit="↑" size={32} />
          </div>
        </div>
        {anyPending && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn brass" onClick={s.approveAll}>Approve &amp; send all →</button>
          </div>
        )}
      </div>

      {cuts.map((c) => (
        <CancellationCard key={c.id} charge={c} />
      ))}
    </>
  );
}

function CancellationCard({ charge }: { charge: Charge }) {
  const s = useStore();
  const can = s.cancellations[charge.id];
  const [editing, setEditing] = useState(false);
  if (!can) return null;
  const sent = can.state === "sent";
  const confirmed = can.state === "confirmed";

  return (
    <div className="pan">
      <div className="card-h">
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className="miniplate">
            <div className="c">{(charge.descriptors && charge.descriptors[0]) || charge.descriptor}</div>
            <div className="r">{can.merchant}</div>
          </span>
          {can.channel === "email" && (can.state === "drafted") && <span className="chip brass">email path · drafted</span>}
          {can.channel !== "email" && <span className="chip">{can.channel}-only · can&apos;t auto-send</span>}
        </div>
        {sent ? (
          <span className="send-state"><span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", display: "inline-block" }} /> sent from {s.inbox.email} · watching the reply thread</span>
        ) : (
          <span className="amt" style={{ fontSize: 15 }}>+${charge.amountYear}/yr</span>
        )}
      </div>

      {can.channel === "email" ? (
        <>
          {editing ? (
            <textarea className="draftedit" defaultValue={can.body} onChange={(e) => s.editDraft(charge.id, e.target.value)} />
          ) : (
            <div className="msg draft">
              <div className="subj">To: {can.to} · Subject: {can.subject}</div>
              <div className="body">{can.body}</div>
            </div>
          )}
          {can.state === "drafted" && (
            <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setEditing((e) => !e)}>{editing ? "Done editing" : "Edit draft"}</button>
              <button className="btn ghost" onClick={() => s.skip(charge.id)}>Skip</button>
              <button className="btn brass" onClick={() => s.approveSend(charge.id)}>Approve &amp; send</button>
            </div>
          )}
          {confirmed && (
            <div className="sub" style={{ marginTop: 10 }}>
              ↳ Cut approved{s.inbox.connected ? "" : " — connect an inbox to actually send this one, or copy the draft above"}. Reclaimed <b>+${charge.amountYear}/yr</b>.
            </div>
          )}
          {sent && <div className="sub" style={{ marginTop: 10 }}>↳ Sent. If they fire back a retention offer, <b>Gate 3</b> waits for your call.</div>}
        </>
      ) : (
        <>
          <div className="sub" style={{ margin: "2px 0 8px" }}>
            {can.merchant} only cancels through {can.channel === "phone" ? "a phone call" : "your account page"}. I won&apos;t
            pretend I sent it — here&apos;s the exact one-tap pack:
          </div>
          <div className="steps">{(can.pack?.steps || []).map((st, i) => (<span key={i}>{i + 1} · {st}&nbsp;&nbsp;·&nbsp;&nbsp;</span>))}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(can.pack?.script || can.pack?.steps.join("\n") || ""); s.toast("Script copied."); }}>Copy the script</button>
            {can.pack?.deepLink ? (
              <a className="btn brass" href={can.pack.deepLink} target="_blank" rel="noreferrer">Open cancel page ↗</a>
            ) : (
              <button className="btn brass" onClick={() => s.toast("No direct link — use the steps above.")}>Open cancel page ↗</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Gate 3 (S5)
function Gate3View() {
  const s = useStore();
  const neg = s.negotiation;
  if (!neg) return <EmptyState />;
  return (
    <div style={{ padding: "30px 26px" }}>
      <div className="thread">
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div className="eyebrow">GATE 3 · approve the retention move</div>
          <h1 className="big" style={{ fontSize: 40, margin: "8px 0 4px" }}>They don&apos;t want you to go.</h1>
          <div className="lead" style={{ fontStyle: "normal", color: "var(--ink-soft)" }}>
            The otter drafted your reply. It won&apos;t accept the offer <i>or</i> cancel — that&apos;s your call.
          </div>
        </div>

        {neg.thread.map((m, i) => (
          <div key={i} className={`msg ${m.role === "merchant" ? "them" : m.role === "draft" ? "draft" : ""}`}>
            <div className="from"><span>{m.role === "user" ? `${m.from} → ${neg.merchant}` : m.from}</span><span>{m.draft ? "ready for you" : m.role === "user" ? "sent" : "just now"}</span></div>
            <div className="body">{m.body}</div>
          </div>
        ))}

        <div className="gate" style={{ marginTop: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/otter-gate.png" alt="the otter, waiting" />
          <div className="q">
            <div className="t">Your call — I never accept or cancel for you.</div>
            <div className="s">Whatever you choose is written to the ledger. Retention win-rate vs. a naive cancel: <b>+{Math.round((neg.winRateVsNaive || 0.38) * 100)}%</b>.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div className="choice" onClick={() => s.chooseGate3("take")}>
            <div className="t">Take the offer</div>
            <div className="s">keep it · {neg.offer?.label || "the discount"}</div>
          </div>
          <div className="choice mid" onClick={() => s.chooseGate3("counter")}>
            <div className="t">Send the counter →</div>
            <div className="s">hold out for the durable rate</div>
          </div>
          <div className="choice" onClick={() => s.chooseGate3("cancel")}>
            <div className="t">Cancel anyway</div>
            <div className="s">shut it · reclaim the full $/yr</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- done
function DoneView() {
  const s = useStore();
  return (
    <div className="wrap">
      <div className="canvas sticky">
        <Waterworks caption={<div className="cap"><span className="chip leak">✓ shut &amp; reclaimed</span></div>} />
        {s.demo && <div className="demo-ribbon">DEMO</div>}
      </div>
      <div className="col">
        <div className="pan">
          <div className="eyebrow">the plumber&apos;s still on the pipes</div>
          <h1 className="big" style={{ fontSize: 38, margin: "6px 0 6px" }}>Shut. <SplitFlap value={`$${s.reclaimed}`} unit="/yr" size={34} /> back in your stream.</h1>
          <div className="sub">Every decode, decision, message and shut is on the record — timestamped and hash-chained.</div>
          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <Link className="btn brass" href="/ledger">See the receipt ledger →</Link>
            <Link className="btn ghost" href="/">Start over</Link>
          </div>
        </div>
        <div className="pan" style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ fontSize: 24, color: "var(--teal-lo)" }}>◆</div>
          <div className="sub" style={{ margin: 0 }}>
            <b>Reclaimed is money you stop paying</b>, shown per year — not funds moved, refunded, or guaranteed. No money ever moves.
          </div>
        </div>
      </div>
    </div>
  );
}

function numWord(n: number): string {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
}
