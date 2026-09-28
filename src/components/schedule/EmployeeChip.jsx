import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { EMP_STATUS_TAG, POSITIONS } from "../../lib/constants";
import { getPositionLabel, getStatusLabel, t } from "../../lib/i18n";
import { inputCls } from "../../lib/styles";

/* ============================================================
   EMPLOYEE CHIP / MULTI-SELECT / OVERTIME
   ============================================================ */
export const POSITION_DOT = { [POSITIONS.WORKER]: "bg-mute", [POSITIONS.SHIFT_LEADER]: "bg-brand", [POSITIONS.TEAM_LEADER]: "bg-cyan", [POSITIONS.TECHNICIAN]: "bg-warn", [POSITIONS.SUPPORT]: "bg-ok" };

/* ---- Lightweight external store for the employee-chip hover popover ----
   We deliberately render ONE popover instance near the very root of the app
   (see <ChipHoverPopover/> in PEScheduler) instead of one per chip, and instead
   of a React Portal (createPortal isn't available in this environment) we use
   a tiny pub/sub store. This keeps the popover's DOM position completely
   outside of any table/sticky/scroll ancestor, so it can never be visually
   clipped by, or bleed into, other cells — which is what caused the garbled
   overlapping text when the popover was nested inside the table. */
export let chipHoverListeners = new Set();

export let chipHoverState = null;

export let chipHoverCloseTimer = null;

export function publishChipHover(payload) {
  if (chipHoverCloseTimer) { clearTimeout(chipHoverCloseTimer); chipHoverCloseTimer = null; }
  chipHoverState = payload;
  chipHoverListeners.forEach((fn) => fn(chipHoverState));
}

export function scheduleChipHoverClose() {
  if (chipHoverCloseTimer) clearTimeout(chipHoverCloseTimer);
  chipHoverCloseTimer = setTimeout(() => { chipHoverState = null; chipHoverListeners.forEach((fn) => fn(null)); }, 100);
}

export function useChipHoverState() {
  const [s, setS] = useState(chipHoverState);
  useEffect(() => {
    chipHoverListeners.add(setS);
    return () => chipHoverListeners.delete(setS);
  }, []);
  return s;
}

export const CHIP_POPOVER_W = 220, CHIP_POPOVER_H = 128;

/* Renders the single, shared hover popover. Mounted once near the app root
   (outside the scrolling table) so it always paints above every other cell. */
export function ChipHoverPopover() {
  const { lang = "vi" } = useApp() || {};
  const hover = useChipHoverState();
  if (!hover) return null;
  const { employee, rect } = hover;
  const spaceBelow = window.innerHeight - rect.bottom;
  const flipUp = spaceBelow < CHIP_POPOVER_H + 12 && rect.top > CHIP_POPOVER_H + 12;
  let left = rect.left;
  if (left + CHIP_POPOVER_W > window.innerWidth - 8) left = window.innerWidth - CHIP_POPOVER_W - 8;
  if (left < 8) left = 8;
  const top = flipUp ? rect.top - CHIP_POPOVER_H - 6 : rect.bottom + 6;
  return (
    <div
      className="fixed z-50 rad-14 border border-line bg-white p-3 text-xs sh-soft"
      style={{ width: CHIP_POPOVER_W, top, left }}
      onMouseEnter={() => publishChipHover(hover)} onMouseLeave={scheduleChipHoverClose}
    >
      <div className="font-semibold text-ink">{employee.vietnameseName}</div>
      <div className="text-mute">{employee.chineseName || (lang === "zh" ? "未更新中文名" : lang === "en" ? "No Chinese name" : "Chưa cập nhật tên Trung")}</div>
      <div className="mt-1.5 grid grid-cols-2 gap-y-1 text-mute">
        <span>{t("empCode", lang)}:</span><span className="text-ink font-medium">{employee.employeeCode}</span>
        <span>{t("position", lang)}:</span><span className="text-ink font-medium">{getPositionLabel(employee.position, lang)}</span>
        <span>{t("status", lang)}:</span><span className="text-ink font-medium">{getStatusLabel(employee.status, lang)}</span>
      </div>
    </div>
  );
}

