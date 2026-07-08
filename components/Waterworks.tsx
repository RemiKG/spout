"use client";
// The Impossible Waterworks — LIVE. Ported from the step-2 art SVG and driven by
// the real leak-map: income pours in at the top, silent charges siphon it into
// subscription jars, and at your nod the otter shuts the valves while the Kept
// gauge climbs. This canvas IS the architecture diagram and the demo.
import { useStore } from "@/lib/store";
import type { Charge } from "@/lib/types";

type Kind = "keep" | "leak" | "creep";

function Row({ pipeY, charge, kind, shut }: { pipeY: number; charge: Charge; kind: Kind; shut: boolean }) {
  const jarY = pipeY + 65;
  const plateY = pipeY + 229;
  const valveCY = pipeY + 13;
  const glow = kind === "leak" ? "url(#tealGlow)" : "url(#amberGlow)";
  const wide = kind === "creep";
  const fillH = kind === "keep" ? 80 : kind === "leak" ? 102 : 128;
  const fillY = jarY + 150 - fillH - 4;
  const tag =
    kind === "keep" ? "KEEP" : (charge.reasons[0]?.label || `$${charge.amountMonthly}/mo`);
  const tagW = Math.max(84, tag.length * 8.4 + 26);
  const tagColor = kind === "leak" ? "#2C6E6A" : "#8A5E1B";
  const tagFill = kind === "leak" ? "rgba(62,142,138,.14)" : "var(--brass-glow)";
  const tagStroke = kind === "leak" ? "#3E8E8A" : "#C6892B";
  const code = (charge.descriptors && charge.descriptors[0]) || charge.descriptor;
  const name = charge.merchant || charge.descriptor;

  return (
    <g>
      <g filter="url(#hand)">
        <ellipse cx={620} cy={pipeY + 143} rx={150} ry={150} fill={glow} opacity={shut ? 0.25 : 1} />
        <rect x={244} y={pipeY} width={wide ? 230 : 230} height={26} rx={10} fill="url(#brassPipe)" stroke="#5E3F12" strokeWidth={3} />
        {/* valve — turns shut on cut */}
        <g className="ww-valve" style={{ transform: shut ? "rotate(34deg)" : "rotate(0deg)", transformOrigin: `${352}px ${valveCY}px` }}>
          <g transform={`translate(${352},${valveCY})`}>
            <circle r={26} fill="none" stroke="url(#brass)" strokeWidth={11} />
            <g stroke="url(#brassV)" strokeWidth={7} strokeLinecap="round">
              <path d="M0,0V-24" /><path d="M0,0 21,12" /><path d="M0,0 -21,12" />
            </g>
            <circle r={8} fill="url(#knob)" stroke="#5E3F12" strokeWidth={2} />
          </g>
        </g>
        {/* spigot + flow (dry when shut) */}
        <path d={`M${wide ? 456 : 462},${pipeY} h${wide ? 36 : 24} v${wide ? 46 : 40} h-${wide ? 36 : 24} z`} fill="url(#brassV)" stroke="#5E3F12" strokeWidth={3} />
        {!shut && (
          <path d={`M${wide ? 474 : 470},${pipeY + (wide ? 46 : 40)} l0,${wide ? 22 : 18}`} stroke="url(#water)" strokeWidth={wide ? 22 : 10} strokeLinecap="round" className="ww-drip" />
        )}
        {/* jar */}
        <g className="ww-jar" style={{ opacity: shut ? 0.42 : 1 }}>
          <rect x={548} y={jarY} width={150} height={150} rx={16} fill="url(#glass)" stroke="#10263B" strokeWidth={4} />
          <rect x={573} y={fillY} width={100} height={fillH} rx={8} fill="url(#water)" opacity={0.92} />
          <ellipse cx={623} cy={fillY} rx={50} ry={8} fill="#BFEAE6" opacity={0.7} />
          <rect x={544} y={jarY - 8} width={158} height={18} rx={5} fill="url(#brassPipeH)" stroke="#5E3F12" strokeWidth={3} />
          <rect x={560} y={jarY + 4} width={10} height={140} rx={5} fill="#fff" opacity={0.22} />
        </g>
      </g>
      {/* brass nameplate */}
      <g filter="url(#hand)">
        <rect x={548} y={plateY} width={230} height={52} rx={7} fill="url(#brass)" stroke="#5E3F12" strokeWidth={2.5} />
        <circle cx={560} cy={plateY + 12} r={3.5} fill="#F6E3B4" /><circle cx={766} cy={plateY + 12} r={3.5} fill="#F6E3B4" />
      </g>
      <text x={566} y={plateY + 20} className="ww-code">{code}</text>
      <text x={566} y={plateY + 42} className="ww-real">{name}</text>
      {/* reason tag */}
      {!shut && (
        <g transform={`translate(${724 - (tagW - 84) / 2},${valveCY})`}>
          <rect x={-tagW / 2} y={-16} width={tagW} height={32} rx={16} fill={tagFill} stroke={tagStroke} strokeWidth={2} />
          <text x={0} y={6} textAnchor="middle" style={{ fontWeight: 700, fontSize: 15, fill: tagColor, fontFamily: "var(--mono)" }}>{tag}</text>
        </g>
      )}
    </g>
  );
}

