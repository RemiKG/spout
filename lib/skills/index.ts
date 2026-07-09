// ============================================================================
// The four custom Skills — reusable, triggerable units (Qwen skills format is
// documented under /skills/<name>/SKILL.md). This module holds their operative
// system prompts + structured-output schemas so the pipeline and the docs share
// ONE definition. Each is a named, single-responsibility unit of the agent.
// ============================================================================
import { z } from "zod";

export interface SkillDef<T extends z.ZodTypeAny> {
  name: string;
  description: string;
  trigger: string;
  model: "read" | "unmask" | "detect" | "draft" | "negotiate";
  system: string;
  schema: T;
}

// ---- 1 · disambiguate-merchant --------------------------------------------
export const DisambiguateSchema = z.object({
  merchant: z.string().nullable(),
  category: z.string().default(""),
  confidence: z.number().min(0).max(1),
});
export const disambiguateMerchant: SkillDef<typeof DisambiguateSchema> = {
  name: "disambiguate-merchant",
  description:
    "Decode a cryptic bank/card descriptor (e.g. `SQ *GYM8XJ209`) into the real merchant and service, with a calibrated confidence. This is the load-bearing, un-fakeable step: regex cannot do it.",
  trigger: "For each clustered charge descriptor that needs a real merchant name.",
  model: "unmask",
  system: [
    "You decode cryptic bank/card statement descriptors into the real merchant and service.",
    "Common encodings: `SQ *NAME` = Square seller; `TST* NAME` = Toast; `PP*`/`PAYPAL *` = PayPal; `APLPAY`/`APL*` = Apple Pay/Apple; `GOOGLE *` = Google; `DD/` `BILL*` `ACH` = biller refs; airline/ticker-like tokens (NFLX=Netflix-style) hint the brand.",
    "Return calibrated confidence 0..1. If you cannot decode it to a specific real service, set merchant=null and confidence below 0.5 — do NOT guess a plausible-sounding brand.",
    'Reply ONLY with JSON: {"merchant": string|null, "category": string, "confidence": number}.',
  ].join("\n"),
  schema: DisambiguateSchema,
};

// ---- 2 · detect-recurring --------------------------------------------------
export const ReasonSchema = z.object({
  kind: z.enum(["unused", "price_creep", "duplicate", "gray", "trial_converting", "paused", "recurring", "ambiguous"]),
  label: z.string(),
  detail: z.record(z.any()).optional(),
});
export const DetectSchema = z.object({
  charges: z.array(
    z.object({
      id: z.string(),
      cadence: z.enum(["monthly", "annual", "weekly", "quarterly", "trial", "one-off", "unknown"]),
      amountMonthly: z.number(),
      amountYear: z.number(),
      reasons: z.array(ReasonSchema),
      verdict: z.enum(["cut", "keep", "ask"]),
    })
  ),
});
export const detectRecurring: SkillDef<typeof DetectSchema> = {
  name: "detect-recurring",
  description:
    "From the clustered, decoded charges + their per-date amount history, find the silent stuff: converted free trials, once-a-year renewals, price creeps, duplicate services across cards, unrecognised gray charges — and reason keep vs cut vs ask.",
  trigger: "Once, after descriptors are decoded and clustered.",
  model: "detect",
  system: [
    "You find silently-leaking recurring charges from decoded statement clusters.",
    "For each charge decide a cadence and an annualised amount (money the user would STOP paying — never money moved).",
    "Flag reasons with a `kind`: price_creep (amount rose over time), duplicate (same service billed on 2+ cards, or charged twice on the same day), trial_converting (a $0 / temp auth that will convert soon), paused (usage paused but still billing), gray (small unrecognised charge), unused (recurs but user hasn't engaged), recurring (a normal, wanted subscription).",
    "verdict: `cut` for clear waste; `keep` for something clearly used/wanted; `ask` when genuinely unclear (do NOT guess — ask, don't guess). Respect the caller's confidence/keep-list hints.",
    "Give each reason a short human label like '▲ price creep · $3.99 → $6.99' or 'duplicate · 2 cards'.",
    'Reply ONLY with JSON: {"charges":[{"id","cadence","amountMonthly","amountYear","reasons":[{"kind","label","detail"}],"verdict"}]}.',
  ].join("\n"),
  schema: DetectSchema,
};

// ---- 3 · draft-cancellation ------------------------------------------------
export const DraftSchema = z.object({
  channel: z.enum(["email", "portal", "phone"]),
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  pack: z.object({ steps: z.array(z.string()), script: z.string().optional() }).optional(),
});
export const draftCancellation: SkillDef<typeof DraftSchema> = {
  name: "draft-cancellation",
  description:
    "Compose the channel-correct cancellation. For email merchants: a short, firm, rights-citing letter to send from the user's own inbox. For portal/phone merchants: an honest one-tap pack (exact steps + script) — never a fake 'cancelled everywhere'.",
  trigger: "For each charge the user approves to cut at Gate 1.",
  model: "draft",
  system: [
    "You draft cancellations in a calm, firm, second-person voice. Never dramatic, never threatening.",
    "EMAIL channel: write `subject` and `body`. Cite the user's cancellation rights ('under my contract's cancellation terms and applicable consumer-protection law'), request written confirmation of the cancellation and final billing date, state no further charges are authorised, and end with '— sent on your behalf by Spout'. Keep it under 90 words.",
    "PORTAL or PHONE channel: leave email fields empty and fill `pack.steps` (3–5 terse steps) + a short `pack.script`. Be honest that Spout cannot auto-send this one.",
    'Reply ONLY with JSON matching {"channel","to","subject","body","pack":{"steps":[],"script"}}.',
  ].join("\n"),
  schema: DraftSchema,
};

// ---- 4 · negotiate-retention -----------------------------------------------
export const NegotiateSchema = z.object({
  offer: z.object({ kind: z.string(), label: z.string(), monthly: z.number().optional(), months: z.number().optional() }).nullable(),
  counter: z.string(),
  recommendation: z.string(),
});
export const negotiateRetention: SkillDef<typeof NegotiateSchema> = {
  name: "negotiate-retention",
  description:
    "Read a merchant's retention reply ('50% off to stay!'), parse the offer, and draft the user's counter — then STOP at Gate 3. It never accepts or cancels for the user.",
  trigger: "When a merchant replies to a sent cancellation with a retention offer.",
  model: "negotiate",
  system: [
    "You are the user's negotiator on a cancellation reply thread. Parse the merchant's retention offer, then draft a counter that holds out for a better, durable deal (e.g. lock the discounted rate for 12 months, not 6).",
    "You NEVER accept or cancel on the user's behalf — you draft, then hand three choices to the user (take it / send the counter / cancel anyway).",
    'Reply ONLY with JSON: {"offer":{"kind","label","monthly","months"}|null,"counter": string,"recommendation": string}.',
  ].join("\n"),
  schema: NegotiateSchema,
};

export const SKILLS = { disambiguateMerchant, detectRecurring, draftCancellation, negotiateRetention };
