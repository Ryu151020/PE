import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";

export function SortableTh({
  labelVi,
  labelZh,
  colKey,
  sortConfig,
  onSort,
  filterValue,
  onFilterChange,
  filterType = "text",
  filterOptions = [],
  className = "",
}) {
  const isSorted = sortConfig && sortConfig.key === colKey;
  const sortDirection = isSorted ? sortConfig.direction : null;

  return (
    <th className={`px-3 py-2 text-left align-top font-semibold text-ink text-sm ${className}`}>
      <div
        className="flex items-center gap-1 cursor-pointer select-none hover:text-[#2051A3] transition-colors mb-1"
        onClick={() => onSort(colKey)}
        title="Bấm để sắp xếp / 点击排序"
      >
        <span>{labelVi}</span>
        {labelZh && <span className="text-xs text-mute font-normal">/ {labelZh}</span>}
        <span className="ml-0.5 text-mute">
          {sortDirection === "asc" ? (
            <ArrowUp size={13} className="text-[#2051A3]" />
          ) : sortDirection === "desc" ? (
            <ArrowDown size={13} className="text-[#2051A3]" />
          ) : (
            <ArrowUpDown size={12} className="opacity-40 hover:opacity-100" />
          )}
        </span>
      </div>

      {onFilterChange && (
        <div className="mt-1">
          {filterType === "select" ? (
            <select
              value={filterValue || ""}
              onChange={(e) => onFilterChange(colKey, e.target.value)}
              className="w-full border border-line bg-white px-1.5 py-1 text-xs rounded-xs font-normal text-ink focus:border-[#2051A3] focus:outline-none"
            >
              <option value="">Tất cả / 全部</option>
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={filterValue || ""}
              onChange={(e) => onFilterChange(colKey, e.target.value)}
              placeholder="Lọc... / 过滤"
              className="w-full border border-line bg-white px-1.5 py-1 text-xs rounded-xs font-normal text-ink focus:border-[#2051A3] focus:outline-none placeholder:text-mute"
            />
          )}
        </div>
      )}
    </th>
  );
}
