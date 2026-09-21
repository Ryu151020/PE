import { useLayoutEffect, useRef, useState } from "react";

/* Pill tabs whose active indicator glides between items (handles wrapping too). */
export function Segmented({ items, value, onChange, small }) {
  const btnRefs = useRef({});
  const [pos, setPos] = useState(null);
  const sig = items.map((i) => i.label).join("|");
  useLayoutEffect(() => {
    const el = btnRefs.current[value];
    if (el) setPos({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
  }, [value, sig]);
  return (
    <div className={`v-seg ${small ? "v-seg--sm" : ""}`} role="tablist">
      {pos && <span className="v-seg-ind" style={{ transform: `translate(${pos.left}px, ${pos.top}px)`, width: pos.width, height: pos.height }} />}
      {items.map((t) => (
        <button key={t.key} ref={(el) => { btnRefs.current[t.key] = el; }} role="tab" aria-selected={value === t.key} className={`v-seg-btn ${value === t.key ? "is-on" : ""}`} onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}
