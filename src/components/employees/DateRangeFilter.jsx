import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { RANGE_PRESET_BUTTONS } from "../../lib/constants";
import { computePreset, toDisplay } from "../../lib/dates";
import { btnSecondary, inputCls } from "../../lib/styles";

export function DateRangeFilter({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const displayLabel = value ? `${label}: ${toDisplay(value.from)} — ${toDisplay(value.to)}` : label;
  return (
    <span className="relative">
      <button className={btnSecondary} onClick={() => setOpen((v) => !v)}>
        <Calendar size={13} /> {displayLabel} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 rad-14 border border-line bg-white p-3 sh-soft" style={{ width: 344 }}>
          <div className="mb-2 flex flex-wrap gap-1">
            {RANGE_PRESET_BUTTONS.map(([k, lbl]) => (
              <button key={k} className="rad-8 border border-line px-2 py-1 text-xs hover:bg-canvas" onClick={() => { const c = computePreset(k); if (c) { onChange(c); setOpen(false); } }}>{lbl}</button>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs">
            <input type="date" className={`${inputCls} v-input--sm min-w-0 flex-1`} value={value?.from || ""} onChange={(e) => onChange({ from: e.target.value, to: value?.to || e.target.value })} />
            <span className="text-mute">—</span>
            <input type="date" className={`${inputCls} v-input--sm min-w-0 flex-1`} value={value?.to || ""} onChange={(e) => onChange({ from: value?.from || e.target.value, to: e.target.value })} />
          </div>
          <button className="text-xs text-mute underline hover:text-ink" onClick={() => { onChange(null); setOpen(false); }}>Bỏ lọc / 清除筛选</button>
        </div>
      )}
    </span>
  );
}
