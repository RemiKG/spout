---
name: detect-recurring
description: From the clustered, decoded charges + their per-date amount history, find the silent stuff — converted trials, once-a-year renewals, price creeps, duplicates across cards, gray charges — and reason keep vs cut vs ask.
model: qwen3.7-plus
---

# detect-recurring

**Trigger.** Once, after descriptors are decoded and clustered.

**Detects**
- `price_creep` — the amount rose over time (`$3.99 → $6.99`)
- `duplicate` — the same service billed on two+ cards
- `trial_converting` — a $0 / temp auth that converts to paid soon
- `paused` — usage paused but still billing
- `gray` — a small unrecognised charge
- `unused` — recurs but the user hasn't engaged
- `recurring` — a normal, wanted subscription

**Output (structured)**

```json
{ "charges": [ { "id": "c0", "cadence": "monthly", "amountMonthly": 12.99, "amountYear": 156,
  "reasons": [ { "kind": "unused", "label": "unused 5 months" } ], "verdict": "cut" } ] }
```

`verdict` is `cut` / `keep` / `ask`. It returns **`ask`, not a guess**, when a charge is genuinely unclear, and respects the caller's confidence dial + sacred keep-list.

**Runtime.** [`lib/skills/index.ts`](../../lib/skills/index.ts) (`detectRecurring`) → [`lib/pipeline/analyze.ts`](../../lib/pipeline/analyze.ts) `detectPatterns`. A plain regex baseline ([`lib/baseline/regex.ts`](../../lib/baseline/regex.ts)) runs beside it for the visible 2-vs-N proof.
