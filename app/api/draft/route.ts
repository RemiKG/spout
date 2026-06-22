import { NextRequest, NextResponse } from "next/server";
import { draftCancellation } from "@/lib/pipeline/draft";
import type { Charge } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { charge, userEmail } = (await req.json()) as { charge: Charge; userEmail?: string };
    if (!charge) return NextResponse.json({ error: "no charge" }, { status: 400 });
    const cancellation = await draftCancellation(charge, userEmail);
    return NextResponse.json({ cancellation });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "draft failed" }, { status: 500 });
  }
}
