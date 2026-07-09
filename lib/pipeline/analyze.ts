// ============================================================================
// The real leak-map. Redacted lines → cluster (embeddings) → un-mask (decode
// each descriptor) → detect (silent patterns, structured) → assemble the
// Diagnosis. Runs the regex baseline beside it for the visible 2-vs-N proof.
// Every model call hits dashscope-intl. Robust: a failed stage degrades to a
// safe heuristic rather than crashing the request.
// ============================================================================
import type { Charge, Diagnosis, Reason, Verdict, Channel } from "../types";
import { chat, parseJson, hasQwen } from "../qwen/client";
import { MODELS } from "../qwen/models";
import { SKILLS } from "../skills";
import { clusterLines, type Cluster } from "./cluster";
import { runBaseline, baselineFlagged } from "../baseline/regex";
import { lookupMerchant } from "../cancel-directory";
import type { RawLine, Settings } from "../types";

interface AnalyzeOpts {
  settings?: Partial<Settings>;
  keepList?: string[];
  demo?: boolean;
}

const DEFAULT_ASK_BELOW = 0.85;

export async function analyzeStatement(lines: RawLine[], opts: AnalyzeOpts = {}): Promise<Diagnosis> {
  const askBelow = opts.settings?.askBelow ?? DEFAULT_ASK_BELOW;
  const keepList = (opts.keepList ?? []).map((s) => s.toLowerCase());

  const clusters = await clusterLines(lines);

  // --- un-mask: decode each cluster's descriptor to a real merchant ---------
  const decoded = await decodeClusters(clusters);

  // --- detect: silent patterns + verdict per decoded cluster ----------------
  const detected = await detectPatterns(decoded);

  // --- assemble charges ------------------------------------------------------
  const baseline = runBaseline(lines);
  const charges: Charge[] = [];
  const kept: Charge[] = [];

  for (const d of detected) {
    const cl = clusters.find((c) => c.id === d.id)!;
    const merchant = d.merchant;
    const channel: Channel = (lookupMerchant(merchant)?.channel ?? "portal") as Channel;
    const monthly = round2(d.amountMonthly);
    const year = d.cadence === "annual" ? Math.round(d.amountMonthly) : Math.round(monthly * 12);

    let verdict: Verdict = d.verdict;
    // ask, don't guess: low-confidence decodes/cut calls become questions
    if (verdict === "cut" && d.confidence < askBelow) verdict = "ask";
    // sacred keep-list overrides everything
    const sacred = merchant ? keepList.some((k) => merchant.toLowerCase().includes(k) || k.includes(merchant.toLowerCase())) : false;
    if (sacred) verdict = "keep";

    const charge: Charge = {
      id: d.id,
      descriptor: cl.descriptors.length > 1 ? cl.descriptors.join(" · ") : cl.descriptors[0],
      descriptors: cl.descriptors,
      merchant,
      category: d.category,
      confidence: d.confidence,
      cadence: d.cadence,
      amountMonthly: monthly,
      amountYear: d.cadence === "trial" ? Math.round(monthly * 12) : year,
      reasons: d.reasons,
      verdict,
      channel,
      sacred: sacred || undefined,
      regexCaught: baselineFlagged(cl.descriptors, baseline) || undefined,
    };
    if (verdict === "keep") kept.push(charge);
    else charges.push(charge);
  }

  // sort charges: cut first (by $ desc), trials, then asks
  charges.sort((a, b) => rank(a) - rank(b) || b.amountYear - a.amountYear);

  const totalYear = charges
    .filter((c) => c.verdict === "cut" && c.cadence !== "trial")
    .reduce((s, c) => s + c.amountYear, 0);

  return {
    charges,
    kept,
    totalYear,
    spoutCaught: charges.length,
    regexCaught: baseline.caught,
    comparison: buildComparison(charges, baseline.caught),
    lines: lines.length,
    recurring: clusters.filter((c) => c.occurrences.length >= 2).length,
    demo: !!opts.demo,
    ai: hasQwen(),
  };
}

