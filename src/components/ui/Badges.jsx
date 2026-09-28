import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";
import { badgeCls } from "../../lib/styles";

export function StatusBadge({ vi, zh, en, className }) {
  const app = useApp();
  const lang = app?.lang || "vi";
  const text = lang === "zh" ? (zh || t(vi, "zh") || vi) : lang === "en" ? (en || t(vi, "en") || vi) : vi;
  return <span className={`${badgeCls} ${className}`}>{text}</span>;
}

/* Status badge adapted to active language (neat single-line chip) */
export function StackedStatusBadge({ vi, zh, en, className }) {
  const app = useApp();
  const lang = app?.lang || "vi";
  const text = lang === "zh" ? (zh || t(vi, "zh") || vi) : lang === "en" ? (en || t(vi, "en") || vi) : vi;
  return (
    <span className={`inline-flex items-center justify-center rad-12 px-2 py-1 leading-none font-bold text-xs ${className}`}>
      {text}
    </span>
  );
}
