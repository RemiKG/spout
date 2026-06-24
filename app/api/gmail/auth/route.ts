import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authUrl, gmailConfigured } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!gmailConfigured()) {
    return NextResponse.redirect(new URL("/diagnosis?inbox=unconfigured", origin));
  }
  const state = crypto.randomUUID();
  const url = await authUrl(origin, state);
  const res = NextResponse.redirect(url);
  res.cookies.set("spout_oauth_state", state, {
    httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), path: "/", maxAge: 600,
  });
  return res;
}
