"use client";
import { useStore } from "@/lib/store";

export default function ConnectModal() {
  const { connectOpen, openConnect, inbox } = useStore();
  if (!connectOpen) return null;
  const configured = inbox.configured;

  return (
    <>
      <div className="scrim" onClick={() => openConnect(false)} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Connect your inbox">
        <div className="left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/otter-gate.png" alt="" />
        </div>
        <div className="right">
          <div className="eyebrow">optional · the real send</div>
          <h2 className="sec" style={{ fontSize: 28, margin: "8px 0 6px" }}>Let the otter send the escape for you.</h2>
          <div className="sub">
            Connect your inbox and Spout will send each cancellation you approve <b>from your own address</b>, then
            read and negotiate the replies. Skip it and you still get the full leak-map and a one-tap pack for every charge.
          </div>

          <div className="b"><span className="m">◆</span><div>It sends <b>only</b> the cancellations you approve at Gate 2 — never anything else.</div></div>
          <div className="b"><span className="m">◆</span><div>It reads <b>only</b> the reply threads to those messages. It never opens the rest of your mail.</div></div>
          <div className="b"><span className="m">◆</span><div>Disconnect anytime. Revoke in one tap. Your money, your data, your call.</div></div>

          {!configured && (
            <div className="notice" style={{ marginTop: 16 }}>
              <span className="i">◆</span>
              <div>
                Real send isn&apos;t wired on this deployment yet — it needs a Google OAuth client
                (<code>GOOGLE_OAUTH_CLIENT_ID</code> / <code>_SECRET</code>). Until then, every charge still gets an
                honest one-tap cancellation pack, and the demo shows the full reply loop.
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            <a
              className="btn brass"
              href={configured ? "/api/gmail/auth" : undefined}
              aria-disabled={!configured}
              style={!configured ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            >
              Connect Gmail
            </a>
            <button className="btn ghost" onClick={() => openConnect(false)}>Not now — just show my leaks</button>
          </div>
        </div>
      </div>
    </>
  );
}
