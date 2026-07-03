"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Landing() {
  const router = useRouter();
  const { startDemo, analyzeFile } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const go = () => router.push("/diagnosis");

  const onFile = async (f?: File | null) => {
    if (!f) return;
    go();
    analyzeFile(f);
  };

  return (
    <div
      className="hero-center"
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/art/wordmark-mark.png" alt="Spout" style={{ height: 104, marginBottom: 10 }} />
      <h1 className="big" style={{ fontSize: 44, maxWidth: 780, margin: "8px auto 6px" }}>
        Somewhere in your statement, money is going out the spout.
      </h1>
      <div className="lead" style={{ marginBottom: 4 }}>A subscription is a faucet you forgot to close.</div>
      <div className="sub" style={{ maxWidth: 620, margin: "12px auto 0" }}>
        Drop in a bank or card statement. A little plumber reads it, decodes every cryptic charge, finds the silent
        ones — and shuts the ones you okay. <b>You just nod.</b>
      </div>

      <div className={`drop ${drag ? "drag" : ""}`} style={{ maxWidth: 640, margin: "26px auto 0" }}>
        <div style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 22, color: "var(--ink)" }}>
          Drop your statement to find your leaks
        </div>
        <div className="sub" style={{ margin: 0 }}>PDF or CSV — every bank exports one. Photographed or scanned is fine.</div>
        <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn brass" onClick={() => fileRef.current?.click()}>Choose a statement</button>
          <button className="btn ghost" onClick={() => { go(); startDemo(); }}>▷ Watch the 30-second demo</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.pdf,image/*,text/csv,application/pdf"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      <div className="pipe" style={{ marginTop: 20 }}>
        <span>① read any format</span><span className="mut">→</span>
        <span>② un-mask each charge</span><span className="mut">→</span>
        <span>③ find the silent stuff</span><span className="mut">→</span>
        <span>④ you approve every shut</span>
      </div>

      <div className="reassure">
        <div><b>◆</b> No account needed to see your leaks</div>
        <div><b>◆</b> Account numbers redacted on your device <i>before</i> anything is read</div>
        <div><b>◆</b> Nothing sent or cancelled without your nod</div>
      </div>

      <OtterCorner />
    </div>
  );
}

function OtterCorner() {
  return (
    <div className="otter-corner" aria-hidden>
      <div className="otter-speech">&ldquo;Point me at the pipes. I&rsquo;ll wait at every valve.&rdquo;</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/art/otter-gate.png" alt="" />
    </div>
  );
}
