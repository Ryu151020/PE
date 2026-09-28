import { useApp } from "../../context/AppContext";
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

/* clean single-language table header cell */
export function Th({ vi, zh, en, right }) {
  const { lang = "vi" } = useApp() || {};
  const label = lang === "zh" ? (zh || vi) : lang === "en" ? (en || vi) : vi;
  return (
    <th className={`px-2 py-2 font-bold text-black ${right ? "text-right" : "text-left"}`}>
      <span>{label}</span>
    </th>
  );
}
