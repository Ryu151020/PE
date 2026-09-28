import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, Plus, UserPlus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";
import { btnPrimary } from "../../lib/styles";

export function AddActionButton({
  labelVi,
  labelZh,
  labelEn,
  onManualAdd,
  onExcelAdd,
}) {
  const { lang = "vi" } = useApp() || {};
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const displayLabel =
    lang === "zh"
      ? (labelZh || labelVi)
      : lang === "en"
      ? (labelEn || labelVi)
      : labelVi;

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-sm">
      <div className="inline-flex h-10 items-center rounded-full bg-[#4318FF] hover:bg-[#3311CC] shadow-soft text-white transition-all overflow-hidden font-bold">
        <button
          type="button"
          className="flex items-center gap-1.5 h-full pl-4 pr-2.5 text-white text-sm font-bold hover:bg-black/10 transition-colors cursor-pointer"
          onClick={onManualAdd}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>{displayLabel}</span>
        </button>
        <div className="w-[1px] h-4 bg-white/25 shrink-0" />
        <button
          type="button"
          className="flex items-center justify-center h-full px-2.5 text-white hover:bg-black/10 transition-colors cursor-pointer"
          onClick={() => setOpen((prev) => !prev)}
          title={lang === "zh" ? "添加选项" : lang === "en" ? "Add options" : "Tùy chọn thêm"}
        >
          <ChevronDown size={15} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] border border-line/80 bg-white shadow-soft rounded-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold rounded-xl text-ink hover:bg-[#F4F7FE] hover:text-[#4318FF] transition-all cursor-pointer"
            onClick={() => {
              setOpen(false);
              onExcelAdd();
            }}
          >
            <div className="w-7 h-7 rounded-full bg-[#E6FAF5] flex items-center justify-center shrink-0">
              <FileSpreadsheet size={15} className="text-[#05CD99]" />
            </div>
            <span>{t("excelUpload", lang)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
