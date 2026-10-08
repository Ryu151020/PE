import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getMoldColor } from "../../lib/constants";
import { t } from "../../lib/i18n";

export function SearchableSelect({
  value,
  selectedLabel = "",
  onChange,
  options = [],
  otherOptions = [],
  groupTitle,
  otherGroupTitle,
  placeholder = "",
  searchPlaceholder,
  isMold = false,
  className = "",
  disabled = false,
  cellMode = false,
  preferPlacement = "auto",
}) {
  const { lang = "vi" } = useApp() || {};
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const hasOther = Boolean(otherOptions && otherOptions.length > 0);
  const [showOther, setShowOther] = useState(false);

  const [coords, setCoords] = useState({ isFlipUp: false, top: 0, bottom: 0, left: 0, width: 220 });

  const effectiveSearchPlaceholder =
    searchPlaceholder || (isMold ? t("searchMoldPlaceholder", lang) : t("searchOrderPlaceholder", lang));

  const allOptions = useMemo(
    () => (hasOther ? [...options, ...otherOptions] : options),
    [options, otherOptions, hasOther]
  );

  const selectedOption = useMemo(
    () => allOptions.find((o) => String(o.value) === String(value)),
    [allOptions, value]
  );

  const displayLabel = selectedLabel || (selectedOption ? selectedOption.label : (value ? String(value) : ""));
  const selectedMoldStyle = isMold && displayLabel ? getMoldColor(displayLabel) : null;

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => {
      const labelStr = (o.label || "").toLowerCase();
      const subStr = (o.sub || "").toLowerCase();
      return labelStr.includes(q) || subStr.includes(q);
    });
  }, [options, search]);

  const filteredOtherOptions = useMemo(() => {
    if (!hasOther) return [];
    if (!search.trim()) return otherOptions;
    const q = search.toLowerCase();
    return otherOptions.filter((o) => {
      const labelStr = (o.label || "").toLowerCase();
      const subStr = (o.sub || "").toLowerCase();
      return labelStr.includes(q) || subStr.includes(q);
    });
  }, [hasOther, otherOptions, search]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minW = hasOther ? 300 : 220;
    const dropdownWidth = Math.max(rect.width, minW);
    const dropdownHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp =
      preferPlacement === "bottom"
        ? spaceBelow < 120 && spaceAbove > spaceBelow
        : spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = window.innerWidth - dropdownWidth - 10;
    }
    if (left < 10) left = 10;

    setCoords({
      isFlipUp: flipUp,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left,
      width: dropdownWidth,
    });
  };

  const pointerDownPosRef = useRef(null);

  const handleTriggerMouseDown = (e) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleOpen = (e) => {
    if (disabled) return;
    if (pointerDownPosRef.current && e && e.clientX !== undefined) {
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
      if (dx > 5 || dy > 5) return;
    }
    updatePosition();
    const isCurrentInOther = Boolean(
      hasOther && otherOptions.some((o) => String(o.value) === String(value))
    );
    setShowOther(isCurrentInOther);
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

  return (
    <div className={`relative inline-block w-full text-sm ${className}`}>
      {cellMode ? (
        <div
          ref={triggerRef}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onMouseDown={handleTriggerMouseDown}
          onClick={handleOpen}
          className={`flex w-full min-h-[26px] items-center rounded-xs transition-colors cursor-pointer outline-none focus:outline-none border-0 select-none ${
            isMold ? "justify-center text-center" : "justify-start text-left px-1"
          }`}
          title={isMold ? "Bấm để chọn khuôn" : "Bấm để chọn đơn hàng"}
        >
          {isMold ? (
            selectedMoldStyle ? (
              <span className="group/val inline-flex items-center gap-1">
                <span
                  style={selectedMoldStyle.style}
                  className={`px-2 py-0.5 rounded-xs border text-[13px] font-semibold ${selectedMoldStyle.bg || ""} ${selectedMoldStyle.text || ""} ${selectedMoldStyle.border || ""}`}
                >
                  {displayLabel}
                </span>
                {!disabled && (
                  <span
                    data-no-drag="true"
                    onClick={handleClear}
                    className="opacity-0 group-hover/val:opacity-100 hover:text-bad text-mute transition-opacity p-0.5 cursor-pointer rounded-xs"
                    title="Xóa khuôn"
                  >
                    <X size={12} />
                  </span>
                )}
              </span>
            ) : !disabled ? (
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-xs border border-dashed border-line2 text-mute group-hover:border-brand group-hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity mx-auto">
                <Plus size={13} />
              </span>
            ) : (
              <span className="inline-block min-h-[22px] w-full" />
            )
          ) : (
            displayLabel ? (
              <span className="group/val flex items-center justify-between w-full gap-1">
                <span className="truncate text-[13px] font-bold text-black">
                  {displayLabel}
                </span>
                {!disabled && (
                  <span
                    data-no-drag="true"
                    onClick={handleClear}
                    className="opacity-0 group-hover/val:opacity-100 hover:text-bad text-mute transition-opacity p-0.5 shrink-0 cursor-pointer rounded-xs"
                    title="Xóa đơn hàng"
                  >
                    <X size={12} />
                  </span>
                )}
              </span>
            ) : !disabled ? (
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-xs border border-dashed border-line2 text-mute group-hover:border-brand group-hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={13} />
              </span>
            ) : (
              <span className="inline-block min-h-[22px] w-full" />
            )
          )}
        </div>
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
            {displayLabel || placeholder}
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
              ...(coords.isFlipUp ? { bottom: coords.bottom } : { top: coords.top }),
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
            className="max-h-80 overflow-hidden border border-line bg-white shadow-2xl rounded-md flex flex-col animate-in fade-in zoom-in-95 duration-100 text-sm"
          >
            <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2 bg-canvas shrink-0">
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

            <div className="max-h-72 overflow-y-auto p-1 flex-1">
              <div
                onClick={() => handleSelect(null)}
                className={`cursor-pointer px-2.5 py-1.5 text-xs rounded-xs transition-colors flex items-center justify-between mb-0.5 ${
                  !value ? "bg-canvas text-brand font-medium" : "text-mute hover:text-ink hover:bg-canvas"
                }`}
              >
                <span>— {lang === "zh" ? "留空" : lang === "en" ? "Empty" : "Để trống"} —</span>
                {!value && <Check size={13} className="text-brand shrink-0" />}
              </div>

              {hasOther && (
                <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-mute select-none border-t border-line/40 mt-0.5">
                  <span className="truncate">
                    {groupTitle || (lang === "zh" ? "当前模具订单" : "Đơn theo khuôn máy")}
                  </span>
                  <span className="shrink-0 text-[11px] text-mute font-normal">
                    ({filteredOptions.length})
                  </span>
                </div>
              )}

              {filteredOptions.length === 0 && (
                <div className="px-2.5 py-2 text-xs text-mute italic">
                  {hasOther && !search.trim()
                    ? (lang === "zh" ? "暂无匹配此模具的订单" : "Chưa có đơn hàng nào khớp khuôn này")
                    : (!hasOther || (!search.trim() && !hasOther) ? t("notFound", lang) : "")}
                </div>
              )}

              {filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const moldColor = isMold ? getMoldColor(opt.label) : null;
                return (
                  <div
                    key={opt.value}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs rounded-xs cursor-pointer transition-colors ${
                      opt.disabled
                        ? "cursor-not-allowed opacity-50"
                        : isSelected
                        ? "bg-[#2051A3] text-white font-medium"
                        : "text-ink hover:bg-canvas"
                    }`}
                  >
                    {moldColor ? (
                      <span
                        style={isSelected ? undefined : moldColor.style}
                        className={`text-xs px-2 py-0.5 rounded-xs border font-medium ${
                          isSelected
                            ? "bg-white/20 text-white border-white/40"
                            : `${moldColor.bg || ""} ${moldColor.text || ""} ${moldColor.border || ""}`
                        }`}
                      >
                        {opt.label}
                      </span>
                    ) : (
                      <span className="truncate font-medium">{opt.label}</span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.sub && !isSelected && (
                        <span className="text-[11px] text-mute shrink-0">
                          {opt.sub}
                        </span>
                      )}
                      {isSelected && <Check size={13} className="text-white shrink-0" />}
                    </div>
                  </div>
                );
              })}

              {hasOther && (
                search.trim() ? (
                  filteredOtherOptions.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-line">
                      <div className="flex items-center justify-between px-2.5 pt-1 pb-1 text-[11px] font-medium text-mute select-none">
                        <span className="truncate">
                          {otherGroupTitle || (lang === "zh" ? "其他模具订单" : "Đơn hàng khuôn khác")}
                        </span>
                        <span className="shrink-0 text-[11px] text-mute font-normal">
                          ({filteredOtherOptions.length})
                        </span>
                      </div>
                      {filteredOtherOptions.map((opt) => {
                        const isSelected = String(opt.value) === String(value);
                        return (
                          <div
                            key={opt.value}
                            onClick={() => !opt.disabled && handleSelect(opt.value)}
                            className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs rounded-xs cursor-pointer transition-colors ${
                              opt.disabled
                                ? "cursor-not-allowed opacity-50"
                                : isSelected
                                ? "bg-[#2051A3] text-white font-medium"
                                : "text-ink hover:bg-canvas"
                            }`}
                          >
                            <span className="truncate font-medium">{opt.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {opt.sub && (
                                <span
                                  className={`text-[11px] shrink-0 ${
                                    isSelected ? "text-white/80" : "text-mute"
                                  }`}
                                >
                                  {opt.sub}
                                </span>
                              )}
                              {isSelected && <Check size={13} className="text-white shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="mt-1 pt-1 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setShowOther((prev) => !prev)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-mute hover:text-ink hover:bg-canvas rounded-xs transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-200 ${showOther ? "rotate-180" : ""}`}
                        />
                        <span>
                          {otherGroupTitle || (lang === "zh" ? "其他模具订单" : "Đơn hàng khuôn khác")}
                        </span>
                      </span>
                      <span className="text-[11px] text-mute font-normal">
                        ({otherOptions.length})
                      </span>
                    </button>

                    {showOther && (
                      <div className="pt-0.5 space-y-0.5">
                        {otherOptions.map((opt) => {
                          const isSelected = String(opt.value) === String(value);
                          return (
                            <div
                              key={opt.value}
                              onClick={() => !opt.disabled && handleSelect(opt.value)}
                              className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs rounded-xs cursor-pointer transition-colors ${
                                opt.disabled
                                  ? "cursor-not-allowed opacity-50"
                                  : isSelected
                                  ? "bg-[#2051A3] text-white font-medium"
                                  : "text-ink hover:bg-canvas"
                              }`}
                            >
                              <span className="truncate font-medium">{opt.label}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {opt.sub && (
                                  <span
                                    className={`text-[11px] shrink-0 ${
                                      isSelected ? "text-white/80" : "text-mute"
                                    }`}
                                  >
                                    {opt.sub}
                                  </span>
                                )}
                                {isSelected && <Check size={13} className="text-white shrink-0" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}

              {search.trim() && filteredOptions.length === 0 && filteredOtherOptions.length === 0 && (
                <div className="px-2.5 py-4 text-center text-xs text-mute">
                  {t("notFound", lang)}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
