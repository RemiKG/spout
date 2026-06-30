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
