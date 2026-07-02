"use client";
import { useStore } from "@/lib/store";
import { MODEL_ROUTING } from "@/lib/qwen/models";

function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return <div className={`tog ${on ? "on" : ""}`} onClick={onClick} role="switch" aria-checked={on}><i /></div>;
}

export default function SettingsPage() {
  const s = useStore();
  const { settings, keepList, inbox } = s;
  const setRedact = (k: "accounts" | "balances" | "name") =>
    s.setSettings({ redact: { ...settings.redact, [k]: !settings.redact[k] } });

  return (
    <div style={{ padding: 26 }}>
      <div style={{ marginBottom: 18 }}>
        <div className="eyebrow">power user</div>
        <h1 className="big" style={{ fontSize: 38, margin: "6px 0 2px" }}>The Waterworks Control Room</h1>
        <div className="sub">Every dial the plumber uses. Sensible defaults — open the panel only if you want to.</div>
      </div>

      <div className="grid2">
        {/* Redaction */}
        <div className="pan set">
          <h3>Redaction — before anything is read</h3>
          <div className="d">Stripped on your device; only merchant · amount · date reach the model.</div>
          <div className="field"><div className="l">Account &amp; card numbers <small>••••4021 → ••••</small></div><Toggle on={settings.redact.accounts} onClick={() => setRedact("accounts")} /></div>
          <div className="field"><div className="l">Balances &amp; running totals</div><Toggle on={settings.redact.balances} onClick={() => setRedact("balances")} /></div>
          <div className="field"><div className="l">Your name &amp; address</div><Toggle on={settings.redact.name} onClick={() => setRedact("name")} /></div>
          <div className="field"><div className="l">Merchant · amount · date <small>needed to un-mask — sent to Qwen</small></div><Toggle on={false} /></div>
        </div>

        {/* Model routing */}
        <div className="pan set">
          <h3>Model routing — which plumber does which job</h3>
          <div className="d">Route each stage to the Qwen model you trust. All hit {s.caps?.baseUrl?.replace("https://", "") || "dashscope-intl"}.</div>
          {MODEL_ROUTING.map((r) => (
            <div className="route" key={r.stage}><span className="st">{r.stage}</span><span className="m">{r.model}</span></div>
          ))}
        </div>

        {/* Connected inbox */}
        <div className="pan set">
          <h3>Connected inbox — the real send</h3>
          <div className="d">Opt-in. Spout only sends the escapes you approve and reads those reply threads.</div>
          <div className="field">
            <div className="l">Gmail — {inbox.email || (inbox.configured ? "not connected" : "not configured")} <small>send + read approved threads only</small></div>
            {inbox.connected ? <span className="chip keep">◆ connected</span> : <button className="btn ghost sm" onClick={() => s.openConnect(true)}>Connect</button>}
          </div>
          <div className="field"><div className="l">Never read my other mail</div><Toggle on /></div>
          <div className="field"><div className="l">Ask before every single send</div><Toggle on /></div>
          {inbox.connected && <button className="btn ghost" style={{ marginTop: 12 }} onClick={s.disconnect}>Disconnect inbox</button>}
        </div>

        {/* Keep-list */}
        <div className="pan set">
          <h3>The keep-list — sacred, never touched</h3>
          <div className="d">Whitelisted services. Spout will never draft, send, or shut these — no matter what it finds.</div>
          <div className="chips" style={{ marginBottom: 12 }}>
            {keepList.map((k) => (
              <span className="kchip" key={k}>{k}<button onClick={() => s.removeKeep(k)} aria-label={`remove ${k}`}>✕</button></span>
            ))}
            <button className="kchip" style={{ cursor: "pointer" }} onClick={() => { const n = window.prompt("Add a service to the sacred keep-list:"); if (n) s.addKeep(n); }}>+ add</button>
          </div>
        </div>

        {/* Confidence & ask */}
        <div className="pan set">
          <h3>Confidence &amp; &ldquo;ask, don&rsquo;t guess&rdquo;</h3>
          <div className="d">Below this certainty on a decode or a keep/cut call, Spout asks you instead of guessing.</div>
          <div className="field">
            <div className="l">Ask me when confidence is below</div>
            <div className="dial" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {settings.askBelow.toFixed(2)}
              <input type="range" min={0.5} max={0.99} step={0.01} value={settings.askBelow} onChange={(e) => s.setSettings({ askBelow: +e.target.value })} />
            </div>
          </div>
          <div className="field">
            <div className="l">Always ask before shutting anything over</div>
            <div className="dial">${settings.alwaysAskOverMonthly} / mo</div>
          </div>
          <div className="field"><div className="l">Show the regex baseline beside every run</div><Toggle on={settings.showBaseline} onClick={() => s.setSettings({ showBaseline: !settings.showBaseline })} /></div>
        </div>

        {/* Mode */}
        <div className="pan set">
          <h3>Mode — whose pipes</h3>
          <div className="d">The same engine, pointed at a person or a company card feed.</div>
          <div className="field">
            <div className="l">Run as</div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className={`pill ${settings.mode === "personal" ? "sel" : ""}`} onClick={() => s.setSettings({ mode: "personal" })}>Personal</span>
              <span className={`pill ${settings.mode === "business" ? "sel" : ""}`} onClick={() => s.setSettings({ mode: "business" })}>Business · SaaS-sprawl</span>
            </div>
          </div>
          <div className="field"><div className="l">Data retention <small>statements are never stored after a session</small></div><div className="dial">ledger kept {settings.retentionDays} days</div></div>
          <div className="field">
            <div className="l">Export everything</div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="pill" onClick={s.exportNdjson}>NDJSON</span>
              <span className="pill" onClick={s.exportCsv}>CSV</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
