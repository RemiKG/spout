// Tiny signed-cookie helper for the connected-inbox token. HMAC-SHA256 over the
// payload with SPOUT_SESSION_SECRET. The token is the ONLY thing that persists
// for the inbox connection; it lives here, never in the browser bundle.
import "server-only";
import crypto from "node:crypto";

const SECRET = process.env.SPOUT_SESSION_SECRET || "spout-dev-secret-change-me";
export const INBOX_COOKIE = "spout_inbox";

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function sign(obj: unknown): string {
  const payload = b64url(JSON.stringify(obj));
  const mac = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verify<T = unknown>(token: string | undefined | null): T | null {
  if (!token || !token.includes(".")) return null;
  const [payload, mac] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
