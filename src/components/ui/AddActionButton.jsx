import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, Plus, UserPlus } from "lucide-react";
import { btnPrimary } from "../../lib/styles";

export function AddActionButton({
  labelVi,
  labelZh,
  onManualAdd,
  onExcelAdd,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
          <Plus size={14} /> {labelVi} / {labelZh}
        </button>
        <button
          type="button"
          className={`${btnPrimary} rounded-l-none border-l border-white/30 px-2`}
          onClick={() => setOpen((prev) => !prev)}
          title="Tùy chọn thêm / 添加选项"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] border border-line bg-white shadow-lg rounded-xs py-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas transition-colors"
            onClick={() => {
              setOpen(false);
              onManualAdd();
            }}
          >
            <UserPlus size={14} className="text-[#2051A3]" />
            <span>Nhập tay / 手动输入</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas transition-colors"
            onClick={() => {
              setOpen(false);
              onExcelAdd();
            }}
          >
            <FileSpreadsheet size={14} className="text-[#05CD99]" />
            <span>Tải lên từ Excel / 从Excel导入</span>
          </button>
        </div>
      )}
    </div>
  );
}
