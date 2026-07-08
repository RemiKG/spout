# Deploying Spout

Spout is a single Next.js app (frontend + API routes) plus three stdio MCP servers. It runs anywhere Node 20+ runs. There are two targets:

- **The web / PWA build** (always-on, works for a stranger): any Node host — **Vercel** is one command.
- **The Alibaba Cloud ECS/SAS deploy** (the Qwen hackathon's eligibility gate): a Docker container in **Singapore (ap-southeast-1)**, where `dashscope-intl` lives.

Neither needs any secret to *run* — the app degrades honestly. Each env var (see [`.env.example`](.env.example)) turns on its real capability when present.

---

## 1 · Web / PWA (Vercel)

```bash
vercel                     # preview
vercel --prod              # production
```

Set env vars in the Vercel dashboard (or `vercel env add`): `DASHSCOPE_API_KEY`, and — for the opt-in real send — `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (`https://<your-app>/api/gmail/callback`), `SPOUT_SESSION_SECRET`. No hardcoded hosts anywhere; the client calls same-origin `/api/*`.

The app is installable (manifest + icons + service-worker-free shell). It is intentionally **not** 100% offline — line-item text hits Qwen Cloud, as required; account numbers/PII are redacted on-device first.

## 2 · Alibaba Cloud ECS/SAS (the eligibility gate)

The deployment-proof code file is [`lib/qwen/client.ts`](lib/qwen/client.ts) — the `dashscope-intl` base URL is visible there, and every model call routes through it.

```bash
# on the ECS/SAS instance (Ubuntu 22.04, Docker), Singapore region:
git clone <this repo> && cd spout
printf 'DASHSCOPE_API_KEY=sk-...\nSPOUT_SESSION_SECRET=%s\n' "$(openssl rand -hex 24)" > .env
docker compose up -d --build      # serves on :8080
```

Open inbound **8080** in the instance firewall/security group. Capture the two required proofs: a console **"Running" workbench screenshot** and a **~30–60 s console+backend recording** (separate from the demo video). Keep it live through the judging window.

## 3 · MCP servers

Run alongside the app (or wire into any MCP client — see [`services/README.md`](services/README.md)):

```bash
npm run mcp:cancel-directory
npm run mcp:comms       # real send needs GOOGLE_OAUTH_* + a refresh token
npm run mcp:calendar
```

## Persistence

The receipt ledger, keep-list and Control-Room settings persist **in the browser** (localStorage) — matching "persists locally/in-session"; the statement is never stored. The connected-inbox token persists in a signed, httpOnly cookie until you disconnect. To add shared server-side persistence on the Alibaba box, point `DATABASE_URL` at a Postgres instance (seam is documented; browser-only is the default).
