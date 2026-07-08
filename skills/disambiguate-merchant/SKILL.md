---
name: disambiguate-merchant
description: Decode a cryptic bank/card descriptor (e.g. `SQ *GYM8XJ209`) into the real merchant and service, with a calibrated confidence. The load-bearing, un-fakeable step regex cannot do.
model: qwen3.7-plus
---

# disambiguate-merchant

**Trigger.** For each clustered charge descriptor that needs a real merchant name (after `text-embedding-v4` clusters/dedupes descriptors across cards).

**Why it's load-bearing.** `SQ *GYM8XJ209 → Anytime Fitness` is exactly what a regex/string-match baseline cannot produce. A judge can hand it an unprepped descriptor live.

**Input**

```json
{ "clusters": [ { "id": "c0", "descriptor": "SQ *GYM8XJ209", "amounts": [12.99, 12.99], "cards": 1 } ] }
```

**Output (structured)**

```json
{ "results": [ { "id": "c0", "merchant": "Anytime Fitness", "category": "gym membership", "confidence": 0.97 } ] }
```

`merchant` is `null` and `confidence < 0.5` when it cannot be decoded — it never guesses a plausible-sounding brand (that's what Gate 1 + "ask, don't guess" are for).

**Runtime.** System prompt + zod schema live in [`lib/skills/index.ts`](../../lib/skills/index.ts) (`disambiguateMerchant`); invoked (batched) by [`lib/pipeline/analyze.ts`](../../lib/pipeline/analyze.ts) → `decodeClusters`. All inference hits `dashscope-intl`.
