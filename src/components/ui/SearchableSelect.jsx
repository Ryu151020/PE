import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { getMoldColor } from "../../lib/constants";

export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "—",
  searchPlaceholder = "Tìm kiếm...",
  isMold = false,
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
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
    <div ref={containerRef} className={`relative inline-block w-full text-sm ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
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

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full min-w-[200px] overflow-hidden border border-line bg-white shadow-lg rounded-xs">
          <div className="flex items-center gap-1 border-b border-line px-2 py-1.5 bg-canvas">
            <Search size={14} className="text-mute shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-mute hover:text-ink"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto p-1">
            <div
              onClick={() => handleSelect(null)}
              className="cursor-pointer px-2 py-1.5 text-sm text-mute hover:bg-canvas rounded-xs"
            >
              — {placeholder} —
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-center text-sm text-mute">
                Không tìm thấy / 未找到
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const moldColor = isMold ? getMoldColor(opt.label) : null;
                return (
                  <div
                    key={opt.value}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={`flex items-center justify-between gap-1 px-2 py-1.5 text-sm rounded-xs cursor-pointer ${
                      opt.disabled
                        ? "cursor-not-allowed opacity-50 bg-gray-50"
                        : isSelected
                        ? "bg-[#2051A3] text-white"
                        : "text-ink hover:bg-canvas"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {moldColor && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-xs border font-medium ${
                          isSelected ? "bg-white/20 text-white border-white/40" : `${moldColor.bg} ${moldColor.text} ${moldColor.border}`
                        }`}
                      >
                        {opt.label}
                      </span>
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
        </div>
      )}
    </div>
  );
}
