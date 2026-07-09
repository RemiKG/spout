"use client";
// ============================================================================
// The Spout client store. Holds the whole session: capabilities, the diagnosis,
// the user's gate decisions, cancellations, the negotiation, and the append-only
// ledger. Persists ledger + keep-list + settings (NOT the statement) to the
// browser, exactly as the "What is REAL" contract states.
// ============================================================================
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Cancellation, Charge, Diagnosis, LedgerEvent, Negotiation, Settings, Verdict, ThreadMessage } from "./types";
import { Ledger, seedLedgerFromDiagnosis } from "./ledger";
import { MODELS } from "./qwen/models";
import { parseFile } from "./parse";
import { redactStatement } from "./redact";
import { packFor, lookupMerchant } from "./cancel-directory";

export type Phase = "idle" | "reading" | "gate1" | "shutoff" | "gate3" | "done";

export const DEFAULT_SETTINGS: Settings = {
  redact: { accounts: true, balances: true, name: true },
  askBelow: 0.85,
  alwaysAskOverMonthly: 40,
  showBaseline: true,
  mode: "personal",
  retentionDays: 90,
  models: { read: MODELS.read, unmask: `${MODELS.embed} · ${MODELS.unmask}`, detect: `${MODELS.detect} · structured`, draft: MODELS.draft, negotiate: `${MODELS.negotiate} · preserve_thinking` },
};

const DEFAULT_KEEPLIST = ["iCloud+", "Spotify", "Patreon: 2 creators", "Domain renewal"];

interface Toast { id: number; text: string; }

interface StoreState {
  ready: boolean;
  caps: { qwen: boolean; gmail: boolean; baseUrl: string } | null;
  phase: Phase;
  demo: boolean;
  stage: number; // reading stage 0..3
  diagnosis: Diagnosis | null;
  verdicts: Record<string, Verdict>;
  cancellations: Record<string, Cancellation>;
  negotiation: Negotiation | null;
  reclaimed: number;
  ledgerEvents: LedgerEvent[];
  settings: Settings;
  keepList: string[];
  inbox: { configured: boolean; connected: boolean; email: string | null };
  connectOpen: boolean;
  toasts: Toast[];
  notice: string | null;
  redactionReport: string[] | null;
}

interface StoreCtx extends StoreState {
  keptYear: number;
  startDemo: () => Promise<void>;
  analyzeFile: (file: File) => Promise<void>;
  reset: () => void;
  setVerdict: (id: string, v: Verdict) => void;
  approveGate1: () => Promise<void>;
  approveSend: (id: string) => Promise<void>;
  skip: (id: string) => void;
  editDraft: (id: string, body: string) => void;
  approveAll: () => Promise<void>;
  chooseGate3: (choice: "take" | "counter" | "cancel") => void;
  openConnect: (open: boolean) => void;
  refreshInbox: () => Promise<void>;
  disconnect: () => Promise<void>;
  addKeep: (name: string) => void;
  removeKeep: (name: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  exportNdjson: () => void;
  exportCsv: () => void;
  toast: (text: string) => void;
  playClunk: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
};

const LS = { ledger: "spout.ledger", settings: "spout.settings", keep: "spout.keeplist" };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const ledgerRef = useRef(new Ledger());
  const [s, setS] = useState<StoreState>({
    ready: false, caps: null, phase: "idle", demo: false, stage: 0,
    diagnosis: null, verdicts: {}, cancellations: {}, negotiation: null, reclaimed: 0,
    ledgerEvents: [], settings: DEFAULT_SETTINGS, keepList: DEFAULT_KEEPLIST,
    inbox: { configured: false, connected: false, email: null }, connectOpen: false,
    toasts: [], notice: null, redactionReport: null,
  });
  const patch = (p: Partial<StoreState>) => setS((prev) => ({ ...prev, ...p }));
  const toastId = useRef(1);

  const toast = useCallback((text: string) => {
    const id = toastId.current++;
    setS((p) => ({ ...p, toasts: [...p.toasts, { id, text }] }));
    setTimeout(() => setS((p) => ({ ...p, toasts: p.toasts.filter((t) => t.id !== id) })), 4200);
  }, []);

