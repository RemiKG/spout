// ============================================================================
// Qwen Cloud client — ALL Spout inference runs through Alibaba Cloud Model Studio
// (DashScope International), OpenAI-compatible mode. This file is the deployment-
// proof code file the hackathon's eligibility gate asks for: the base URL is
// visible right here, in the repo, and the key is read ONLY from the environment
// (never hardcoded, never shipped to the browser).
//
//   Endpoint : https://dashscope-intl.aliyuncs.com/compatible-mode/v1
//   Auth     : Bearer $DASHSCOPE_API_KEY   (a plain sk- key)
//   Runs on  : Docker on Alibaba Cloud ECS/SAS (Singapore, ap-southeast-1)
//
// With no key set, `hasQwen()` is false and every caller degrades honestly (the
// regex baseline + on-device redaction still work; the demo path is clearly
// labelled). The moment DASHSCOPE_API_KEY exists, the real AI path turns on.
// ============================================================================
import "server-only";
import OpenAI from "openai";

/** The canonical Qwen Cloud (DashScope International) OpenAI-compatible endpoint. */
export const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export function hasQwen(): boolean {
  return !!process.env.DASHSCOPE_API_KEY;
}

let _client: OpenAI | null = null;
export function qwen(): OpenAI {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY is not set — Qwen inference is unavailable.");
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: QWEN_BASE_URL,
    });
  }
  return _client;
}

export interface ChatOpts {
  model: string;
  system?: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  json?: boolean;                 // ask for a JSON object back
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;             // enable_thinking / preserve_thinking (qwen3.7-max)
  tools?: OpenAI.Chat.ChatCompletionTool[];
}

/** One chat completion against Qwen. Adds DashScope's thinking flags via the
 *  extra request body when asked. Returns the assistant message. */
export async function chat(opts: ChatOpts): Promise<OpenAI.Chat.ChatCompletionMessage> {
  const client = qwen();
  const messages = opts.system
    ? [{ role: "system" as const, content: opts.system }, ...opts.messages]
    : opts.messages;

  const body: Record<string, unknown> = {
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 1400,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.tools) body.tools = opts.tools;
  if (opts.thinking) {
    // DashScope thinking controls (passed through compatible-mode extra body).
    body.enable_thinking = true;
    body.preserve_thinking = true;
  } else {
    // Interactive stages must answer fast — qwen3.7 models default to thinking
    // mode on DashScope, which adds 40–80s per call. Turn it off explicitly.
    body.enable_thinking = false;
  }

  const res = (await client.chat.completions.create(body as never)) as OpenAI.Chat.ChatCompletion;
  return res.choices[0].message;
}

/** Parse a JSON object out of a model message, tolerating ```json fences. */
export function parseJson<T = unknown>(text: string | null | undefined): T {
  if (!text) throw new Error("empty model response");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const startArr = raw.indexOf("[");
  const from = start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  const slice = from >= 0 ? raw.slice(from) : raw;
  return JSON.parse(slice) as T;
}

/** text-embedding-v4 — embed a batch of strings (max 250/call on DashScope). */
export async function embed(texts: string[], model: string): Promise<number[][]> {
  const client = qwen();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 250) {
    const batch = texts.slice(i, i + 250);
    const res = await client.embeddings.create({ model, input: batch });
    for (const d of res.data) out.push(d.embedding as unknown as number[]);
  }
  return out;
}

/** Cosine similarity, for clustering descriptors across cards. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
