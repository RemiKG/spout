---
name: negotiate-retention
description: Read a merchant's retention reply ("50% off to stay!"), parse the offer, and draft the user's counter — then STOP at Gate 3. It never accepts or cancels for the user.
model: qwen3.7-max (preserve_thinking)
---

# negotiate-retention

**Trigger.** When a merchant replies to a sent cancellation with a retention offer.

**Behaviour.** Parses the offer, drafts a counter that holds out for a *durable* deal (e.g. lock the discounted rate for 12 months, not 6), and hands the user three choices at **Gate 3**: *take the offer · send the counter · cancel anyway*. It **never** accepts or cancels on the user's behalf.

**Model.** `qwen3.7-max` with `preserve_thinking` — the agentic brain, "recommended for agentic tasks", multi-turn.

**Output (structured)**

```json
{ "offer": { "kind": "discount", "label": "50% off for 6 months", "monthly": 3.49, "months": 6 },
  "counter": "Thanks, but a temporary discount that reverts later isn't worth it…",
  "recommendation": "Hold out for a durable rate, or cancel — your call at Gate 3." }
```

**Runtime.** [`lib/skills/index.ts`](../../lib/skills/index.ts) (`negotiateRetention`) → [`lib/pipeline/negotiate.ts`](../../lib/pipeline/negotiate.ts). Reads the reply thread through **comms-MCP**.
