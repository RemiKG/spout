import { NextRequest, NextResponse } from "next/server";
import { verify, INBOX_COOKIE } from "@/lib/session";
import { type InboxToken } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Free-trial-deadline reminder. If the inbox is connected, write it to the
 *  user's Google Calendar; otherwise return a downloadable .ics (honest, keyless). */
export async function POST(req: NextRequest) {
  const { summary, date, description } = (await req.json()) as { summary: string; date: string; description?: string };
  const token = verify<InboxToken>(req.cookies.get(INBOX_COOKIE)?.value);

  if (token) {
    try {
      const { google } = await import("googleapis");
      const { google: g2 } = { google };
      const { OAuth2 } = g2.auth;
      const client = new OAuth2(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET);
      client.setCredentials(token as never);
      const cal = google.calendar({ version: "v3", auth: client });
      const ev = await cal.events.insert({
        calendarId: "primary",
        requestBody: {
          summary, description,
          start: { date }, end: { date },
          reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 * 24 }] },
        },
      });
      return NextResponse.json({ ok: true, via: "calendar", htmlLink: ev.data.htmlLink });
    } catch (err) {
      // fall through to ics
    }
  }
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Spout//trial-reminder//EN", "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`, `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "", "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return NextResponse.json({ ok: true, via: "ics", ics });
}
