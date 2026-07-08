// Retention negotiation. Reads a merchant's reply thread, parses the offer, and
// drafts the user's counter using qwen3.7-max with preserve_thinking — then
// STOPS at Gate 3. It never accepts or cancels for the user.
import type { ThreadMessage } from "../types";
import { chat, parseJson, hasQwen } from "../qwen/client";
import { MODELS } from "../qwen/models";
import { SKILLS, NegotiateSchema } from "../skills";

export interface NegotiateResult {
  offer: { kind: string; label: string; monthly?: number; months?: number } | null;
  counter: string;
  recommendation: string;
}

export async function negotiate(merchant: string, thread: ThreadMessage[]): Promise<NegotiateResult> {
  if (hasQwen()) {
    try {
      const msg = await chat({
        model: MODELS.negotiate,
        system: SKILLS.negotiateRetention.system,
        thinking: true,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              merchant,
              thread: thread.map((m) => ({ role: m.role, from: m.from, body: m.body })),
            }),
          },
        ],
        json: true,
      });
      const r = NegotiateSchema.parse(parseJson(msg.content));
      return { offer: r.offer, counter: r.counter, recommendation: r.recommendation };
    } catch {
      /* fall through */
    }
  }
  // deterministic fallback counter (no key)
  return {
    offer: null,
    counter:
      `Thanks, but a temporary discount that reverts later isn't worth it to me. ` +
      `I'll stay only if you can lock the discounted rate for a full 12 months. ` +
      `Otherwise please proceed with the cancellation at the end of the cycle and confirm in writing.`,
    recommendation: "Hold out for a durable rate, or cancel — your call at Gate 3.",
  };
}
