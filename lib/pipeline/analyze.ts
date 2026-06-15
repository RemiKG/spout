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
