"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import SplitFlap from "./SplitFlap";

export default function Topbar() {
  const path = usePathname();
  const { keptYear, diagnosis, inbox, openConnect } = useStore();
  const landing = path === "/";

  return (
    <div className="topbar">
      <Link className="brandlink" href="/" aria-label="Spout home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mk" src="/art/wordmark-mark.png" alt="Spout" />
      </Link>

      {!landing && (
        <nav className="nav">
          <Link className={path.startsWith("/diagnosis") ? "on" : ""} href="/diagnosis">Diagnosis</Link>
          <Link className={path.startsWith("/ledger") ? "on" : ""} href="/ledger">Ledger</Link>
          <Link className={path.startsWith("/settings") ? "on" : ""} href="/settings">Settings</Link>
        </nav>
      )}

      <div className="spacer" />

      {!landing && (diagnosis || keptYear > 0) && (
        <div className="keptchip" title="Money you've approved to stop paying, per year">
          <span className="lab">KEPT/YR</span>
          <SplitFlap value={`$${keptYear}`} size={16} />
        </div>
      )}

      {inbox.connected ? (
        <span className="connect on" title="Connected inbox — send + read approved threads only">
          <span className="dot" />
          {inbox.email || "connected"}
        </span>
      ) : (
        <button className="connect" onClick={() => openConnect(true)}>
          <span className="dot" />
          {landing ? "Connect inbox — optional" : "Connect inbox"}
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="av" src="/art/otter-avatar.png" alt="the otter, waterworks keeper" />
    </div>
  );
}
