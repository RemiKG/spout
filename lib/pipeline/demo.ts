// Assemble the pre-seeded DEMO diagnosis. Uses the canonical decoded charges but
// runs the REAL regex baseline on the real demo lines, so the "2 vs 7" proof is
// computed, not asserted.
import type { Diagnosis } from "../types";
import { DEMO_CHARGES, DEMO_KEPT, DEMO_COMPARISON, DEMO_STATEMENT_LINES } from "../demo/statement";
import { runBaseline, baselineFlagged } from "../baseline/regex";

export function buildDemoDiagnosis(): Diagnosis {
  const baseline = runBaseline(DEMO_STATEMENT_LINES);
  const charges = DEMO_CHARGES.map((c) => ({ ...c, regexCaught: baselineFlagged(c.descriptors ?? [c.descriptor], baseline) || undefined }));
  const kept = DEMO_KEPT.map((c) => ({ ...c, regexCaught: baselineFlagged(c.descriptors ?? [c.descriptor], baseline) || undefined }));
  const totalYear = charges.filter((c) => c.verdict === "cut" && c.cadence !== "trial").reduce((s, c) => s + c.amountYear, 0);
  return {
    charges,
    kept,
    totalYear,
    spoutCaught: charges.length,
    regexCaught: baseline.caught,
    comparison: DEMO_COMPARISON,
    lines: DEMO_STATEMENT_LINES.length,
    recurring: 12,
    demo: true,
    ai: false,
  };
}
