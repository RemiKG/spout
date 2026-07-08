---
name: draft-cancellation
description: Compose the channel-correct cancellation. Email merchants get a short, firm, rights-citing letter to send from the user's own inbox; portal/phone merchants get an honest one-tap pack (exact steps + script) — never a fake "cancelled everywhere".
model: qwen3.7-plus
---

# draft-cancellation

**Trigger.** For each charge the user approves to cut at Gate 1.

**Email channel** → `{ subject, body }`. Cites the user's cancellation rights ("under my contract's cancellation terms and applicable consumer-protection law"), requests written confirmation of the cancellation and final billing date, states no further charges are authorised, signs "— sent on your behalf by Spout". Under ~90 words.

**Portal / phone channel** → `{ pack: { steps[], script } }`, honest that Spout cannot auto-send this one. The channel + deep link come from the **cancel-directory** (a maintained dataset, not a live crawl).

**Output (structured)**

```json
{ "channel": "email", "to": "memberservices@anytimefitness.com",
  "subject": "Cancellation of membership — acct ••••", "body": "Hello — I'm cancelling…" }
```

**Runtime.** [`lib/skills/index.ts`](../../lib/skills/index.ts) (`draftCancellation`) → [`lib/pipeline/draft.ts`](../../lib/pipeline/draft.ts). A genuine deterministic rights-citing template is produced when no key is set (never faked). Sent for real via **comms-MCP** (the user's own Gmail) at Gate 2.
