// VL read of a scanned/photographed statement with qwen3-vl-plus. Pixels must
// reach the model to be read, so we strip PII from the RETURNED rows server-side
// (defence in depth) — only descriptor·amount·date are kept downstream. The UI
// states this honestly for image uploads.
import type { RawLine } from "../types";
import { chat, parseJson } from "../qwen/client";
import { MODELS } from "../qwen/models";
import { redactStatement } from "../redact";

let uid = 0;

export async function readStatementImage(dataUrl: string): Promise<RawLine[]> {
  const msg = await chat({
    model: MODELS.read,
    maxTokens: 2200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "This is a bank/card statement. Extract EVERY transaction as JSON " +
              '{"rows":[{"descriptor":string,"amount":number,"date":"YYYY-MM-DD","card":string|null}]}. ' +
              "amount is negative for money out. Keep the raw merchant descriptor verbatim. " +
              "Do NOT output account numbers, balances, or the account holder's name/address — only descriptor, amount, date, and the card's last 4 if shown.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ] as never,
      },
    ],
    json: true,
  });
  const out = parseJson<{ rows: { descriptor: string; amount: number; date: string; card?: string }[] }>(msg.content);
  const lines: RawLine[] = (out.rows || []).map((r) => ({
    id: `v${uid++}`,
    descriptor: String(r.descriptor || "").slice(0, 80),
    amount: Number(r.amount) || 0,
    date: String(r.date || ""),
    card: r.card ? String(r.card).replace(/\D/g, "").slice(-4) : undefined,
  }));
  // defence in depth: redact anything the VL model may have echoed back
  return redactStatement(lines).lines;
}
