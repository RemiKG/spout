// Model routing — which Qwen model runs each stage. Matches the Control Room
// panel exactly. Overridable per-stage via env so the app tracks Model Studio's
// current ids without a code change. All hit dashscope-intl (see client.ts).
export const MODELS = {
  read: process.env.QWEN_MODEL_READ || "qwen3-vl-plus",
  embed: process.env.QWEN_MODEL_EMBED || "text-embedding-v4",
  unmask: process.env.QWEN_MODEL_UNMASK || "qwen3.7-plus",
  detect: process.env.QWEN_MODEL_DETECT || "qwen3.7-plus",
  draft: process.env.QWEN_MODEL_DRAFT || "qwen3.7-plus",
  negotiate: process.env.QWEN_MODEL_NEGOTIATE || "qwen3.7-max",
} as const;

/** Human-readable routing shown in the Control Room (Screen 7). */
export const MODEL_ROUTING: { stage: string; model: string }[] = [
  { stage: "READ statement", model: MODELS.read },
  { stage: "UN-MASK descriptor", model: `${MODELS.embed} · ${MODELS.unmask}` },
  { stage: "DETECT patterns", model: `${MODELS.detect} · structured` },
  { stage: "DRAFT cancellation", model: MODELS.draft },
  { stage: "NEGOTIATE retention", model: `${MODELS.negotiate} · preserve_thinking` },
];
