import { NextRequest, NextResponse } from "next/server";
import { INBOX_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(INBOX_COOKIE);
  return res;
}
