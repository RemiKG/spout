# Spout custom Skills

Four named, single-responsibility, reusable units — the pipeline as triggerable skills (a named Qwen judging criterion). Each `SKILL.md` documents the trigger, model, and structured I/O; the operative system prompt + zod schema for every one live in [`lib/skills/index.ts`](../lib/skills/index.ts), so the docs and the runtime never diverge.

| Skill | Model | Stage |
|---|---|---|
| [disambiguate-merchant](disambiguate-merchant/SKILL.md) | `qwen3.7-plus` | un-mask the cryptic descriptor (the un-fakeable core) |
| [detect-recurring](detect-recurring/SKILL.md) | `qwen3.7-plus` (structured) | find trials · creeps · dupes · gray · keep/cut/ask |
| [draft-cancellation](draft-cancellation/SKILL.md) | `qwen3.7-plus` | channel-correct, rights-citing escape |
| [negotiate-retention](negotiate-retention/SKILL.md) | `qwen3.7-max` · `preserve_thinking` | counter the "please don't go" offer, stop at Gate 3 |

Each hits Qwen Cloud (`dashscope-intl`). When no key is set, the deterministic fallbacks in the pipeline keep the app honest (real regex baseline, genuine rights-citing template) rather than faking model output.
