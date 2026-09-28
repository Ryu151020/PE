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
      <div className="flex items-center">
        <button
          type="button"
          className={`${btnPrimary} rounded-r-none pr-2`}
          onClick={onManualAdd}
        >
          <Plus size={14} /> {displayLabel}
        </button>
        <button
          type="button"
          className={`${btnPrimary} rounded-l-none border-l border-white/30 px-2`}
          onClick={() => setOpen((prev) => !prev)}
          title={lang === "zh" ? "添加选项" : lang === "en" ? "Add options" : "Tùy chọn thêm"}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[190px] border border-line bg-white shadow-lg rounded-xs py-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas transition-colors cursor-pointer"
            onClick={() => {
              setOpen(false);
              onExcelAdd();
            }}
          >
            <FileSpreadsheet size={15} className="text-[#05CD99]" />
            <span>{t("excelUpload", lang)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
