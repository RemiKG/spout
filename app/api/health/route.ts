import { NextResponse } from "next/server";
import { hasQwen, QWEN_BASE_URL } from "@/lib/qwen/client";
import { MODELS } from "@/lib/qwen/models";
import { gmailConfigured } from "@/lib/gmail";
import type { Capabilities } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What's live right now — the UI uses this to show honest degradation. */
export async function GET() {
  const caps: Capabilities = {
    qwen: hasQwen(),
    gmail: gmailConfigured(),
    baseUrl: QWEN_BASE_URL,
    models: { ...MODELS },
  };
  return NextResponse.json(caps);
}