function rank(c: Charge): number {
  return c.verdict === "cut" ? (c.cadence === "trial" ? 1 : 0) : 2;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---- un-mask (batched disambiguate-merchant) --------------------------------
interface DecodedCluster extends Cluster {
  merchant: string | null;
  category: string;
  confidence: number;
}

async function decodeClusters(clusters: Cluster[]): Promise<DecodedCluster[]> {
  const payload = clusters.map((c) => ({
    id: c.id,
    descriptor: c.descriptors.join(" | "),
    amounts: c.occurrences.map((o) => o.amount),
    cards: c.cards.length,
  }));
  try {
    const msg = await chat({
      model: MODELS.unmask,
      system: SKILLS.disambiguateMerchant.system +
        '\nYou will get an ARRAY of clusters. Reply ONLY: {"results":[{"id","merchant","category","confidence"}]} — one per input id.',
      messages: [{ role: "user", content: JSON.stringify({ clusters: payload }) }],
      json: true,
      temperature: 0,
    });
    const out = parseJson<{ results: { id: string; merchant: string | null; category?: string; confidence: number }[] }>(msg.content);
    const byId = new Map(out.results.map((r) => [r.id, r]));
    return clusters.map((c) => {
      const r = byId.get(c.id);
      return { ...c, merchant: r?.merchant ?? null, category: r?.category ?? "", confidence: clamp(r?.confidence ?? 0.4) };
    });
  } catch {
    // degrade: no decode, keep raw descriptor as merchant guess
    return clusters.map((c) => ({ ...c, merchant: null, category: "", confidence: 0.3 }));
  }
}

// ---- detect (batched detect-recurring) --------------------------------------
interface DetectedCharge extends DecodedCluster {
  cadence: Charge["cadence"];
  amountMonthly: number;
  amountYear: number;
  reasons: Reason[];
  verdict: Verdict;
}

async function detectPatterns(decoded: DecodedCluster[]): Promise<DetectedCharge[]> {
  const payload = decoded.map((c) => ({
    id: c.id,
    merchant: c.merchant,
    category: c.category,
    confidence: c.confidence,
    history: c.occurrences,
    cards: c.cards.length,
  }));
  try {
    const msg = await chat({
      model: MODELS.detect,
      system: SKILLS.detectRecurring.system +
        "\nOnly return charges worth surfacing to the user (recurring subscriptions, trials, and silent leaks). Skip one-off purchases, groceries, rent, transfers and income.",
      messages: [{ role: "user", content: JSON.stringify({ charges: payload }) }],
      json: true,
      temperature: 0,
      maxTokens: 2200,
    });
    const out = parseJson<{ charges: { id: string; cadence: Charge["cadence"]; amountMonthly: number; amountYear: number; reasons: Reason[]; verdict: Verdict }[] }>(msg.content);
    const byId = new Map(out.charges.map((r) => [r.id, r]));
    const result: DetectedCharge[] = [];
    for (const c of decoded) {
      const r = byId.get(c.id);
      if (!r) continue; // not surfaced by the model → not a subscription
      result.push({ ...c, cadence: r.cadence, amountMonthly: r.amountMonthly, amountYear: r.amountYear, reasons: r.reasons || [], verdict: r.verdict });
    }
    return result;
  } catch {
    // degrade: flag anything recurring ≥2 as a plain recurring charge
    return decoded
      .filter((c) => c.occurrences.length >= 2)
      .map((c) => {
        const monthly = c.occurrences[c.occurrences.length - 1].amount;
        return {
          ...c,
          cadence: "monthly" as const,
          amountMonthly: monthly,
          amountYear: Math.round(monthly * 12),
          reasons: [{ kind: "recurring", label: "recurring charge" } as Reason],
          verdict: "ask" as Verdict,
        };
      });
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function buildComparison(charges: Charge[], regexCaught: number) {
  const has = (k: string) => charges.some((c) => c.reasons.some((r) => r.kind === k));
  return [
    { what: "obvious monthly dupes", regex: "yes" as const, spout: "yes" as const },
    { what: "cryptic descriptor → merchant", regex: "no" as const, spout: "yes" as const },
    { what: "price creep", regex: "no" as const, spout: (has("price_creep") ? "yes" : "no") as "yes" | "no" },
    { what: "trial converting", regex: "no" as const, spout: (has("trial_converting") ? "yes" : "no") as "yes" | "no" },
    { what: "same service, 2 cards", regex: "partial" as const, spout: (has("duplicate") ? "yes" : "no") as "yes" | "no" },
  ];
}
