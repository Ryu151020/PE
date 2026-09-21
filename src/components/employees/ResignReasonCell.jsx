import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { RESIGN_REASONS } from "../../lib/constants";
import { inputCls } from "../../lib/styles";

/* Resignation reason cell: choosing "Khác / 其他" switches to a free-text box so the
   custom reason itself is stored and shown, instead of the generic "Khác" label. */
export function ResignReasonCell({ value, onChange }) {
  const predefinedVi = RESIGN_REASONS.map((r) => r.vi);
  const isCustomValue = !!value && !predefinedVi.includes(value);
  const [customMode, setCustomMode] = useState(isCustomValue);
  const showCustom = customMode || isCustomValue;
  if (showCustom) {
    return (
      <div className="flex items-center gap-1">
        <input autoFocus={!isCustomValue} className={`${inputCls} v-input--sm`} placeholder="Nhập lý do... / 请输入原因..." value={isCustomValue ? value : ""} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="shrink-0 text-mute hover:text-brand" title="Chọn từ danh sách có sẵn / 从列表中选择" onClick={() => { setCustomMode(false); onChange(""); }}><ChevronDown size={14} /></button>
      </div>
    );
  }
  return (
    <select className={`${inputCls} v-input--sm`} value={value || ""} onChange={(e) => { if (e.target.value === "Khác") { setCustomMode(true); onChange(""); } else onChange(e.target.value); }}>
      <option value="">— Chọn lý do / 选择原因 —</option>
      {RESIGN_REASONS.map((r) => <option key={r.vi} value={r.vi}>{r.vi} / {r.zh}</option>)}
    </select>
  );
}
