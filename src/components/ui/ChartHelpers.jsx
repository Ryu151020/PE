import { reasonZh } from "../../lib/constants";

/* Chart helpers — indigo tooltip badge, muted axis labels, dashed grid (Venus §17) */
export const AXIS_TICK = { fontSize: 12, fontWeight: 500, fill: "#A3AED0" };

export function VenusTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload || !payload.length) return null;
  const displayLabel = payload[0]?.payload?.fullLabel || label;
  return (
    <div className="v-tip">
      {displayLabel !== undefined && displayLabel !== null && displayLabel !== "" && <span className="v-tip-label">{displayLabel}</span>}
      {payload.map((p, i) => <span key={i}>{p.name ? `${p.name}: ` : ""}{p.value}{unit}</span>)}
    </div>
  );
}

export function PieTip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (<div className="v-tip"><span className="v-tip-label">{p.reason}{reasonZh(p.reason) ? ` / ${reasonZh(p.reason)}` : ""}</span><span>{p.count} người/人 ({p.percent}%)</span></div>);
}
