// Shared SVG defs — the hand-print filters (turbulence-displacement wobble),
// registration-slip, brass / water / cream gradients, blueprint hatch + grid.
// Ported verbatim from the step-2 defs.js. Injected once, referenced by id.
export default function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id="hand" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves={2} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3.4} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={0.28} />
        </filter>
        <filter id="hand2" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.024" numOctaves={2} seed={19} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5.6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="slip" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={3} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2.1} />
        </filter>
        <filter id="soft"><feGaussianBlur stdDeviation={0.4} /></filter>
        <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx={0} dy={7} stdDeviation={9} floodColor="#0B1A2A" floodOpacity={0.34} />
        </filter>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={6} result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E7B75C" /><stop offset=".42" stopColor="#C6892B" />
          <stop offset=".78" stopColor="#8A5E1B" /><stop offset="1" stopColor="#5E3F12" />
        </linearGradient>
        <linearGradient id="brassV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8BC63" /><stop offset=".5" stopColor="#C6892B" /><stop offset="1" stopColor="#7A5216" />
        </linearGradient>
        <linearGradient id="brassPipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A5216" /><stop offset=".18" stopColor="#C6892B" />
          <stop offset=".38" stopColor="#F0CB7C" /><stop offset=".5" stopColor="#E7B75C" />
          <stop offset=".66" stopColor="#C6892B" /><stop offset="1" stopColor="#6E4A14" />
        </linearGradient>
        <linearGradient id="brassPipeH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6E4A14" /><stop offset=".18" stopColor="#C6892B" />
          <stop offset=".38" stopColor="#F0CB7C" /><stop offset=".5" stopColor="#E7B75C" />
          <stop offset=".66" stopColor="#C6892B" /><stop offset="1" stopColor="#6E4A14" />
        </linearGradient>
        <radialGradient id="amberGlow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#E7B75C" stopOpacity=".55" /><stop offset=".6" stopColor="#C6892B" stopOpacity=".18" /><stop offset="1" stopColor="#C6892B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tealGlow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#77B8B2" stopOpacity=".5" /><stop offset="1" stopColor="#3E8E8A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="knob" cx=".38" cy=".34" r=".8">
          <stop offset="0" stopColor="#F4D48C" /><stop offset=".5" stopColor="#C6892B" /><stop offset="1" stopColor="#6E4A14" />
        </radialGradient>
        <radialGradient id="shine" cx=".35" cy=".3" r=".7">
          <stop offset="0" stopColor="#FFF6DF" /><stop offset="1" stopColor="#B87C24" />
        </radialGradient>

        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FCAC4" /><stop offset=".45" stopColor="#3E8E8A" /><stop offset="1" stopColor="#2C6E6A" />
        </linearGradient>
        <linearGradient id="waterFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#77B8B2" stopOpacity=".95" /><stop offset="1" stopColor="#2C6E6A" stopOpacity=".95" />
        </linearGradient>

        <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBF9F3" /><stop offset="1" stopColor="#EDE7D9" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".28" /><stop offset=".5" stopColor="#ffffff" stopOpacity=".04" />
          <stop offset="1" stopColor="#10263B" stopOpacity=".10" />
        </linearGradient>
        <linearGradient id="inkPipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#284056" /><stop offset=".5" stopColor="#12293D" /><stop offset="1" stopColor="#0A1826" />
        </linearGradient>

        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#10263B" strokeWidth="1" strokeOpacity=".5" />
        </pattern>
        <pattern id="hatchTeal" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#2C6E6A" strokeWidth="1" strokeOpacity=".55" />
        </pattern>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#10263B" strokeWidth="1" strokeOpacity=".10" />
        </pattern>
      </defs>
    </svg>
  );
}
