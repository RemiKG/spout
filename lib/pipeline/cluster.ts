// Cluster raw statement lines into candidate recurring charges. Uses real
// text-embedding-v4 vectors to merge the same service seen under different
// descriptors / across cards (the "duplicate · 2 cards" signal); falls back to
// a normalised-key match when embeddings aren't available.
import type { RawLine } from "../types";
import { embed, cosine, hasQwen } from "../qwen/client";
import { MODELS } from "../qwen/models";

export interface Cluster {
  id: string;
  descriptors: string[];
  occurrences: { date: string; amount: number; card?: string }[];
  cards: string[];
}

function normKey(descriptor: string): string {
  return descriptor
    .toUpperCase()
    .replace(/^(SQ|TST|DD|PP|APLPAY|GOOGLE|AMZN|PAYPAL|POS|ACH|BILL|NFLX)\b[\s*/#-]*/g, "$1 ")
    .replace(/\d+/g, "")
    .replace(/[^A-Z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Candidate debit lines = money out. Income and pure one-offs are still passed
 *  through; the detect skill decides what is a subscription. */
export async function clusterLines(lines: RawLine[]): Promise<Cluster[]> {
  const debits = lines.filter((l) => l.amount < 0 || l.descriptor.includes("TEMP"));
  const distinct = [...new Set(debits.map((l) => l.descriptor))];

  // group distinct descriptors → cluster ids
  const groups: string[][] = [];
  if (hasQwen() && distinct.length > 1) {
    try {
      const vecs = await embed(distinct, MODELS.embed);
      const assigned = new Array(distinct.length).fill(-1);
      for (let i = 0; i < distinct.length; i++) {
        if (assigned[i] !== -1) continue;
        const gid = groups.length;
        assigned[i] = gid;
        groups.push([distinct[i]]);
        for (let j = i + 1; j < distinct.length; j++) {
          if (assigned[j] === -1 && cosine(vecs[i], vecs[j]) >= 0.86) {
            assigned[j] = gid;
            groups[gid].push(distinct[j]);
          }
        }
      }
    } catch {
      groups.length = 0;
    }
  }
  if (!groups.length) {
    const byKey = new Map<string, string[]>();
    for (const d of distinct) {
      const k = normKey(d) || d;
      (byKey.get(k) || byKey.set(k, []).get(k)!).push(d);
    }
    groups.push(...byKey.values());
  }

  return groups.map((descriptors, i) => {
    const occ = debits
      .filter((l) => descriptors.includes(l.descriptor))
      .map((l) => ({ date: l.date, amount: Math.abs(l.amount), card: l.card }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const cards = [...new Set(occ.map((o) => o.card).filter(Boolean) as string[])];
    return { id: `c${i}`, descriptors, occurrences: occ, cards };
  });
}
