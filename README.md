# Spout

**Your money's been going out the spout.** *A subscription is a faucet you forgot to close.*

Drop in a bank or card statement. A little otter plumber reads it, **decodes every cryptic charge** — even the ones hidden in code (`SQ *GYM8XJ209 → Anytime Fitness`) — finds the silent ones (converted trials, price creeps, duplicates across cards, gray charges), and **shuts the ones you okay** from your own inbox, then argues with the "please don't go" screens for you. **You just nod.**

> Track 4 · Autopilot Agent — **Qwen Cloud Global AI Hackathon**. Built in the style of Tan Han Wei: the architecture diagram, the UI, and the demo are the **same top-to-bottom picture** — a waterworks you watch work.

---

## The one mechanic

```
 drop a statement ─PDF/CSV─▶ 1 READ    any format → clean rows     qwen3-vl-plus (images)
                            (redact acct#/PII on device FIRST)
                          2 UN-MASK  descriptor → real merchant     text-embedding-v4 → qwen3.7-plus
                            cluster + dedupe across cards
                          3 DETECT   trials · creep · dupes · gray  qwen3.7-plus (structured)
        ◀── GATE 1 ──   "7 silent charges. $412/yr. Shut which?"    keep · cut · ask
 tap ✔/edit               4 DRAFT   channel-correct, cites rights   qwen3.7-plus + cancel-directory-MCP
        ◀── GATE 2 ──   approve each cancellation
 tap ✔                    5 SEND    from YOUR inbox; read the reply comms-MCP (your Gmail)
 merchant replies ──────▶  6 NEGOTIATE  "50% off to stay!" → counter qwen3.7-max · preserve_thinking
        ◀── GATE 3 ──   take discount · counter · cancel anyway
                         ▸ reclaimed rivulet loops back; Kept gauge ticks up
                         ▸ every step → the RECEIPT LEDGER (append-only, hash-chained NDJSON)
                         ▸ a deterministic POLICY LAYER wraps all of it
```

A plain **regex baseline runs beside every run** and visibly misses the cryptic/sneaky ones — the proof the Qwen stack is load-bearing (`2 vs 7` on the demo statement).

---

## Run it

```bash
npm install
npm run dev            # http://localhost:3000  — watch the 30-second demo, no key needed
# production:
npm run build && npm start
```

- **No secrets required to run.** On-device redaction, the regex baseline, the full waterworks UI, and the pre-seeded **demo** all work with nothing configured.
- **Add `DASHSCOPE_API_KEY`** (a plain `sk-` key from [qwencloud.com](https://home.qwencloud.com/api-keys)) in `.env.local` and the **real AI leak-map** turns on for a stranger's own statement. See [`.env.example`](.env.example).
- **Add a Google OAuth client** to enable the opt-in *send from your own inbox*.

---

## Architecture

One Next.js app (frontend **and** API routes) + three MCP servers. TypeScript throughout; deploys to Vercel (web/PWA) and to Docker on Alibaba Cloud ECS/SAS (the eligibility gate).

```
repo/
├── app/                     # Next.js App Router
│   ├── page.tsx             # 1 · the Spout — landing / drop
│   ├── diagnosis/page.tsx   # 2·reading 3·Gate 1 4·shut-off/Gate 2 5·Gate 3 — one canvas, three gates
│   ├── ledger/page.tsx      # 6 · the receipt ledger (NDJSON) + regex-vs-Spout table
│   ├── settings/page.tsx    # 7 · the Waterworks Control Room
│   ├── globals.css          # the whole design system (cream · ink · brass · one teal)
│   └── api/                 # analyze · draft · negotiate · gmail/* · calendar · health
├── components/              # Waterworks (live SVG canvas), Topbar, SplitFlap, SvgDefs, ConnectModal, Toasts
├── lib/
│   ├── qwen/client.ts       # ⬅ the dashscope-intl base URL (eligibility code file); key from env only
│   ├── qwen/models.ts       # model routing per stage
│   ├── skills/              # the 4 custom skills (system prompt + zod schema)
│   ├── pipeline/            # cluster → analyze(un-mask+detect) → draft → negotiate; demo + honest-degraded paths
│   ├── redact/              # on-device PII redaction (isomorphic, pure)
│   ├── baseline/regex.ts    # the plain string-match baseline (runs beside every run)
│   ├── ledger/              # append-only, hash-chained NDJSON (+ SHA-256)
│   ├── cancel-directory/    # the curated merchant→channel dataset (directory.json)
│   ├── parse/               # client-side CSV + PDF-text extraction (pdf.js)
│   ├── gmail/               # comms — the user's own inbox (Gmail API)
│   ├── demo/                # the pre-seeded, anonymised demo statement + canonical leak-map
│   └── store.tsx            # the client session store (state + all actions)
├── services/                # 3 runnable MCP servers (cancel-directory · comms · calendar)
├── skills/                  # portable SKILL.md docs (one per custom skill)
├── Dockerfile · docker-compose.yml   # Alibaba ECS/SAS deploy
└── DEPLOY.md
```

**Data flow (the real path).** The browser parses the statement and **redacts PII on-device** (`lib/redact`) *before any network call* — only `merchant · amount · date` (+ an anonymised card label) leave. `POST /api/analyze` clusters the descriptors with `text-embedding-v4`, decodes each with the `disambiguate-merchant` skill, detects silent patterns with `detect-recurring` (structured output), and returns the leak-map. The regex baseline runs on the same rows for the side-by-side proof. Gate decisions, drafts, sends, replies and shuts are appended to the hash-chained ledger. No money ever moves.

---

## What is REAL

| Claim | Status |
|---|---|
| Upload **your own** statement (PDF/CSV), no account, no bank link | ✅ real |
| **PII redacted on-device** before anything is read (only merchant·amount·date leave) | ✅ real, in-browser |
| **Regex baseline** beside every run (the `2 vs 7` proof) | ✅ real, deterministic, keyless |
| **Decode** cryptic descriptor → merchant · **detect** trials/creep/dupes/gray | ✅ real via Qwen — behind `DASHSCOPE_API_KEY` |
| **Draft** channel-correct, rights-citing cancellation | ✅ real via Qwen; genuine template fallback with no key |
