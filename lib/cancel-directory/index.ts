// Curated cancel-directory accessor. Single source of truth is directory.json,
// which the cancel-directory-MCP server also reads directly (no divergence).
import directory from "./directory.json";
import type { Channel } from "../types";

export interface DirectoryEntry {
  key: string;
  name: string;
  aliases: string[];
  channel: Channel;
  email?: string;
  deepLink?: string;
  phone?: string;
  policy?: string;
  rights?: string;
  script?: string;
}

export const DIRECTORY: DirectoryEntry[] = (directory.entries as DirectoryEntry[]);
export const DIRECTORY_VERSION: string = directory.version;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Best-effort merchant → cancellation entry. Matches on name, then aliases,
 *  then the raw descriptor (so "SQ *GYM8XJ209" finds Anytime Fitness). */
export function lookupMerchant(query: string | null | undefined): DirectoryEntry | null {
  if (!query) return null;
  const q = norm(query);
  if (!q) return null;
  // exact name
  for (const e of DIRECTORY) if (norm(e.name) === q) return e;
  // name / alias substring
  for (const e of DIRECTORY) {
    if (q.includes(norm(e.name)) || norm(e.name).includes(q)) return e;
    for (const a of e.aliases) {
      const na = norm(a);
      if (na && (q.includes(na) || na.includes(q))) return e;
    }
  }
  return null;
}

/** The honest one-tap pack for portal/phone merchants (or unknown ones). */
export function packFor(entry: DirectoryEntry | null, merchant: string): {
  steps: string[]; deepLink?: string; phone?: string; script?: string;
} {
  if (!entry) {
    return {
      steps: [
        `Log into your ${merchant} account`,
        "Find Subscription / Membership / Plan → Cancel",
        "Decline any pause/discount offer, then confirm",
        "Save the confirmation email or number",
      ],
      script: `I'd like to cancel my ${merchant} subscription effective the end of the current billing period. Please confirm in writing.`,
    };
  }
  const steps = (entry.script || "").split(/\s*·\s*|\n+/).map((s) => s.trim()).filter(Boolean);
  return {
    steps: steps.length ? steps : [entry.script || `Cancel your ${entry.name} subscription in account settings.`],
    deepLink: entry.deepLink,
    phone: entry.phone,
    script: entry.rights || entry.script,
  };
}
