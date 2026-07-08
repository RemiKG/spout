// Honest degraded path: a stranger uploads their OWN statement but no Qwen key
// is configured. We still genuinely: redact on device, run the regex baseline,
// and surface the recurring charges it finds — but we DON'T fake a decode. Each
// charge is shown by its raw descriptor with an honest "needs AI to decode"
// note, and the UI shows the notice about setting DASHSCOPE_API_KEY.
import type { Charge, Diagnosis, RawLine } from "../types";
import { runBaseline } from "../baseline/regex";
import { lookupMerchant } from "../cancel-directory";

export function baselineOnlyDiagnosis(lines: RawLine[]): Diagnosis {
  const baseline = runBaseline(lines);
  const charges: Charge[] = baseline.groups.map((g, i) => {
    const guess = g.naiveName;
    const entry = lookupMerchant(guess || g.descriptor);
    return {
      id: `b${i}`,
      descriptor: g.descriptor,
      descriptors: [g.descriptor],
      merchant: entry?.name ?? guess ?? null,
      category: "",
      confidence: entry ? 0.6 : 0.3,
      cadence: "monthly",
      amountMonthly: g.amount,
      amountYear: Math.round(g.amount * 12),
      reasons: [{ kind: "recurring", label: `recurring · ${g.count}× — needs AI to decode` }],
      verdict: "ask",
      channel: (entry?.channel ?? "portal"),
      regexCaught: true,
    };
  });
  const totalYear = charges.reduce((s, c) => s + c.amountYear, 0);
  return {
    charges,
    kept: [],
    totalYear: 0, // nothing approved to cut yet — honest
    spoutCaught: charges.length,
    regexCaught: baseline.caught,
    comparison: [
      { what: "obvious monthly dupes", regex: "yes", spout: "yes" },
      { what: "cryptic descriptor → merchant", regex: "no", spout: "no" },
      { what: "price creep", regex: "no", spout: "no" },
      { what: "trial converting", regex: "no", spout: "no" },
      { what: "same service, 2 cards", regex: "partial", spout: "no" },
    ],
    lines: lines.length,
    recurring: baseline.caught,
    demo: false,
    ai: false,
  };
}
