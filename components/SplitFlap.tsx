"use client";
// Split-flap numerals (THW live-data discipline). Mechanical flip on change, not
// a count-up tween. Units ($ / yr ↑) render in brass.
import { useEffect, useRef, useState } from "react";

export default function SplitFlap({
  value, unit, size = 16, className = "",
}: { value: string | number; unit?: string; size?: number; className?: string }) {
  const chars = String(value).split("");
  const units = (unit ?? "").split("");
  const prev = useRef<string[]>(chars);
  const [flip, setFlip] = useState<boolean[]>(() => chars.map(() => false));

  useEffect(() => {
    const now = String(value).split("");
    const changed = now.map((c, i) => c !== prev.current[i]);
    if (changed.some(Boolean)) {
      setFlip(changed);
      const t = setTimeout(() => setFlip(now.map(() => false)), 360);
      prev.current = now;
      return () => clearTimeout(t);
    }
    prev.current = now;
  }, [value]);

  return (
    <span className={`flap ${className}`} style={{ fontSize: size }}>
      {chars.map((c, i) => (
        <b key={`d${i}`} className={flip[i] ? "flip" : undefined}>{c}</b>
      ))}
      {units.map((u, i) => (
        <b key={`u${i}`} className="u">{u}</b>
      ))}
    </span>
  );
}
