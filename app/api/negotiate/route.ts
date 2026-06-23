import { NextRequest, NextResponse } from "next/server";
import { negotiate } from "@/lib/pipeline/negotiate";
import type { ThreadMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const { merchant, thread } = (await req.json()) as { merchant: string; thread: ThreadMessage[] };
    const result = await negotiate(merchant, thread || []);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "negotiate failed" }, { status: 500 });
  }
}
