#!/usr/bin/env node
// calendar-MCP — free-trial-deadline reminders as an MCP tool. Writes to the
// user's Google Calendar when configured; otherwise returns a downloadable .ics
// (keyless, honest). Run:  npm run mcp:calendar
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const CID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CSEC = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const RTOK = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
const configured = !!(CID && CSEC && RTOK);

function ics(summary, date, description) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Spout//trial-reminder//EN", "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`, `SUMMARY:${summary}`, description ? `DESCRIPTION:${description}` : "",
    "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
}

const server = new Server({ name: "calendar-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "add_trial_reminder",
    description: "Add a free-trial-deadline reminder. Writes to Google Calendar when configured, else returns an .ics.",
    inputSchema: { type: "object", properties: { summary: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" }, description: { type: "string" } }, required: ["summary", "date"] },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: a = {} } = req.params;
  if (name !== "add_trial_reminder") return { content: [{ type: "text", text: `unknown tool: ${name}` }], isError: true };
  if (configured) {
    try {
      const { google } = await import("googleapis");
      const auth = new google.auth.OAuth2(CID, CSEC);
      auth.setCredentials({ refresh_token: RTOK });
      const cal = google.calendar({ version: "v3", auth });
      const ev = await cal.events.insert({ calendarId: "primary", requestBody: { summary: a.summary, description: a.description, start: { date: a.date }, end: { date: a.date }, reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 1440 }] } } });
      return { content: [{ type: "text", text: JSON.stringify({ via: "calendar", htmlLink: ev.data.htmlLink }, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: JSON.stringify({ via: "ics", ics: ics(a.summary, a.date, a.description), note: String(e?.message || e) }, null, 2) }] };
    }
  }
  return { content: [{ type: "text", text: JSON.stringify({ via: "ics", ics: ics(a.summary, a.date, a.description) }, null, 2) }] };
});

await server.connect(new StdioServerTransport());
console.error(`calendar-mcp ready (${configured ? "LIVE Calendar" : "ics fallback"}) on stdio`);
