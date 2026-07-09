import { NextRequest, NextResponse } from "next/server";
import { hasQwen } from "@/lib/qwen/client";
import { analyzeStatement } from "@/lib/pipeline/analyze";
import { baselineOnlyDiagnosis } from "@/lib/pipeline/degraded";
import { buildDemoDiagnosis } from "@/lib/pipeline/demo";
import { readStatementImage } from "@/lib/pipeline/read";
import { redactStatement } from "@/lib/redact";
import type { RawLine } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: {
    lines?: RawLine[];
    imageDataUrl?: string;
    settings?: Record<string, unknown>;
    keepList?: string[];
    demo?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // pre-seeded demo path — works with or without a key
  if (body.demo) {
    return NextResponse.json({ diagnosis: buildDemoDiagnosis(), mode: "demo" });
  }

  try {
    let lines = body.lines || [];

    // image / scanned upload → VL read (needs a Qwen key; honest otherwise)
    if (body.imageDataUrl) {
      if (!hasQwen()) {
        return NextResponse.json(
          {
            error: "vl_unavailable",
            message:
              "Reading a scanned/photographed statement needs the VL model (qwen3-vl-plus), which requires DASHSCOPE_API_KEY. Upload a PDF or CSV to use the on-device redaction path, or try the demo.",
          },
          { status: 422 }
        );
      }
      lines = await readStatementImage(body.imageDataUrl);
    }

    if (!lines.length) {
      return NextResponse.json({ error: "no_rows", message: "No transaction rows were found in that file." }, { status: 422 });
    }

    // defence in depth: redact again on the server (client already redacted)
    const { lines: redacted } = redactStatement(lines);

    if (hasQwen()) {
      const diagnosis = await analyzeStatement(redacted, {
        settings: body.settings as never,
        keepList: body.keepList,
      });
      return NextResponse.json({ diagnosis, mode: "ai" });
    }

    // honest degraded path — real redaction + real regex baseline, no fake decode
    return NextResponse.json({ diagnosis: baselineOnlyDiagnosis(redacted), mode: "baseline" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "analysis failed";
    // never crash the request — degrade to the baseline on the caller's rows
    if (body.lines?.length) {
      return NextResponse.json({ diagnosis: baselineOnlyDiagnosis(redactStatement(body.lines).lines), mode: "baseline", note: message });
    }
    return NextResponse.json({ error: "analyze_failed", message }, { status: 500 });
  }
}
