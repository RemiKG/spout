# Spout MCP servers

Three real, runnable [Model Context Protocol](https://modelcontextprotocol.io) servers — the external tools the Spout agent invokes. Each speaks MCP over stdio and can be used by any MCP client (the Qwen Responses API tool-loop, `mcp` CLIs).

| Server | Tools | What it does | Real when… |
|---|---|---|---|
| **cancel-directory-mcp** | `lookup_merchant`, `list_directory` | Resolves a merchant / raw descriptor → cancellation channel, policy, rights, and a one-tap pack, from the **curated dataset** ([`lib/cancel-directory/directory.json`](../lib/cancel-directory/directory.json)). A maintained dataset, **not** a live crawl. | always (no creds needed) |
| **comms-mcp** | `send_cancellation`, `read_thread` | Sends an approved cancellation from the user's **own Gmail** and reads the reply thread (scope-limited). | `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` set — else returns `simulated:true`, never a fake send |
| **calendar-mcp** | `add_trial_reminder` | Free-trial-deadline reminder → Google Calendar, else a downloadable `.ics`. | Google creds set — else `.ics` fallback |

## Run

```bash
npm run mcp:cancel-directory   # node services/cancel-directory-mcp/server.mjs
npm run mcp:comms
npm run mcp:calendar
```

Each prints a `ready …` line to **stderr** and then serves MCP on **stdio**.

## How the app uses them

The Next.js app imports the **same** `directory.json` and Gmail helpers directly for the serverless/Vercel path (no subprocess needed), so the web build works everywhere. The MCP servers are the portable tool surface for the agentic negotiation loop (`qwen3.7-max` + `preserve_thinking`) when Spout runs on a Node host (local or the Alibaba ECS/SAS deploy): the model calls `cancel-directory-mcp.lookup_merchant` to pick the channel, drafts with the `draft-cancellation` skill, sends via `comms-mcp.send_cancellation`, reads the reply via `comms-mcp.read_thread`, and negotiates — pausing at each human gate. Single source of truth, two transports.

## Wire into an MCP client

```json
{
  "mcpServers": {
    "cancel-directory": { "command": "node", "args": ["services/cancel-directory-mcp/server.mjs"], "cwd": "<repo>" },
    "comms":            { "command": "node", "args": ["services/comms-mcp/server.mjs"], "cwd": "<repo>",
                          "env": { "GOOGLE_OAUTH_CLIENT_ID": "…", "GOOGLE_OAUTH_CLIENT_SECRET": "…", "GOOGLE_OAUTH_REFRESH_TOKEN": "…" } },
    "calendar":         { "command": "node", "args": ["services/calendar-mcp/server.mjs"], "cwd": "<repo>" }
  }
}
```
