// Draft a channel-correct cancellation for one charge. Email merchants get a
// rights-citing letter (via the draft-cancellation skill when Qwen is on, or a
// genuine deterministic template otherwise). Portal/phone merchants get an
// honest one-tap pack from the cancel-directory — never a fake "cancelled".
import type { Cancellation, Charge } from "../types";
import { chat, parseJson, hasQwen } from "../qwen/client";
import { MODELS } from "../qwen/models";
import { SKILLS, DraftSchema } from "../skills";
import { lookupMerchant, packFor } from "../cancel-directory";

export async function draftCancellation(charge: Charge, userEmail?: string): Promise<Cancellation> {
  const merchant = charge.merchant ?? charge.descriptor;
  const entry = lookupMerchant(merchant);
  const channel = charge.channel;

  const base: Cancellation = {
    chargeId: charge.id,
    merchant,
    channel,
    amountYear: charge.amountYear,
    state: channel === "email" ? "drafted" : "pack_ready",
  };

  if (channel !== "email") {
    return { ...base, pack: packFor(entry, merchant) };
  }

  // email path
  if (hasQwen()) {
    try {
      const msg = await chat({
        model: MODELS.draft,
        system: SKILLS.draftCancellation.system,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              merchant,
              channel,
              descriptor: charge.descriptor,
              amountMonthly: charge.amountMonthly,
              reason: charge.reasons[0]?.label,
              to: entry?.email,
              rights: entry?.rights,
              from: userEmail || "you@your-inbox",
            }),
          },
        ],
        json: true,
      });
      const d = DraftSchema.parse(parseJson(msg.content));
      if (d.channel === "email") {
        return { ...base, to: d.to || entry?.email, subject: d.subject, body: d.body };
      }
      return { ...base, channel: d.channel, state: "pack_ready", pack: d.pack ?? packFor(entry, merchant) };
    } catch {
      /* fall through to template */
    }
  }

  // deterministic, genuine rights-citing template (no key needed)
  return {
    ...base,
    to: entry?.email || `cancellations@${slug(merchant)}.example`,
    subject: `Cancellation of ${merchant} — effective end of billing period`,
    body:
      `Hello — I'm cancelling my ${merchant} subscription effective at the end of the current billing period. ` +
      `Under my contract's cancellation terms and applicable consumer-protection law, please confirm the cancellation ` +
      `and the final billing date in writing. I do not authorise further charges. Thank you. — sent on your behalf by Spout`,
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
