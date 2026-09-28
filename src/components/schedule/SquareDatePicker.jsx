import { useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { addDaysKey, fromKey, pad2, toDisplay } from "../../lib/dates";
import { t } from "../../lib/i18n";
import { btnIcon } from "../../lib/styles";
import { Bi } from "../ui/Bi";

export function SquareDatePicker({ selectedKey, onSelect }) {
  const { lang = "vi" } = useApp() || {};
  const d = fromKey(selectedKey);
  const inputRef = useRef(null);
  const monthNames = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  return (
    <div className="flex items-center gap-3">
      <button className={btnIcon} onClick={() => onSelect(addDaysKey(selectedKey, -1))} title={t("prevDay", lang)}>
        <ChevronLeft size={20} />
      </button>
      <div className="v-date-tile" style={{ height: 88, width: 88 }}>
        <span className="pointer-events-none" style={{ fontSize: 34, lineHeight: "38px", fontWeight: 700 }}>{pad2(d.getDate())}</span>
        <span className="pointer-events-none mt-1 text-xs font-medium" style={{ opacity: 0.85 }}>Th.{monthNames[d.getMonth()]}/{d.getFullYear()}</span>
        <input
          ref={inputRef}
          type="date"
          value={selectedKey}
          onChange={(e) => e.target.value && onSelect(e.target.value)}
          className="date-picker-fullhit absolute inset-0 cursor-pointer opacity-0"
          title={t("selectDateTitle", lang)}
        />
        <span className="v-date-badge"><Calendar size={13} /></span>
      </div>
      <button className={btnIcon} onClick={() => onSelect(addDaysKey(selectedKey, 1))} title={t("nextDay", lang)}>
        <ChevronRight size={20} />
      </button>
      <div className="ml-1 hidden text-sm lg:block">
        <Bi
          vi={`Đang xem: ${toDisplay(selectedKey)}`}
          zh={`查看日期: ${toDisplay(selectedKey)}`}
          en={`Viewing: ${toDisplay(selectedKey)}`}
          viClass="font-bold text-body"
        />
      </div>
    </div>
  );
}
