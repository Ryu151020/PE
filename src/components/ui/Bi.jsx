/* ============================================================
   BILINGUAL LABEL HELPER
   ============================================================ */
export function Bi({ vi, zh, viClass = "", zhClass = "", center, inline }) {
  if (inline) return <span className={viClass}>{vi}{zh && <span className={`ml-1 text-mute ${zhClass}`}>{zh}</span>}</span>;
  return (
    <span className={`flex flex-col leading-tight ${center ? "items-center text-center" : ""}`}>
      <span className={viClass || "text-sm font-semibold"}>{vi}</span>
      {zh && <span className={zhClass || "text-xs text-mute"}>{zh}</span>}
    </span>
  );
}
