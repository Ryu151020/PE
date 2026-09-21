import { badgeCls } from "../../lib/styles";

export function StatusBadge({ vi, zh, className }) { return <span className={`${badgeCls} ${className}`}>{vi}{zh && <span className="opacity-70 font-medium">/{zh}</span>}</span>; }

/* Stacked bilingual badge (vi on top, zh smaller below) — avoids the
   cramped/overlapping look of "vi / zh" inline in narrow columns. */
export function StackedStatusBadge({ vi, zh, className }) {
  return (
    <span className={`inline-flex flex-col items-start gap-0 rad-12 px-1.5 py-1 leading-none ${className}`}>
      <span className="text-xs font-bold">{vi}</span>
      {zh && <span className="mt-0.5 text-xs font-semibold opacity-75">{zh}</span>}
    </span>
  );
}
