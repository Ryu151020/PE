import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";

/* ============================================================
   LANGUAGE-AWARE LABEL HELPER (VI / ZH / EN)
   Shows clean, single-language text according to current lang
   ============================================================ */
export function Bi({ vi, zh, en, viClass = "", zhClass = "", enClass = "", center, inline, className = "" }) {
  const app = useApp();
  const lang = app?.lang || "vi";

  let text = vi;
  let cls = viClass;

  if (lang === "zh") {
    text = zh || t(vi, "zh") || vi;
    cls = zhClass || viClass;
  } else if (lang === "en") {
    text = en || t(vi, "en") || vi;
    cls = enClass || viClass;
  }

  if (inline) {
    return <span className={`${cls || ""} ${className}`}>{text}</span>;
  }

  return (
    <span className={`inline-flex flex-col leading-tight ${center ? "items-center text-center" : ""} ${className}`}>
      <span className={cls || "text-sm font-semibold"}>{text}</span>
    </span>
  );
}