export default function Waterworks({ caption }: { caption?: React.ReactNode }) {
  const { diagnosis, cancellations, verdicts, keptYear, reclaimed } = useStore();
  const charges = diagnosis?.charges ?? [];
  const kept = diagnosis?.kept ?? [];

  const isShut = (c?: Charge) => {
    if (!c) return false;
    const st = cancellations[c.id]?.state;
    return st === "sent" || st === "confirmed" || st === "pack_ready";
  };

  // pick 3 rows: sacred keep, then top two cut leaks (matches the art density)
  const keepRow = kept[0];
  const cuts = charges.filter((c) => (verdicts[c.id] ?? c.verdict) === "cut");
  const leak = cuts[0];
  const creep = cuts.find((c) => c.reasons.some((r) => r.kind === "price_creep")) || cuts[1];

  const gaugeStr = `$${keptYear}`.split("");

  return (
    <div style={{ position: "relative" }}>
      {caption}
      <svg className="ww-live" viewBox="0 0 1000 1400" role="img" aria-label="the waterworks — your money, top to bottom">
        <style>{`.ww-code{font-size:15px;fill:#3A2A0E;opacity:.8;letter-spacing:.02em;font-family:var(--mono)}
          .ww-real{font-size:18px;font-weight:700;fill:#241706;font-family:var(--mono)}`}</style>
        <rect x={0} y={0} width={1000} height={1400} fill="url(#grid)" />

        {/* income inlet + funnel */}
        <path d="M186,-12 C182,30 198,44 200,64 C201,74 224,74 226,64 C230,42 246,26 244,-12 Z" fill="url(#water)" opacity={0.92} filter="url(#hand2)" />
        <path d="M120,60 L300,60 L232,150 L188,150 Z" fill="url(#brass)" stroke="#5E3F12" strokeWidth={4} filter="url(#hand)" />
        <ellipse cx={210} cy={60} rx={90} ry={16} fill="url(#brassV)" stroke="#5E3F12" strokeWidth={4} />
        <text x={330} y={60} style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: ".24em", fill: "#8A5E1B" }}>INCOME</text>
        <text x={330} y={84} style={{ fontFamily: "var(--mono)", fontSize: 13, fill: "#5E7183" }}>a single stream, in at the top</text>

        {/* glass standpipe + flowing water */}
        <g filter="url(#hand)">
          <rect x={176} y={150} width={68} height={1010} rx={14} fill="url(#glass)" stroke="#10263B" strokeWidth={4} />
          <rect x={192} y={150} width={36} height={1010} fill="url(#water)" opacity={0.85} />
        </g>
        <line x1={210} y1={160} x2={210} y2={1150} stroke="#BFEAE6" strokeWidth={6} opacity={0.75} className="ww-flow" />
        <g filter="url(#hand)">
          <rect x={166} y={168} width={88} height={20} rx={5} fill="url(#brassPipeH)" stroke="#5E3F12" strokeWidth={3} />
          <rect x={166} y={1140} width={88} height={20} rx={5} fill="url(#brassPipeH)" stroke="#5E3F12" strokeWidth={3} />
        </g>

        {/* three rows */}
        {keepRow && <Row pipeY={287} charge={keepRow} kind="keep" shut={false} />}
        {leak && <Row pipeY={617} charge={leak} kind="leak" shut={isShut(leak)} />}
        {creep && creep !== leak && <Row pipeY={947} charge={creep} kind="creep" shut={isShut(creep)} />}

        {/* reclaimed rivulet loops back once anything is reclaimed */}
        {reclaimed > 0 && (
          <g filter="url(#hand2)">
            <path className="reclaim-path" d="M414,1176 C470,1230 300,1250 260,1180 C236,1140 244,1090 244,1040" fill="none" stroke="url(#water)" strokeWidth={12} strokeLinecap="round" opacity={0.92} />
            <path d="M244,1044 l-10,16 M244,1044 l10,16" stroke="url(#water)" strokeWidth={8} strokeLinecap="round" />
            <text x={300} y={1250} style={{ fontFamily: "var(--mono)", fontSize: 15, fill: "#2C6E6A", fontWeight: 700 }}>shut → reclaimed</text>
          </g>
        )}

        {/* the keeper */}
        <path d="M244,905 C300,905 366,913 366,935 L366,951 C300,945 260,945 244,945 Z" fill="url(#brassPipeH)" stroke="#5E3F12" strokeWidth={3} filter="url(#hand)" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <image href="/art/otter-gate.png" x={104} y={548} width={372} height={386} />

        {/* Kept gauge (split-flap, SVG) */}
        <g filter="url(#hand)" transform="translate(150,1288)">
          <rect x={0} y={0} width={440} height={96} rx={14} fill="#0E2233" stroke="#5E3F12" strokeWidth={3} />
          <rect x={6} y={6} width={428} height={84} rx={10} fill="none" stroke="#26425A" strokeWidth={1.5} />
          <text x={22} y={40} style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: ".24em", fill: "#C6892B" }}>KEPT / YEAR</text>
          <g fontFamily="var(--mono)" fontWeight={700} fontSize={44} fill="#FBF9F3" textAnchor="middle">
            {gaugeStr.slice(0, 5).map((ch, i) => (
              <g key={i}>
                <rect x={20 + i * 46} y={44} width={40} height={44} rx={6} fill="#173047" />
                <text x={40 + i * 46} y={78}>{ch}</text>
              </g>
            ))}
          </g>
          <text x={20 + Math.min(gaugeStr.length, 5) * 46 + 14} y={78} fontFamily="var(--mono)" fontSize={26} fill="#C6892B">/yr reclaimed</text>
        </g>
      </svg>
    </div>
  );
}
