// ============================================================================
// The plain regex / string-match BASELINE. It runs beside every real run and is
// deliberately dumb: it can only flag a charge as "recurring" when the exact same
// descriptor hits at an identical amount ≥3 times, and it cannot decode a cryptic
// descriptor into a real merchant. This is the visible proof the Qwen stack is
// load-bearing — the gap between this and Spout is the un-fakeable core.
// It needs NO API key, so it genuinely works on a stranger's statement offline.
// ============================================================================
import type { RawLine } from "../types";

const MIN_OCCURRENCES = 3; // "hits every statement period" = obvious subscription

export interface BaselineGroup {
  descriptor: string;
  amount: number;
  count: number;
  naiveName: string | null; // what a string cleanup can recover (usually nothing)
}

export interface BaselineResult {
  caught: number;
  groups: BaselineGroup[];
  caughtKeys: Set<string>; // descriptors the baseline flagged
}

/** What a pure string-match can recover as a "name": strip obvious processor
 *  prefixes/refs and keep a plausible word. On cryptic descriptors it returns
 *  null — regex cannot map SQ *GYM8XJ209 → "Anytime Fitness". */
export function naiveName(descriptor: string): string | null {
  const cleaned = descriptor
    .replace(/^(SQ|TST|DD|PP|APLPAY|GOOGLE|AMZN|PAYPAL|POS|ACH)\b[\s*/#-]*/i, "")
    .replace(/[*#].*$/, "")
    .replace(/\b\d[\w]*\b/g, " ") // drop tokens containing digits (refs/codes)
    .replace(/[^A-Za-z ]+/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length >= 4);
  if (!words.length) return null;
  // reject strings of only consonants (code-like), require a vowel
  const cand = words.join(" ");
  return /[aeiou]/i.test(cand) ? cand : null;
}

export function runBaseline(lines: RawLine[]): BaselineResult {
  const groups = new Map<string, BaselineGroup>();
  for (const l of lines) {
    if (l.amount >= 0) continue; // ignore credits/income
    const amount = Math.abs(l.amount);
    if (amount === 0) continue;
    const desc = l.descriptor.trim().toUpperCase();
    const key = `${desc}|${amount.toFixed(2)}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { descriptor: l.descriptor.trim(), amount, count: 1, naiveName: naiveName(l.descriptor) });
  }
  const recurring = [...groups.values()].filter((g) => g.count >= MIN_OCCURRENCES);
  const caughtKeys = new Set(recurring.map((g) => g.descriptor.toUpperCase()));
  return { caught: recurring.length, groups: recurring, caughtKeys };
}

/** Was any of a charge's descriptors independently flagged by the baseline? */
export function baselineFlagged(descriptors: string[], result: BaselineResult): boolean {
  return descriptors.some((d) => result.caughtKeys.has(d.trim().toUpperCase()));
}
