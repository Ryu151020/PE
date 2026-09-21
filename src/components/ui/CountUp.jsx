import { useEffect, useRef, useState } from "react";

/* ============================================================
   VENUS MOTION & UI PRIMITIVES
   ============================================================ */
export const reduceMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Counts up from the previous value (or 0 on first paint). Interruptible, honours reduced motion. */
export function useCountUp(target, duration = 500) {
  const [val, setVal] = useState(reduceMotion() ? target : 0);
  const fromRef = useRef(reduceMotion() ? target : 0);
  useEffect(() => {
    if (reduceMotion()) { fromRef.current = target; setVal(target); return undefined; }
    const from = fromRef.current, start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      fromRef.current = v; setVal(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return Math.round(val);
}

export function CountUp({ value, className = "" }) {
  const v = useCountUp(Number(value) || 0);
  return <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>;
}