export function EmployeeChip({ employee, editable, onRemove, draggable, onDragStart }) {
  const anchorRef = useRef(null);
  if (!employee) return null;

  const openPopover = () => {
    const el = anchorRef.current;
    if (!el) return;
    publishChipHover({ employee, rect: el.getBoundingClientRect() });
  };

  return (
    <span className="relative inline-flex">
      <span
        ref={anchorRef}
        draggable={draggable} onDragStart={onDragStart}
        className={`inline-flex items-center gap-1 rounded-full bg-white border border-line px-2 py-0.5 text-xs font-medium text-ink hover:bg-canvas ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
        onMouseEnter={openPopover} onMouseLeave={scheduleChipHoverClose}
      >
        <span className="truncate" style={{ maxWidth: 125 }}>{employee.vietnameseName}</span>
        {EMP_STATUS_TAG[employee.status] && <span className={`rad-6 ${EMP_STATUS_TAG[employee.status].color} px-1 text-xs font-bold text-white`}>{EMP_STATUS_TAG[employee.status].char}</span>}
        {editable && (
          <button className="ml-0.5 text-mute hover:text-bad" onClick={(e) => { e.stopPropagation(); onRemove && onRemove(); }}><X size={12} /></button>
        )}
      </span>
    </span>
  );
}

export function EmployeeMultiSelect({ candidates, selectedIds, editable, onChange, dragContext, isDropTarget, onDropEmployee }) {
  const [addOpen, setAddOpen] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const addContainerRef = useRef(null);
  const expandContainerRef = useRef(null);
  const VISIBLE = 3;
  const selectedEmployees = selectedIds.map((id) => candidates.find((c) => c.id === id)).filter(Boolean);
  const visible = selectedEmployees.slice(0, VISIBLE);
  const overflow = selectedEmployees.slice(VISIBLE);
  const results = useMemo(() => {
    const pool = candidates.filter((c) => !selectedIds.includes(c.id));
    const q = query.toLowerCase().trim();
    return (q ? pool.filter((c) => c.vietnameseName.toLowerCase().includes(q) || c.employeeCode.toLowerCase().includes(q)) : pool).slice(0, 8);
  }, [candidates, selectedIds, query]);
  const add = (id) => { onChange([...selectedIds, id]); setQuery(""); setAddOpen(false); };
  const remove = (id) => onChange(selectedIds.filter((x) => x !== id));
  const closeAllPopovers = () => { setAddOpen(false); setExpandOpen(false); };

  useEffect(() => {
    if (!addOpen && !expandOpen) return;
    const handleOutside = (e) => {
      if (addOpen && addContainerRef.current && !addContainerRef.current.contains(e.target)) {
        setAddOpen(false);
      }
      if (expandOpen && expandContainerRef.current && !expandContainerRef.current.contains(e.target)) {
        setExpandOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [addOpen, expandOpen]);

  const handleDragOver = (e) => { if (editable && isDropTarget) e.preventDefault(); };
  const handleDrop = (e) => {
    if (!editable || !onDropEmployee) return;
    e.preventDefault();
    try { onDropEmployee(JSON.parse(e.dataTransfer.getData("application/json"))); } catch (_) {}
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-[26px] rounded-xs" onDragOver={handleDragOver} onDrop={handleDrop} onDragStartCapture={closeAllPopovers}>
      {visible.map((emp) => (
        <EmployeeChip key={emp.id} employee={emp} editable={editable} onRemove={() => remove(emp.id)}
          draggable={editable && !!dragContext}
          onDragStart={(e) => { closeAllPopovers(); if (dragContext) e.dataTransfer.setData("application/json", JSON.stringify({ employeeId: emp.id, sourceMachineId: dragContext.machineId, sourceColKey: dragContext.colKey })); }} />
      ))}
      {overflow.length > 0 && (
        <span ref={expandContainerRef} className="relative">
          <button className="rounded-xs bg-line px-1.5 py-0.5 text-xs font-semibold text-body hover:bg-line-deep" onClick={() => setExpandOpen((v) => !v)}>+{overflow.length}</button>
          {expandOpen && (
            <div className="absolute left-0 top-full z-40 mt-1 w-[260px] rounded-xs border border-line bg-white p-2 shadow-md">
              <div className="mb-1 text-xs font-medium text-mute">Xem tất cả / 查看全部 ({selectedEmployees.length})</div>
              <div className="flex flex-wrap gap-1">
                {selectedEmployees.map((emp) => (
                  <EmployeeChip key={emp.id} employee={emp} editable={editable} onRemove={() => remove(emp.id)} draggable={editable && !!dragContext}
                    onDragStart={(e) => { closeAllPopovers(); if (dragContext) e.dataTransfer.setData("application/json", JSON.stringify({ employeeId: emp.id, sourceMachineId: dragContext.machineId, sourceColKey: dragContext.colKey })); }} />
                ))}
              </div>
            </div>
          )}
        </span>
      )}
      {editable && (
        <span ref={addContainerRef} className="relative">
          <button
            className={`flex h-[22px] w-[22px] items-center justify-center rounded-xs border border-dashed border-line2 text-mute hover:border-brand hover:text-brand transition-opacity ${
              addOpen ? "opacity-100 border-brand text-brand" : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={() => setAddOpen((v) => !v)}
            title="Thêm nhân sự"
          >
            <Plus size={13} />
          </button>
          {addOpen && (
            <div className="absolute left-0 top-full z-40 mt-1 w-[250px] rounded-xs border border-line bg-white p-2 shadow-md">
              <input autoFocus className={`${inputCls} mb-1.5 text-sm`} placeholder="Tìm công nhân... / 搜索工人..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="max-h-[170px] overflow-y-auto">
                {results.length === 0 && <div className="px-1 py-2 text-sm text-mute">Không có kết quả / 无结果</div>}
                {results.map((emp) => (
                  <button key={emp.id} className="flex w-full items-center justify-between px-1.5 py-1 text-left text-sm rounded-xs hover:bg-canvas" onClick={() => add(emp.id)}>
                    <span className="truncate">{emp.vietnameseName}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {EMP_STATUS_TAG[emp.status] && <span className={`rounded-xs ${EMP_STATUS_TAG[emp.status].color} px-1 text-xs font-bold text-white`}>{EMP_STATUS_TAG[emp.status].char}</span>}
                      <span className="text-xs text-mute">{emp.employeeCode}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </span>
      )}
    </div>
  );
}
