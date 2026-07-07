#!/usr/bin/env node
// comms-MCP — the user's OWN inbox as an MCP tool surface. Sends approved
// cancellations from their Gmail and reads the reply threads. Real when a Google
// OAuth client + refresh token are provided via env; otherwise it degrades
// HONESTLY (returns simulated:true, never a fake "sent"). This is the transport
// the negotiation agent invokes.  Run:  npm run mcp:comms
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const CID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CSEC = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const RTOK = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
const SENDER = process.env.GOOGLE_OAUTH_SENDER || "me";
const configured = !!(CID && CSEC && RTOK);

async function gmail() {
  const { google } = await import("googleapis");
  const auth = new google.auth.OAuth2(CID, CSEC);
  auth.setCredentials({ refresh_token: RTOK });
  return google.gmail({ version: "v1", auth });
}

function rawMessage(from, to, subject, body) {
  const lines = [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

const server = new Server({ name: "comms-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "send_cancellation",
      description: "Send an approved cancellation email from the user's own inbox. Returns the messageId + threadId, or simulated:true if comms-mcp is not configured.",
      inputSchema: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] },
    },
    {
      name: "read_thread",
      description: "Read the reply thread to a sent cancellation (scope-limited to that thread). Returns the messages, or simulated:true if not configured.",
      inputSchema: { type: "object", properties: { threadId: { type: "string" } }, required: ["threadId"] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: a = {} } = req.params;
  if (!configured) {
    return { content: [{ type: "text", text: JSON.stringify({ simulated: true, note: "comms-mcp not configured — set GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN to send & read for real. No email was sent.", echo: a }, null, 2) }] };
  }
  try {
    const g = await gmail();
    if (name === "send_cancellation") {
      const res = await g.users.messages.send({ userId: "me", requestBody: { raw: rawMessage(SENDER, a.to, a.subject, a.body) } });
      return { content: [{ type: "text", text: JSON.stringify({ sent: true, id: res.data.id, threadId: res.data.threadId }, null, 2) }] };
    }
    if (name === "read_thread") {
      const res = await g.users.threads.get({ userId: "me", id: a.threadId, format: "full" });
      const msgs = (res.data.messages || []).map((m) => {
        const h = (n) => (m.payload?.headers || []).find((x) => x.name?.toLowerCase() === n)?.value || "";
        const part = m.payload?.parts?.find((p) => p.mimeType === "text/plain") || m.payload;
        const data = part?.body?.data ? Buffer.from(part.body.data, "base64").toString() : "";
        return { from: h("from"), subject: h("subject"), at: h("date"), body: data };
      });
      return { content: [{ type: "text", text: JSON.stringify({ messages: msgs }, null, 2) }] };
    }
  } catch (e) {
    return { content: [{ type: "text", text: JSON.stringify({ error: String(e?.message || e) }) }], isError: true };
  }
  return { content: [{ type: "text", text: `unknown tool: ${name}` }], isError: true };
});

await server.connect(new StdioServerTransport());
console.error(`comms-mcp ready (${configured ? "LIVE Gmail" : "simulated — no OAuth creds"}) on stdio`);
