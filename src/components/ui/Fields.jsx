import { Search } from "lucide-react";
import { toDisplay } from "../../lib/dates";
import { inputCls } from "../../lib/styles";

/* Date field that always displays dd/mm/yyyy regardless of the browser's own locale
   formatting for native <input type="date">, using the same "invisible full-hit input"
   technique as SquareDatePicker. */
export function DateFieldVN({ value, onChange }) {
  return (
    <span className="relative inline-flex items-center justify-center rad-12 border border-line2 bg-white px-2.5 py-1.5 text-xs font-medium text-ink hover:border-brand" style={{ width: 118 }}>
      <span className="pointer-events-none tabular-nums">{value ? toDisplay(value) : "dd/mm/yyyy"}</span>
      <input type="date" value={value || ""} onChange={(e) => e.target.value && onChange(e.target.value)} className="date-picker-fullhit absolute inset-0 cursor-pointer opacity-0" title="dd/mm/yyyy" />
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder, wide }) {
  return (
    <div className={`relative ${wide ? "w-64" : "w-56"}`}>
      <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
      <input className={`${inputCls} v-input--icon`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
