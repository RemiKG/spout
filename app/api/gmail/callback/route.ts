import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getEmail } from "@/lib/gmail";
import { sign, INBOX_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("spout_oauth_state")?.value;

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL("/diagnosis?inbox=error", origin));
  }
  try {
    const tokens = await exchangeCode(origin, code);
    const email = (await getEmail(origin, tokens as never)) || undefined;
    const token = { refresh_token: tokens.refresh_token, access_token: tokens.access_token, expiry_date: tokens.expiry_date, email };
    const res = NextResponse.redirect(new URL("/diagnosis?connected=1", origin));
    res.cookies.set(INBOX_COOKIE, sign(token), {
      httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.delete("spout_oauth_state");
    return res;
  } catch (err) {
    return NextResponse.redirect(new URL("/diagnosis?inbox=error", origin));
  }
}
