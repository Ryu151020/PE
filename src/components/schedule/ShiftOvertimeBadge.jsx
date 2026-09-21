import { useState } from "react";
import { OT_OPTIONS } from "../../lib/constants";
import { btnPrimary, inputCls } from "../../lib/styles";

/* Scalar overtime badge for a whole shift-machine group (everyone on that
   machine/shift must share the same OT hours per the workshop's rule) */
export function ShiftOvertimeBadge({ hours, workerCount, editable, onChange }) {
  const [open, setOpen] = useState(false);
  if (workerCount === 0) return <span className="text-xs text-faint">—</span>;
  return (
    <span className="relative inline-block">
      <button
        disabled={!editable}
        onClick={() => { setOpen(true); }}
        className={`rad-8 px-2 py-1 text-xs font-bold ${hours > 0 ? "bg-warn text-ink" : "bg-canvas text-mute"} ${editable ? "hover:bg-warn-deep cursor-pointer" : ""}`}
      >
        {hours}h
      </button>
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rad-14 border border-line bg-white p-4 sh-soft" style={{ width: 230 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-xs text-mute">Tăng ca áp dụng cho cả {workerCount} người trên máy này / 加班时数适用于该机器全部人员</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {OT_OPTIONS.map((opt) => (
                <button key={opt} className={`rad-8 border px-2 py-1 text-xs font-semibold ${Number(hours) === opt ? "border-warn bg-warn-tint text-warn" : "border-line text-body hover:bg-canvas"}`} onClick={() => { onChange(opt); }}>{opt}</button>
              ))}
            </div>
            <input type="number" step="0.5" min="0" className={`${inputCls} mb-2`} value={hours} onChange={(e) => onChange(Number(e.target.value) || 0)} />
            <button className={`${btnPrimary} w-full justify-center`} onClick={() => setOpen(false)}>Xong / 完成</button>
          </div>
        </div>
      )}
    </span>
  );
}
