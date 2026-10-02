import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Check, Filter, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";

export function SortableTh({
  labelVi,
  labelZh,
  labelEn,
  colKey,
  sortConfig,
  onSort,
  filterValue,
  onFilterChange,
  data = [],
  getDisplayValue,
  className = "",
  style = {},
  center = false,
}) {
  const { lang = "vi" } = useApp() || {};
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const thRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const isSorted = sortConfig && sortConfig.key === colKey;
  const sortDirection = isSorted ? sortConfig.direction : null;
  const isFiltered = Boolean(filterValue && Array.isArray(filterValue));

  const displayLabel =
    lang === "zh"
      ? (labelZh || t(labelVi, "zh") || labelVi)
      : lang === "en"
      ? (labelEn || t(labelVi, "en") || labelVi)
      : labelVi;

  // Extract all distinct values for this column from data
  const allUniqueValues = useMemo(() => {
    const set = new Set();
    let hasBlank = false;
    for (const item of data || []) {
      const raw = getDisplayValue ? getDisplayValue(item) : item[colKey];
      if (raw === undefined || raw === null || String(raw).trim() === "") {
        hasBlank = true;
      } else {
        set.add(String(raw).trim());
      }
    }
    const sorted = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" })
    );
    if (hasBlank) {
      sorted.unshift(t("emptySpot", lang));
    }
    return sorted;
  }, [data, colKey, getDisplayValue, lang]);

  // Draft selected values while popup is open
  const [draftSelected, setDraftSelected] = useState(() => new Set(allUniqueValues));

  // Sync draft when opened or when filterValue changes
  const handleOpen = () => {
    if (thRef.current) {
      const rect = thRef.current.getBoundingClientRect();
      const popoverWidth = 275;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }
      if (left < 12) left = 12;

      setCoords({
        top: rect.bottom + 4,
        left,
      });
    }

    if (isFiltered) {
      setDraftSelected(new Set(filterValue));
    } else {
      setDraftSelected(new Set(allUniqueValues));
    }
    setSearchVal("");
    setIsOpen(true);
  };

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        thRef.current &&
        !thRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filtered values inside search input
  const visibleList = useMemo(() => {
    if (!searchVal.trim()) return allUniqueValues;
    const q = searchVal.toLowerCase().trim();
    return allUniqueValues.filter((v) => v.toLowerCase().includes(q));
  }, [allUniqueValues, searchVal]);

  const handleToggleValue = (val) => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) {
        next.delete(val);
      } else {
        next.add(val);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      visibleList.forEach((v) => next.add(v));
      return next;
    });
  };

  const handleClearAll = () => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      visibleList.forEach((v) => next.delete(v));
      return next;
    });
  };

  const handleApply = () => {
    if (onFilterChange) {
      if (draftSelected.size >= allUniqueValues.length) {
        onFilterChange(colKey, null);
      } else {
        onFilterChange(colKey, Array.from(draftSelected));
      }
    }
    setIsOpen(false);
  };

  const handleSortAsc = () => {
    if (onSort) onSort(colKey, "asc");
  };

  const handleSortDesc = () => {
    if (onSort) onSort(colKey, "desc");
  };

  return (
    <th
      ref={thRef}
      className={`px-3 py-2.5 ${center ? "text-center" : "text-left"} align-middle font-bold text-[#1B2559] text-sm select-none whitespace-nowrap transition-colors bg-canvas border-b border-r border-line ${
        isOpen ? "!bg-[#E8EDFB]" : "hover:bg-[#EAEFFC]"
      } ${className}`}
      style={style}
    >
      <div className={`flex items-center gap-1.5 whitespace-nowrap ${center ? "justify-center" : "justify-between"}`}>
        <div
          className={`flex items-center gap-1 cursor-pointer whitespace-nowrap ${center ? "" : "flex-1"}`}
          onClick={handleOpen}
          title={lang === "zh" ? "点击以筛选或排序此列" : lang === "en" ? "Click to filter or sort" : "Bấm để lọc hoặc sắp xếp cột này"}
        >
          <span
            className={`whitespace-nowrap transition-colors ${
              isSorted
                ? "text-brand font-extrabold"
                : isFiltered
                ? "text-emerald-700 font-extrabold"
                : "text-[#1B2559] font-bold"
            }`}
          >
            {displayLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) setIsOpen(false);
            else handleOpen();
          }}
          className={`flex items-center justify-center w-5 h-5 rounded-full transition-all cursor-pointer ${
            isFiltered
              ? "bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-xs"
              : isSorted
              ? "bg-[#EFEBFF] text-brand border border-brand/30 shadow-xs"
              : "text-[#A3AED0] hover:text-brand hover:bg-[#EFEBFF]/50"
          }`}
          title={lang === "zh" ? "排序和筛选选项" : lang === "en" ? "Sort and filter options" : "Tùy chọn sắp xếp & bộ lọc"}
        >
          {sortDirection === "asc" ? (
            <ArrowUp size={12} strokeWidth={2.5} />
          ) : sortDirection === "desc" ? (
            <ArrowDown size={12} strokeWidth={2.5} />
          ) : isFiltered ? (
            <Filter size={11} strokeWidth={2.5} />
          ) : (
            <span className="text-[9px] leading-none opacity-75">▼</span>
          )}
        </button>
      </div>

      {/* Venus Style Popup Menu */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              zIndex: 99999,
            }}
            className="w-[280px] bg-white rounded-2xl shadow-xl border border-line text-xs font-sans text-main p-2 animate-in fade-in duration-100"
          >
            {/* Sort Options */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleSortAsc}
                className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-[13px] hover:bg-canvas cursor-pointer transition-colors ${
                  sortDirection === "asc" ? "bg-[#EFEBFF] text-brand font-bold" : "text-sub"
                }`}
              >
                <span>{t("sortAsc", lang)}</span>
                {sortDirection === "asc" && <Check size={14} className="text-brand" />}
              </button>

              <button
                type="button"
                onClick={handleSortDesc}
                className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-[13px] hover:bg-canvas cursor-pointer transition-colors ${
                  sortDirection === "desc" ? "bg-[#EFEBFF] text-brand font-bold" : "text-sub"
                }`}
              >
                <span>{t("sortDesc", lang)}</span>
                {sortDirection === "desc" && <Check size={14} className="text-brand" />}
              </button>
            </div>

            <div className="h-[1px] bg-line/60 my-2" />

            {/* Filter by Value Section */}
            <div>
              <div className="px-2 py-1 flex items-center gap-1.5 text-xs font-bold text-main">
                <Filter size={12} className="text-brand" />
                <span>{lang === "zh" ? "按值筛选" : lang === "en" ? "Filter by value" : "Lọc theo giá trị"}</span>
              </div>

              {/* Action Links */}
              <div className="px-2 pt-1 pb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-brand hover:underline cursor-pointer font-bold"
                  >
                    {t("selectAll", lang)} ({allUniqueValues.length})
                  </button>
                  <span className="text-line">•</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-brand hover:underline cursor-pointer font-bold"
                  >
                    {t("clearFilter", lang)}
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="my-1.5 relative px-1">
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder={t("search", lang)}
                  autoFocus
                  className="w-full border border-line rounded-xl py-1.5 pl-3 pr-8 text-xs text-main bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-brand transition-colors h-8"
                />
                <Search size={14} className="absolute right-3.5 top-2.5 text-[#A3AED0] pointer-events-none" />
              </div>

              {/* Checkbox List */}
              <div className="px-1 max-h-40 overflow-y-auto space-y-0.5">
                {visibleList.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-mute">
                    {t("notFound", lang)}
                  </div>
                ) : (
                  visibleList.map((val) => {
                    const checked = draftSelected.has(val);
                    return (
                      <label
                        key={val}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-canvas cursor-pointer text-xs text-main transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleValue(val)}
                          className="w-4 h-4 rounded text-brand accent-[#4318FF] cursor-pointer"
                        />
                        <span className={`truncate ${val === t("emptySpot", lang) ? "italic text-mute" : ""}`}>
                          {val}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-2 pt-2.5 pb-1 border-t border-line/60 mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-line text-sub bg-white hover:bg-canvas cursor-pointer transition-colors"
              >
                {t("cancel", lang)}
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-brand hover:bg-brand-dark text-white cursor-pointer shadow-xs transition-colors"
              >
                Áp dụng / 应用
              </button>
            </div>
          </div>,
          document.body
        )}
    </th>
  );
}
