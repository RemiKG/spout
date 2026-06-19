// ============================================================================
// comms — the user's OWN Gmail (opt-in). Real send + read of the approved reply
// threads via Google OAuth. Behind the GOOGLE_OAUTH_* env seam: with no client
// configured, `gmailConfigured()` is false and the UI keeps the honest one-tap
// pack path for every charge. Scopes are limited to send + read.
// ============================================================================
import "server-only";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
];

export function gmailConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${origin}/api/gmail/callback`;
}

async function oauth(origin: string) {
  const { google } = await import("googleapis");
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri(origin)
  );
}

export async function authUrl(origin: string, state: string): Promise<string> {
  const client = await oauth(origin);
  return client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: GMAIL_SCOPES, state });
}

export async function exchangeCode(origin: string, code: string) {
  const client = await oauth(origin);
  const { tokens } = await client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, ... }
}

export interface InboxToken {
  refresh_token?: string | null;
  access_token?: string | null;
  expiry_date?: number | null;
  email?: string;
}

async function authedClient(origin: string, token: InboxToken) {
  const client = await oauth(origin);
  client.setCredentials(token);
  return client;
}

/** Resolve the connected address (for the top-bar chip). */
export async function getEmail(origin: string, token: InboxToken): Promise<string | null> {
  if (token.email) return token.email;
  try {
    const { google } = await import("googleapis");
    const auth = await authedClient(origin, token);
    const oauth2 = google.oauth2({ version: "v2", auth });
    const me = await oauth2.userinfo.get();
    return me.data.email || null;
  } catch {
    return null;
  }
}

function rawMessage(from: string, to: string, subject: string, body: string): string {
  const lines = [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

/** Actually send the cancellation from the user's own inbox. Returns messageId. */
export async function sendCancellation(
  origin: string,
  token: InboxToken,
  msg: { to: string; subject: string; body: string; from: string }
): Promise<{ id: string; threadId: string }> {
  const { google } = await import("googleapis");
  const auth = await authedClient(origin, token);
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: rawMessage(msg.from, msg.to, msg.subject, msg.body) },
  });
  return { id: res.data.id!, threadId: res.data.threadId! };
}

/** Read the reply thread to a sent cancellation (scope-limited to that thread). */
export async function readThread(origin: string, token: InboxToken, threadId: string) {
  const { google } = await import("googleapis");
  const auth = await authedClient(origin, token);
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
  const msgs = (res.data.messages || []).map((m) => {
    const headers = m.payload?.headers || [];
    const h = (n: string) => headers.find((x) => x.name?.toLowerCase() === n)?.value || "";
    const part = m.payload?.parts?.find((p) => p.mimeType === "text/plain") || m.payload;
    const data = part?.body?.data ? Buffer.from(part.body.data, "base64").toString() : "";
    return { from: h("from"), subject: h("subject"), at: h("date"), body: data };
  });
  return msgs;
}
