import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { EMP_STATUS_TAG, POSITIONS } from "../../lib/constants";
import { getPositionLabel, getStatusLabel, t } from "../../lib/i18n";
import { inputCls } from "../../lib/styles";

/* ============================================================
   EMPLOYEE CHIP / MULTI-SELECT / OVERTIME
   ============================================================ */
export const POSITION_DOT = { [POSITIONS.WORKER]: "bg-mute", [POSITIONS.SHIFT_LEADER]: "bg-brand", [POSITIONS.TEAM_LEADER]: "bg-cyan", [POSITIONS.TECHNICIAN]: "bg-warn", [POSITIONS.SUPPORT]: "bg-ok" };

/* ---- Lightweight external store for the employee-chip hover popover ---- */
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
        <span className="whitespace-nowrap max-w-[260px] truncate">{employee.vietnameseName}</span>
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
  const addTriggerRef = useRef(null);
  const addDropdownRef = useRef(null);
  const expandTriggerRef = useRef(null);
  const expandDropdownRef = useRef(null);

  const [addCoords, setAddCoords] = useState({ isFlipUp: false, top: 0, bottom: 0, left: 0, width: 250 });
  const [expandCoords, setExpandCoords] = useState({ isFlipUp: false, top: 0, bottom: 0, left: 0, width: 260 });

  const { db } = useApp() || {};
  const allEmployeesMap = useMemo(() => {
    const map = {};
    (db?.employees || []).forEach((e) => {
      if (e.id) map[e.id] = e;
      if (e.employeeCode) map[e.employeeCode] = e;
    });
    return map;
  }, [db?.employees]);

  const VISIBLE = 3;
  const selectedEmployees = selectedIds.map((id) => {
    if (allEmployeesMap[id]) return allEmployeesMap[id];
    if (candidates) {
      const found = candidates.find((c) => c.id === id || c.employeeCode === id);
      if (found) return found;
    }
    return { id, vietnameseName: id, employeeCode: id, status: "RESIGNED" };
  });
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

  const updateAddPosition = () => {
    if (!addTriggerRef.current) return;
    const rect = addTriggerRef.current.getBoundingClientRect();
    const dropdownWidth = 250;
    const dropdownHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;
    if (left < 10) left = 10;
    setAddCoords({
      isFlipUp: flipUp,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left,
      width: dropdownWidth,
    });
  };

  const updateExpandPosition = () => {
    if (!expandTriggerRef.current) return;
    const rect = expandTriggerRef.current.getBoundingClientRect();
    const dropdownWidth = 260;
    const dropdownHeight = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;
    if (left < 10) left = 10;
    setExpandCoords({
      isFlipUp: flipUp,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left,
      width: dropdownWidth,
    });
  };

  const handleToggleAdd = (e) => {
    e.stopPropagation();
    if (!editable) return;
    updateAddPosition();
    setAddOpen((v) => !v);
    setExpandOpen(false);
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    updateExpandPosition();
    setExpandOpen((v) => !v);
    setAddOpen(false);
  };

  useEffect(() => {
    if (!addOpen && !expandOpen) return;

    const handleOutside = (e) => {
      if (
        addOpen &&
        addTriggerRef.current &&
        !addTriggerRef.current.contains(e.target) &&
        addDropdownRef.current &&
        !addDropdownRef.current.contains(e.target)
      ) {
        setAddOpen(false);
      }
      if (
        expandOpen &&
        expandTriggerRef.current &&
        !expandTriggerRef.current.contains(e.target) &&
        expandDropdownRef.current &&
        !expandDropdownRef.current.contains(e.target)
      ) {
        setExpandOpen(false);
      }
    };

    const handleScroll = (e) => {
      if (addDropdownRef.current && addDropdownRef.current.contains(e.target)) return;
      if (expandDropdownRef.current && expandDropdownRef.current.contains(e.target)) return;
      if (addOpen) updateAddPosition();
      if (expandOpen) updateExpandPosition();
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeAllPopovers();
    };

    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", () => {
      if (addOpen) updateAddPosition();
      if (expandOpen) updateExpandPosition();
    });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [addOpen, expandOpen]);

  const handleDragOver = (e) => { if (editable && isDropTarget) e.preventDefault(); };
  const handleDrop = (e) => {
    if (!editable || !onDropEmployee) return;
    e.preventDefault();
    try { onDropEmployee(JSON.parse(e.dataTransfer.getData("application/json"))); } catch (_) {}
  };

  return (
    <div className="inline-flex w-full min-h-[26px] flex-wrap items-center content-center align-middle gap-1.5 rounded-xs" onDragOver={handleDragOver} onDrop={handleDrop} onDragStartCapture={closeAllPopovers}>
      {visible.map((emp) => (
        <EmployeeChip key={emp.id} employee={emp} editable={editable} onRemove={() => remove(emp.id)}
          draggable={editable && !!dragContext}
          onDragStart={(e) => { closeAllPopovers(); if (dragContext) e.dataTransfer.setData("application/json", JSON.stringify({ employeeId: emp.id, sourceMachineId: dragContext.machineId, sourceColKey: dragContext.colKey })); }} />
      ))}
      {overflow.length > 0 && (
        <span className="relative">
          <button
            ref={expandTriggerRef}
            data-no-drag="true"
            className="rounded-xs bg-line px-1.5 py-0.5 text-xs font-semibold text-body hover:bg-line-deep cursor-pointer"
            onClick={handleToggleExpand}
          >
            +{overflow.length}
          </button>
          {expandOpen &&
            createPortal(
              <div
                ref={expandDropdownRef}
                style={{
                  position: "fixed",
                  ...(expandCoords.isFlipUp ? { bottom: expandCoords.bottom } : { top: expandCoords.top }),
                  left: expandCoords.left,
                  width: expandCoords.width,
                  zIndex: 99999,
                }}
                className="rounded-xs border border-line bg-white p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-xs"
              >
                <div className="mb-1.5 text-xs font-bold text-mute flex items-center justify-between">
                  <span>Xem tất cả ({selectedEmployees.length})</span>
                  <button type="button" onClick={() => setExpandOpen(false)} className="text-mute hover:text-ink cursor-pointer"><X size={13} /></button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-[220px] overflow-y-auto">
                  {selectedEmployees.map((emp) => (
                    <EmployeeChip key={emp.id} employee={emp} editable={editable} onRemove={() => remove(emp.id)} draggable={editable && !!dragContext}
                      onDragStart={(e) => { closeAllPopovers(); if (dragContext) e.dataTransfer.setData("application/json", JSON.stringify({ employeeId: emp.id, sourceMachineId: dragContext.machineId, sourceColKey: dragContext.colKey })); }} />
                  ))}
                </div>
              </div>,
              document.body
            )}
        </span>
      )}
      {editable && (
        <span className="relative">
          <button
            ref={addTriggerRef}
            data-no-drag="true"
            className={`flex h-[22px] w-[22px] items-center justify-center rounded-xs border border-dashed border-line2 text-mute hover:border-brand hover:text-brand transition-opacity cursor-pointer ${
              addOpen ? "opacity-100 border-brand text-brand" : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={handleToggleAdd}
            title="Thêm nhân sự"
          >
            <Plus size={13} />
          </button>
          {addOpen &&
            createPortal(
              <div
                ref={addDropdownRef}
                style={{
                  position: "fixed",
                  ...(addCoords.isFlipUp ? { bottom: addCoords.bottom } : { top: addCoords.top }),
                  left: addCoords.left,
                  width: addCoords.width,
                  zIndex: 99999,
                }}
                className="rounded-xs border border-line bg-white p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-ink text-xs">Thêm nhân viên</span>
                  <button type="button" onClick={() => setAddOpen(false)} className="text-mute hover:text-ink cursor-pointer"><X size={13} /></button>
                </div>
                <input
                  autoFocus
                  className={`${inputCls} mb-1.5 text-xs py-1.5`}
                  placeholder="Tìm theo tên, mã NV..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="max-h-[170px] overflow-y-auto">
                  {results.length === 0 && <div className="px-1 py-2 text-xs text-mute text-center">Không có kết quả / 无结果</div>}
                  {results.map((emp) => (
                    <button key={emp.id} className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs rounded-xs hover:bg-canvas cursor-pointer" onClick={() => add(emp.id)}>
                      <span className="truncate font-medium">{emp.vietnameseName}</span>
                      <span className="flex items-center gap-1 shrink-0 ml-1.5">
                        {EMP_STATUS_TAG[emp.status] && <span className={`rounded-xs ${EMP_STATUS_TAG[emp.status].color} px-1 text-[10px] font-bold text-white`}>{EMP_STATUS_TAG[emp.status].char}</span>}
                        <span className="text-[11px] text-mute">{emp.employeeCode}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}
        </span>
      )}
    </div>
  );
}
