import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getMoldColor } from "../../lib/constants";
import { t } from "../../lib/i18n";

export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "",
  searchPlaceholder,
  isMold = false,
  className = "",
  disabled = false,
  cellMode = false,
}) {
  const { lang = "vi" } = useApp() || {};
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220 });

  const effectiveSearchPlaceholder =
    searchPlaceholder || (isMold ? t("searchMoldPlaceholder", lang) : t("searchOrderPlaceholder", lang));

  const selectedOption = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => {
      const labelStr = (o.label || "").toLowerCase();
      const subStr = (o.sub || "").toLowerCase();
      return labelStr.includes(q) || subStr.includes(q);
    });
  }, [options, search]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 220);
    const dropdownHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = window.innerWidth - dropdownWidth - 10;
    }
    if (left < 10) left = 10;

    setCoords({
      top: flipUp ? Math.max(10, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left,
      width: dropdownWidth,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setOpen((prev) => !prev);
    setSearch("");
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handlePointerDown = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleScroll = (e) => {
      // If user scrolls within the dropdown itself, don't close or reposition
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      updatePosition();
    };

    const handleResize = () => updatePosition();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("keydown", handleKeyDown);

    const timer = setTimeout(() => searchInputRef.current?.focus(), 50);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
    setSearch("");
  };

  const selectedMoldStyle = isMold && selectedOption ? getMoldColor(selectedOption.label) : null;

  return (
    <div className={`relative inline-block w-full text-sm ${className}`}>
      {cellMode ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={`flex w-full min-h-[26px] items-center rounded-xs transition-colors cursor-pointer ${
            isMold ? "justify-center text-center" : "justify-start text-left px-1"
          } ${
            open
              ? "border border-[#4318FF] ring-2 ring-[#4318FF]/20 bg-[#F4F7FE]"
              : "border border-transparent hover:border-line hover:bg-canvas/50"
          }`}
          title={isMold ? "Bấm để chọn khuôn" : "Bấm để chọn đơn hàng"}
        >
          {isMold ? (
            selectedMoldStyle ? (
              <span
                className={`px-2 py-0.5 rounded-xs border text-[13px] font-semibold ${selectedMoldStyle.bg} ${selectedMoldStyle.text} ${selectedMoldStyle.border}`}
              >
                {selectedOption.label}
              </span>
            ) : !disabled ? (
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-xs border border-dashed border-line2 text-mute group-hover:border-brand group-hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity mx-auto">
                <Plus size={13} />
              </span>
            ) : (
              <span className="inline-block min-h-[22px] w-full" />
            )
          ) : (
            selectedOption ? (
              <span className="truncate text-[13px] font-bold text-black">
                {selectedOption.label}
              </span>
            ) : !disabled ? (
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-xs border border-dashed border-line2 text-mute group-hover:border-brand group-hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={13} />
              </span>
            ) : (
              <span className="inline-block min-h-[22px] w-full" />
            )
          )}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={`flex w-full items-center justify-between gap-1 border border-line bg-white px-2 py-1 text-left text-sm rounded-xs transition-colors hover:border-[#2051A3] focus:border-[#2051A3] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 ${
            selectedMoldStyle ? `${selectedMoldStyle.bg} ${selectedMoldStyle.text} font-medium` : "text-ink"
          }`}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {value && !disabled && (
              <span
                onClick={handleClear}
                className="text-mute hover:text-bad p-0.5 rounded-xs"
              >
                <X size={12} />
              </span>
            )}
            <ChevronDown size={14} className="text-mute" />
          </div>
        </button>
      )}

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
            className="max-h-64 overflow-hidden border border-line bg-white shadow-2xl rounded-md flex flex-col animate-in fade-in zoom-in-95 duration-100 text-sm"
          >
            <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2 bg-canvas">
              <Search size={14} className="text-mute shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={effectiveSearchPlaceholder}
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-mute hover:text-ink cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto p-1">
              <div
                onClick={() => handleSelect(null)}
                className="cursor-pointer px-2.5 py-1.5 text-sm text-mute hover:bg-canvas rounded-xs"
              >
                — {t("clearSelection", lang)} —
              </div>
              {filteredOptions.length === 0 ? (
                <div className="px-2.5 py-3 text-center text-sm text-mute">
                  {t("notFound", lang)}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  const moldColor = isMold ? getMoldColor(opt.label) : null;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-sm rounded-xs cursor-pointer ${
                        opt.disabled
                          ? "cursor-not-allowed opacity-50 bg-gray-50"
                          : isSelected
                          ? "bg-[#2051A3] text-white"
                          : "text-ink hover:bg-canvas"
                      }`}
                    >
                      {moldColor ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-xs border font-medium ${
                            isSelected
                              ? "bg-white/20 text-white border-white/40"
                              : `${moldColor.bg} ${moldColor.text} ${moldColor.border}`
                          }`}
                        >
                          {opt.label}
                        </span>
                      ) : (
                        <span className="truncate">{opt.label}</span>
                      )}
                      {opt.sub && (
                        <span className={`text-xs ${isSelected ? "text-white/80" : "text-mute"}`}>
                          {opt.sub}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
