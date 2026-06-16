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
