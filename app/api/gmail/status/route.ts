import { NextRequest, NextResponse } from "next/server";
import { verify, INBOX_COOKIE } from "@/lib/session";
import { gmailConfigured, type InboxToken } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = verify<InboxToken>(req.cookies.get(INBOX_COOKIE)?.value);
  return NextResponse.json({
    configured: gmailConfigured(),
    connected: !!token,
    email: token?.email ?? null,
  });
}
