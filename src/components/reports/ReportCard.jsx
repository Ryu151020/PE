import { card } from "../../lib/styles";

export function ReportCard({ title, subtitle, children, index = 0 }) {
  return (
    <div className={`${card} v-rise p-6`} style={{ "--i": index }}>
      <div className="mb-4">
        <div className="text-lg font-bold text-ink">{title}</div>
        {subtitle && <div className="text-sm font-medium text-mute">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

/* bilingual table header cell: vi on top, zh below */
export function Th({ vi, zh, right }) {
  return (
    <th className={`px-2 py-1.5 ${right ? "text-right" : "text-left"}`}>
      <span className={`flex flex-col leading-tight ${right ? "items-end" : ""}`}><span>{vi}</span><span className="text-xs font-medium" style={{ opacity: 0.75 }}>{zh}</span></span>
    </th>
  );
}
