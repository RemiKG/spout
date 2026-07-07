#!/usr/bin/env node
// cancel-directory-MCP — a real, runnable MCP server that serves Spout's curated
// merchant → cancellation-channel dataset over the Model Context Protocol. It is
// a MAINTAINED dataset, not a live web crawl. The Next.js app imports the same
// directory.json directly (single source of truth); this server is the MCP
// surface the agentic loop (or any MCP client — the Qwen Responses API)
// calls as a tool.  Run:  npm run mcp:cancel-directory
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../lib/cancel-directory/directory.json"), "utf8"));
const entries = dir.entries;

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function lookup(query) {
  const q = norm(query);
  if (!q) return null;
  for (const e of entries) if (norm(e.name) === q) return e;
  for (const e of entries) {
    if (q.includes(norm(e.name)) || norm(e.name).includes(q)) return e;
    for (const a of e.aliases || []) {
      const na = norm(a);
      if (na && (q.includes(na) || na.includes(q))) return e;
    }
  }
  return null;
}

function packFor(entry, merchant) {
  if (!entry) {
    return {
      steps: [`Log into your ${merchant} account`, "Find Subscription / Membership / Plan → Cancel", "Decline any pause/discount offer, then confirm", "Save the confirmation"],
      script: `I'd like to cancel my ${merchant} subscription effective the end of the current billing period. Please confirm in writing.`,
    };
  }
  const steps = (entry.script || "").split(/\s*·\s*|\n+/).map((s) => s.trim()).filter(Boolean);
  return { steps: steps.length ? steps : [entry.script], deepLink: entry.deepLink, phone: entry.phone, script: entry.rights || entry.script };
}

const server = new Server({ name: "cancel-directory-mcp", version: dir.version || "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "lookup_merchant",
      description: "Resolve a merchant name or raw bank descriptor to its cancellation channel (email/portal/phone), policy, rights citation, and a one-tap cancellation pack. Returns found:false with a generic pack when unknown.",
      inputSchema: { type: "object", properties: { query: { type: "string", description: "merchant name or raw descriptor, e.g. 'Anytime Fitness' or 'SQ *GYM8XJ209'" } }, required: ["query"] },
    },
    { name: "list_directory", description: "List every merchant in the curated cancel-directory (name + channel).", inputSchema: { type: "object", properties: {} } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  if (name === "lookup_merchant") {
    const e = lookup(args.query);
    const out = e ? { found: true, ...e, pack: packFor(e, e.name) } : { found: false, query: args.query, pack: packFor(null, args.query) };
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }
  if (name === "list_directory") {
    return { content: [{ type: "text", text: JSON.stringify(entries.map((e) => ({ key: e.key, name: e.name, channel: e.channel })), null, 2) }] };
  }
  return { content: [{ type: "text", text: `unknown tool: ${name}` }], isError: true };
});

await server.connect(new StdioServerTransport());
console.error(`cancel-directory-mcp ready (${entries.length} merchants, dataset ${dir.version}) on stdio`);
