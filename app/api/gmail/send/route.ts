import { NextRequest, NextResponse } from "next/server";
import { verify, INBOX_COOKIE } from "@/lib/session";
import { sendCancellation, readThread, type InboxToken } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Actually send an approved cancellation from the user's own inbox. */
export async function POST(req: NextRequest) {
  const token = verify<InboxToken>(req.cookies.get(INBOX_COOKIE)?.value);
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 401 });
  try {
    const { to, subject, body } = (await req.json()) as { to: string; subject: string; body: string };
    const from = token.email || "me";
    const sent = await sendCancellation(req.nextUrl.origin, token, { to, subject, body, from });
    return NextResponse.json({ ok: true, ...sent, from });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "send failed" }, { status: 500 });
  }
}

/** Read the reply thread to a sent cancellation (scope-limited to that thread). */
export async function GET(req: NextRequest) {
  const token = verify<InboxToken>(req.cookies.get(INBOX_COOKIE)?.value);
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 401 });
  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "no threadId" }, { status: 400 });
  try {
    const messages = await readThread(req.nextUrl.origin, token, threadId);
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "read failed" }, { status: 500 });
  }
}
