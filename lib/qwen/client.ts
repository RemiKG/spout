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
