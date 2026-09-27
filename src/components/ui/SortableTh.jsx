import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Check, Filter, Search } from "lucide-react";

export function SortableTh({
  labelVi,
  labelZh,
  colKey,
  sortConfig,
  onSort,
  filterValue,
  onFilterChange,
  data = [],
  getDisplayValue,
  className = "",
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const thRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const isSorted = sortConfig && sortConfig.key === colKey;
  const sortDirection = isSorted ? sortConfig.direction : null;
  const isFiltered = Boolean(filterValue && Array.isArray(filterValue));

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
      sorted.unshift("(Chỗ trống)");
    }
    return sorted;
  }, [data, colKey, getDisplayValue]);

  // Draft selected values while popup is open
  const [draftSelected, setDraftSelected] = useState(() => new Set(allUniqueValues));

  // Sync draft when opened or when filterValue changes
  const handleOpen = () => {
    if (thRef.current) {
      const rect = thRef.current.getBoundingClientRect();
      const popoverWidth = 270;
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
      // If all unique values are selected, clear filter (no restriction)
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
      className={`px-3 py-2 text-left align-middle font-semibold text-ink text-sm select-none whitespace-nowrap transition-colors ${
        isOpen ? "bg-[#e8f0fe]" : "hover:bg-[#f1f3f4]"
      } ${className}`}
      style={style}
    >
      <div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
        <div
          className="flex items-center gap-1 cursor-pointer flex-1 whitespace-nowrap"
          onClick={handleOpen}
          title="Bấm để lọc hoặc sắp xếp cột này"
        >
          <span className="whitespace-nowrap">{labelVi}</span>
          {labelZh && <span className="text-xs text-mute font-normal whitespace-nowrap">/ {labelZh}</span>}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) setIsOpen(false);
            else handleOpen();
          }}
          className={`flex items-center justify-center w-6 h-6 rounded hover:bg-black/5 transition-all cursor-pointer ${
            isFiltered
              ? "bg-[#137333] text-white hover:bg-[#0f5b28]"
              : isSorted
              ? "bg-[#1a73e8] text-white hover:bg-[#1557b0]"
              : "text-[#5f6368] hover:text-[#202124]"
          }`}
          title="Tùy chọn sắp xếp & bộ lọc"
        >
          {sortDirection === "asc" ? (
            <ArrowUp size={13} strokeWidth={2.5} />
          ) : sortDirection === "desc" ? (
            <ArrowDown size={13} strokeWidth={2.5} />
          ) : isFiltered ? (
            <Filter size={12} strokeWidth={2.5} />
          ) : (
            <span className="text-[10px] leading-none opacity-70">▼</span>
          )}
        </button>
      </div>

      {/* Excel / Google Sheets Popup Menu */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              zIndex: 9999,
            }}
            className="w-[275px] bg-white rounded-md shadow-2xl border border-[#dadce0] text-xs font-sans text-[#202124] animate-in fade-in duration-100"
          >
            {/* Sort Options */}
            <div className="py-1">
              <button
                type="button"
                onClick={handleSortAsc}
                className={`w-full px-4 py-2 text-left flex items-center justify-between text-[13px] hover:bg-[#f1f3f4] cursor-pointer transition-colors ${
                  sortDirection === "asc" ? "bg-[#e8f0fe] text-[#1a73e8] font-bold" : "text-[#3c4043]"
                }`}
              >
                <span>Sắp xếp A đến Z</span>
                {sortDirection === "asc" && <Check size={14} className="text-[#1a73e8]" />}
              </button>

              <button
                type="button"
                onClick={handleSortDesc}
                className={`w-full px-4 py-2 text-left flex items-center justify-between text-[13px] hover:bg-[#f1f3f4] cursor-pointer transition-colors ${
                  sortDirection === "desc" ? "bg-[#e8f0fe] text-[#1a73e8] font-bold" : "text-[#3c4043]"
                }`}
              >
                <span>Sắp xếp Z đến A</span>
                {sortDirection === "desc" && <Check size={14} className="text-[#1a73e8]" />}
              </button>
            </div>

            <div className="h-[1px] bg-[#dadce0] my-1" />

            {/* Filter by Value Section */}
            <div className="pt-1">
              <div className="px-4 py-1 flex items-center gap-1 text-[13px] font-medium text-[#202124]">
                <span className="text-[10px] text-[#5f6368]">▼</span>
                <span>Lọc theo giá trị</span>
              </div>

              {/* Action Links */}
              <div className="px-4 pt-1.5 pb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-[#1a73e8] hover:underline cursor-pointer font-medium"
                  >
                    Chọn tất cả {allUniqueValues.length}
                  </button>
                  <span className="text-[#dadce0]">-</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[#1a73e8] hover:underline cursor-pointer font-medium"
                  >
                    Xóa
                  </button>
                </div>
                <span className="text-[#70757a] text-[11px]">
                  Đang hiển thị {visibleList.length}
                </span>
              </div>

              {/* Search Box */}
              <div className="mx-3 my-1.5 relative">
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder=""
                  autoFocus
                  className="w-full border border-[#dadce0] rounded py-1 pl-2.5 pr-7 text-xs text-[#202124] focus:outline-none focus:border-[#137333] h-7"
                />
                <Search size={14} className="absolute right-2 top-1.5 text-[#5f6368] pointer-events-none" />
              </div>

              {/* Checkbox List */}
              <div className="mx-2 max-h-40 overflow-y-auto pr-1 space-y-0.5">
                {visibleList.length === 0 ? (
                  <div className="px-3 py-2 text-center text-xs text-mute">
                    Không tìm thấy giá trị phù hợp
                  </div>
                ) : (
                  visibleList.map((val) => {
                    const checked = draftSelected.has(val);
                    return (
                      <label
                        key={val}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#f1f3f4] cursor-pointer text-xs text-[#3c4043]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleValue(val)}
                          className="w-3.5 h-3.5 rounded text-[#137333] accent-[#137333] cursor-pointer"
                        />
                        <span className={`truncate ${val === "(Chỗ trống)" ? "italic text-mute" : ""}`}>
                          {val}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-4 py-2.5 border-t border-[#dadce0] mt-2 flex items-center justify-end gap-2 bg-[#f8f9fa] rounded-b-md">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1 text-xs font-semibold rounded border border-[#dadce0] text-[#137333] bg-white hover:bg-gray-50 cursor-pointer h-7 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1 text-xs font-bold rounded bg-[#137333] hover:bg-[#0f5b28] text-white cursor-pointer h-7 shadow-xs transition-colors"
              >
                OK
              </button>
            </div>
          </div>,
          document.body
        )}
    </th>
  );
}