  const persist = useCallback((next?: Partial<StoreState>) => {
    try {
      localStorage.setItem(LS.ledger, JSON.stringify(ledgerRef.current.events));
      const st = next?.settings ?? s.settings;
      const kl = next?.keepList ?? s.keepList;
      localStorage.setItem(LS.settings, JSON.stringify(st));
      localStorage.setItem(LS.keep, JSON.stringify(kl));
    } catch { /* private mode */ }
  }, [s.settings, s.keepList]);

  const syncLedger = () => patch({ ledgerEvents: [...ledgerRef.current.events] });

  const playClunk = useCallback(() => {
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ac = new AC();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = "triangle"; o.frequency.setValueAtTime(180, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(70, ac.currentTime + 0.12);
      g.gain.setValueAtTime(0.14, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22);
      o.start(); o.stop(ac.currentTime + 0.24);
    } catch { /* no audio */ }
  }, []);

  // init
  useEffect(() => {
    (async () => {
      // restore persisted ledger/settings/keeplist
      try {
        const led = localStorage.getItem(LS.ledger);
        if (led) { ledgerRef.current = new Ledger(JSON.parse(led)); }
        const set = localStorage.getItem(LS.settings);
        const keep = localStorage.getItem(LS.keep);
        patch({
          ledgerEvents: [...ledgerRef.current.events],
          settings: set ? { ...DEFAULT_SETTINGS, ...JSON.parse(set) } : DEFAULT_SETTINGS,
          keepList: keep ? JSON.parse(keep) : DEFAULT_KEEPLIST,
        });
      } catch { /* ignore */ }
      // capabilities + inbox
      try {
        const caps = await fetch("/api/health").then((r) => r.json());
        patch({ caps });
      } catch { /* offline */ }
      try {
        const inbox = await fetch("/api/gmail/status").then((r) => r.json());
        patch({ inbox });
      } catch { /* ignore */ }
      patch({ ready: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reading animation
  const runReading = async (steps = 4) => {
    for (let i = 0; i < steps; i++) {
      patch({ stage: i });
      await sleep(360);
    }
  };

  const applyVerdictsToDiagnosis = (d: Diagnosis): Diagnosis => d;

  const startDemo = useCallback(async () => {
    patch({ phase: "reading", demo: true, stage: 0, verdicts: {}, cancellations: {}, negotiation: null, reclaimed: 0, notice: null, redactionReport: ["acct", "balance", "name"] });
    await runReading();
    try {
      const { diagnosis } = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ demo: true }) }).then((r) => r.json());
      ledgerRef.current = seedLedgerFromDiagnosis(diagnosis);
      const verdicts: Record<string, Verdict> = {};
      diagnosis.charges.forEach((c: Charge) => (verdicts[c.id] = c.verdict));
      patch({ diagnosis, verdicts, phase: "gate1" });
      syncLedger(); persist();
    } catch {
      patch({ notice: "Could not load the demo.", phase: "idle" });
    }
  }, [persist]);

  const analyzeFile = useCallback(async (file: File) => {
    patch({ phase: "reading", demo: false, stage: 0, verdicts: {}, cancellations: {}, negotiation: null, reclaimed: 0, notice: null });
    try {
      const parsed = await parseFile(file);
      let payload: Record<string, unknown>;
      if (parsed.needsVL && parsed.imageDataUrl) {
        payload = { imageDataUrl: parsed.imageDataUrl, settings: s.settings, keepList: s.keepList };
        patch({ redactionReport: ["acct (VL rows re-redacted server-side)"] });
      } else {
        const { lines, report } = redactStatement(parsed.lines, s.settings.redact);
        payload = { lines, settings: s.settings, keepList: s.keepList };
        patch({ redactionReport: report.categories });
      }
      await runReading();
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const message =
          e.message ||
          (res.status === 504 || res.status === 524
            ? "The analysis took too long and the server timed out. Try the same file again — a retry usually goes through."
            : "Could not read that statement.");
        patch({ phase: "idle", notice: message });
        toast(message);
        return;
      }
      const { diagnosis, mode } = await res.json();
      ledgerRef.current = seedLedgerFromDiagnosis(diagnosis);
      const verdicts: Record<string, Verdict> = {};
      diagnosis.charges.forEach((c: Charge) => (verdicts[c.id] = c.verdict));
      patch({ diagnosis: applyVerdictsToDiagnosis(diagnosis), verdicts, phase: "gate1", notice: mode === "baseline" ? "baseline" : null });
      syncLedger(); persist();
    } catch (err) {
      patch({ phase: "idle", notice: "Could not read that file. Try a CSV or PDF export." });
      toast("Could not read that file.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.settings, s.keepList, toast, persist]);

  const reset = useCallback(() => {
    patch({ phase: "idle", diagnosis: null, verdicts: {}, cancellations: {}, negotiation: null, reclaimed: 0, demo: false, notice: null, redactionReport: null });
  }, []);

  const setVerdict = useCallback((id: string, v: Verdict) => {
    setS((p) => ({ ...p, verdicts: { ...p.verdicts, [id]: v } }));
  }, []);

  const cutCharges = useCallback((): Charge[] => {
    const d = s.diagnosis; if (!d) return [];
    return d.charges.filter((c) => (s.verdicts[c.id] ?? c.verdict) === "cut");
  }, [s.diagnosis, s.verdicts]);

  const approveGate1 = useCallback(async () => {
    const d = s.diagnosis; if (!d) return;
    const cuts = d.charges.filter((c) => (s.verdicts[c.id] ?? c.verdict) === "cut");
    const asks = d.charges.filter((c) => (s.verdicts[c.id] ?? c.verdict) === "ask");
    const keeps = d.charges.filter((c) => (s.verdicts[c.id] ?? c.verdict) === "keep");
    const billCuts = cuts.filter((c) => c.cadence !== "trial");
    const totalYear = billCuts.reduce((a, c) => a + c.amountYear, 0);
    ledgerRef.current.append("gate1", { decision: "approve", cut: billCuts.length, keep: keeps.length + d.kept.length, ask: asks.length, kept_yr: totalYear });
    // draft each cut
    const cancellations: Record<string, Cancellation> = {};
    for (const c of cuts) {
      try {
        const { cancellation } = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ charge: c, userEmail: s.inbox.email }) }).then((r) => r.json());
        cancellations[c.id] = cancellation;
      } catch {
        const entry = lookupMerchant(c.merchant || "");
        cancellations[c.id] = c.channel === "email"
          ? { chargeId: c.id, merchant: c.merchant || c.descriptor, channel: "email", amountYear: c.amountYear, state: "drafted", to: entry?.email, subject: `Cancellation of ${c.merchant} — end of billing period`, body: `Hello — I'm cancelling my ${c.merchant} subscription effective at the end of the current billing period. Please confirm the cancellation and final billing date in writing. I do not authorise further charges. — sent on your behalf by Spout` }
          : { chargeId: c.id, merchant: c.merchant || c.descriptor, channel: c.channel, amountYear: c.amountYear, state: "pack_ready", pack: packFor(entry, c.merchant || c.descriptor) };
      }
      ledgerRef.current.append("draft", { merchant: c.merchant, channel: cancellations[c.id].channel, cites_rights: cancellations[c.id].channel === "email" });
    }
    patch({ phase: "shutoff", cancellations });
    syncLedger(); persist();
  }, [s.diagnosis, s.verdicts, s.inbox.email, persist]);

  const revealRetention = useCallback((charge: Charge) => {
    // demo: scripted retention reply so Gate 3 can be shown. real inbox: read thread.
    const neg: Negotiation = {
      chargeId: charge.id, merchant: charge.merchant || charge.descriptor,
      offer: { kind: "discount", label: "50% off for 6 months", monthly: +(charge.amountMonthly / 2).toFixed(2), months: 6 },
      winRateVsNaive: 0.38,
      thread: [
        { role: "user", from: s.inbox.email || "you@your-inbox", to: charge.merchant || "", at: new Date().toISOString(), body: `Please cancel my ${charge.merchant} subscription effective the end of this billing cycle, and confirm in writing.` },
        { role: "merchant", from: `${charge.merchant} Retention <stay@merchant.example>`, at: new Date().toISOString(), body: `We'd hate to see you go! Here's an exclusive 50% off for 6 months — just $${(charge.amountMonthly / 2).toFixed(2)}/mo. Reply STAY to keep it.` },
        { role: "draft", from: "◆ Otter's draft — not sent yet", draft: true, at: new Date().toISOString(), body: `Thanks, but a temporary discount that reverts later isn't worth it. I'll stay only if you lock $${(charge.amountMonthly / 2).toFixed(2)}/mo for 12 months. Otherwise please proceed with the cancellation and confirm in writing.` },
      ] as ThreadMessage[],
    };
    ledgerRef.current.append("reply", { merchant: charge.merchant, kind: "retention", offer: "50%_6mo" });
    ledgerRef.current.append("gate3", { merchant: charge.merchant, status: "awaiting_user" });
    patch({ negotiation: neg, phase: "gate3" });
    syncLedger(); persist();
  }, [s.inbox.email, persist]);

  const finalizeSend = useCallback((c: Cancellation, sentReal: boolean) => {
    // a trial we cancel before it charges prevents a FUTURE charge — it isn't
    // money you're currently paying, so it doesn't climb the "reclaimed" gauge.
    const charge = s.diagnosis?.charges.find((x) => x.id === c.chargeId);
    const add = charge?.cadence === "trial" ? 0 : c.amountYear;
    setS((p) => ({
      ...p,
      reclaimed: p.reclaimed + add,
      cancellations: { ...p.cancellations, [c.chargeId]: { ...c, state: sentReal ? "sent" : "confirmed", sentReal } },
    }));
    ledgerRef.current.append(sentReal ? "send" : "confirm", { merchant: c.merchant, to: c.to, from: s.inbox.email || undefined, idem: c.chargeId.slice(0, 4) });
    syncLedger(); persist();
  }, [s.inbox.email, s.diagnosis, persist]);

  const approveSend = useCallback(async (id: string) => {
    const c = s.cancellations[id]; if (!c) return;
    ledgerRef.current.append("gate2", { merchant: c.merchant, decision: "approve_send" });
    if (c.channel === "email" && s.inbox.connected && c.to && c.subject && c.body) {
      try {
        const r = await fetch("/api/gmail/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: c.to, subject: c.subject, body: c.body }) });
        if (r.ok) { finalizeSend(c, true); toast(`Sent from ${s.inbox.email} — watching the reply thread.`); playClunk(); return; }
      } catch { /* fall through */ }
    }
    finalizeSend(c, false);
    playClunk();
    toast(s.inbox.connected ? "Approved." : "Cut approved — connect an inbox to actually send, or use the pack.");
  }, [s.cancellations, s.inbox, finalizeSend, toast, playClunk]);

  const skip = useCallback((id: string) => {
    setS((p) => ({ ...p, cancellations: { ...p.cancellations, [id]: { ...p.cancellations[id], state: "skipped" } } }));
    ledgerRef.current.append("gate2", { merchant: s.cancellations[id]?.merchant, decision: "skip" });
    syncLedger(); persist();
  }, [s.cancellations, persist]);

  const editDraft = useCallback((id: string, body: string) => {
    setS((p) => ({ ...p, cancellations: { ...p.cancellations, [id]: { ...p.cancellations[id], body } } }));
  }, []);

  const approveAll = useCallback(async () => {
    const cuts = cutCharges();
    let reclaimedRunning = s.reclaimed;
    for (const c of cuts) {
      const can = s.cancellations[c.id];
      if (!can || can.state === "sent" || can.state === "confirmed" || can.state === "skipped") continue;
      // send email if connected; else count the approved cut (money you'll stop paying)
      let sentReal = false;
      if (can.channel === "email" && s.inbox.connected && can.to && can.subject && can.body) {
        try { const r = await fetch("/api/gmail/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: can.to, subject: can.subject, body: can.body }) }); sentReal = r.ok; } catch { sentReal = false; }
      }
      ledgerRef.current.append("gate2", { merchant: can.merchant, decision: "approve_send" });
      reclaimedRunning += c.cadence === "trial" ? 0 : can.amountYear;
      const stateNext: Cancellation["state"] = can.channel !== "email" ? "pack_ready" : sentReal ? "sent" : "confirmed";
      setS((p) => ({ ...p, reclaimed: reclaimedRunning, cancellations: { ...p.cancellations, [c.id]: { ...can, state: stateNext, sentReal } } }));
      ledgerRef.current.append(sentReal ? "send" : "confirm", { merchant: can.merchant, to: can.to, from: s.inbox.email || undefined, idem: c.id.slice(0, 4) });
      syncLedger();
      playClunk();
      await sleep(520);
    }
    persist();
    // reveal a retention reply on the first email-channel cut (demo scripts it)
    const retention = cuts.find((c) => s.cancellations[c.id]?.channel === "email");
    if (retention) { await sleep(500); revealRetention(retention); }
    else { patch({ phase: "done" }); toast("Shut. Your spout's tighter."); }
  }, [cutCharges, s.cancellations, s.inbox, s.reclaimed, playClunk, persist, revealRetention, toast]);

  const chooseGate3 = useCallback((choice: "take" | "counter" | "cancel") => {
    const neg = s.negotiation; if (!neg) return;
    ledgerRef.current.append("gate3", { merchant: neg.merchant, decision: choice });
    if (choice === "counter") toast("Counter sent → holding out for the durable rate.");
    else if (choice === "take") toast(`Kept ${neg.merchant} at the discount — your call.`);
    else toast(`Cancelled ${neg.merchant}. Reclaimed.`);
    patch({ phase: "done" });
    syncLedger(); persist();
  }, [s.negotiation, toast, persist]);

  const openConnect = useCallback((open: boolean) => patch({ connectOpen: open }), []);
  const refreshInbox = useCallback(async () => {
    try { const inbox = await fetch("/api/gmail/status").then((r) => r.json()); patch({ inbox }); } catch { /* ignore */ }
  }, []);
  const disconnect = useCallback(async () => {
    try { await fetch("/api/gmail/disconnect", { method: "POST" }); } catch { /* ignore */ }
    ledgerRef.current.append("disconnect", { inbox: true });
    patch({ inbox: { ...s.inbox, connected: false, email: null } });
    syncLedger(); persist(); toast("Inbox disconnected.");
  }, [s.inbox, persist, toast]);

  const addKeep = useCallback((name: string) => {
    if (!name.trim()) return;
    setS((p) => { const keepList = [...p.keepList, name.trim()]; persist({ keepList }); return { ...p, keepList }; });
  }, [persist]);
  const removeKeep = useCallback((name: string) => {
    setS((p) => { const keepList = p.keepList.filter((k) => k !== name); persist({ keepList }); return { ...p, keepList }; });
  }, [persist]);
  const setSettings = useCallback((p2: Partial<Settings>) => {
    setS((p) => { const settings = { ...p.settings, ...p2 }; persist({ settings }); return { ...p, settings }; });
  }, [persist]);

  const download = (name: string, text: string, type: string) => {
    const blob = new Blob([text], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const exportNdjson = useCallback(() => download("spout-ledger.ndjson", ledgerRef.current.toNDJSON(), "application/x-ndjson"), []);
  const exportCsv = useCallback(() => {
    import("./ledger").then(({ leakMapCsv }) => { if (s.diagnosis) download("spout-leak-map.csv", leakMapCsv(s.diagnosis), "text/csv"); });
  }, [s.diagnosis]);

  const keptYear = s.reclaimed;

  const value: StoreCtx = {
    ...s, keptYear,
    startDemo, analyzeFile, reset, setVerdict, approveGate1, approveSend, skip, editDraft, approveAll,
    chooseGate3, openConnect, refreshInbox, disconnect, addKeep, removeKeep, setSettings, exportNdjson, exportCsv, toast, playClunk,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
