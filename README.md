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
