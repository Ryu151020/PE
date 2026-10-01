import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext";
import { OT_OPTIONS } from "../../lib/constants";
import { t } from "../../lib/i18n";
import { btnPrimary, inputCls } from "../../lib/styles";

/* Scalar overtime badge for a whole shift-machine group */
export function ShiftOvertimeBadge({ hours, workerCount, editable, onChange }) {
  const { lang = "vi" } = useApp() || {};
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ isFlipUp: false, top: 0, bottom: 0, left: 0, width: 230 });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 230;
    const popoverHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < popoverHeight && spaceAbove > dropdownHeight(popoverHeight);

    function dropdownHeight(h) { return h; }

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - 10) left = window.innerWidth - popoverWidth - 10;
    if (left < 10) left = 10;

    setCoords({
      isFlipUp: flipUp,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left,
      width: popoverWidth,
    });
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (!editable) return;
    updatePosition();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleScroll = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      updatePosition();
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!editable && (!hours || hours === 0)) return null;

  return (
    <div className="relative inline-flex items-center justify-center">
      {hours > 0 ? (
        <span className="group/ot inline-flex items-center gap-1">
          <button
            ref={triggerRef}
            type="button"
            disabled={!editable}
            onClick={handleOpen}
            className={`rad-8 px-2 py-0.5 text-xs font-bold bg-warn text-ink ${
              editable ? "cursor-pointer hover:brightness-95" : ""
            }`}
            title={editable ? "Bấm để đổi giờ tăng ca" : ""}
          >
            {hours}h
          </button>
          {editable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(0);
              }}
              className="opacity-0 group-hover/ot:opacity-100 hover:text-bad text-mute transition-opacity p-0.5 cursor-pointer rounded-xs"
              title="Xóa tăng ca"
            >
              <X size={12} />
            </button>
          )}
        </span>
      ) : editable ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-xs border border-dashed border-line2 text-mute hover:border-brand hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer mx-auto"
          title="Thêm tăng ca"
        >
          <Plus size={13} />
        </button>
      ) : null}

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              ...(coords.isFlipUp ? { bottom: coords.bottom } : { top: coords.top }),
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
            className="rad-14 border border-line bg-white p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-line/60">
              <span className="font-bold text-ink text-[13px]">
                {lang === "zh" ? "设置加班时数" : lang === "en" ? "Set Overtime" : "Cài đặt tăng ca"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-mute hover:text-ink cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mb-2 text-xs text-mute leading-relaxed">
              {lang === "zh"
                ? `加班时数适用于该机器全部 ${workerCount} 名工人`
                : lang === "en"
                ? `Overtime applies to all ${workerCount} workers on this machine`
                : `Tăng ca áp dụng cho cả ${workerCount} người trên máy này`}
            </div>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {OT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`rad-8 border px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                    Number(hours) === opt
                      ? "border-warn bg-warn-tint text-warn font-bold"
                      : "border-line text-body hover:bg-canvas"
                  }`}
                  onClick={() => {
                    onChange(opt);
                  }}
                >
                  {opt}h
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <input
                type="number"
                step="0.5"
                min="0"
                className={`${inputCls} text-xs py-1.5`}
                value={hours}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
              />
              <span className="text-xs font-bold text-mute">giờ</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="flex-1 py-1.5 text-xs text-mute hover:text-bad border border-line rounded-lg hover:bg-canvas transition-colors font-medium cursor-pointer"
                onClick={() => {
                  onChange(0);
                  setOpen(false);
                }}
              >
                {lang === "zh" ? "清空" : lang === "en" ? "Clear" : "Bỏ tăng ca"}
              </button>
              <button
                type="button"
                className={`${btnPrimary} flex-1 py-1.5 text-xs justify-center cursor-pointer`}
                onClick={() => setOpen(false)}
              >
                {t("done", lang)}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
