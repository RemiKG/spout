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
