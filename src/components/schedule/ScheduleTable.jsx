import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScheduleRow } from "./ScheduleRow";
import { ShiftHeader } from "./ShiftHeader";
import { useApp } from "../../context/AppContext";
import { MACHINE_STATUS_DEFS } from "../../lib/constants";
import { addToColumn, applyCellValue, entryMachineStatus, getCellValue, isSchedulableOn, removeFromColumn } from "../../lib/schedule";
import { card } from "../../lib/styles";

export function ScheduleTable({ machines, molds, orders, ordersById, entries, editable, dateKey, activeWorkers, techniciansPool, supportPool, employeesById, onPatchEntry, onBulkUpdate, dayData, employees, onChangeLeaders }) {
  const { pushToast } = useApp();
  const [selection, setSelection] = useState(null); // { anchor, focus, colKeys[], machineIds[] } rectangle

  // Per-date shift collapse state: each date has its own independent day and night collapse toggles
  const [collapsedByDate, setCollapsedByDate] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("pe_collapsed_shifts") || "{}");
    } catch {
      return {};
    }
  });

  const dayCollapsed = Boolean(collapsedByDate[dateKey]?.day);
  const nightCollapsed = Boolean(collapsedByDate[dateKey]?.night);

  const toggleDay = useCallback(() => {
    setCollapsedByDate((prev) => {
      const next = {
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          day: !prev[dateKey]?.day,
        },
      };
      try {
        sessionStorage.setItem("pe_collapsed_shifts", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [dateKey]);

  const toggleNight = useCallback(() => {
    setCollapsedByDate((prev) => {
      const next = {
        ...prev,
        [dateKey]: {
          ...(prev[dateKey] || {}),
          night: !prev[dateKey]?.night,
        },
      };
      try {
        sessionStorage.setItem("pe_collapsed_shifts", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [dateKey]);

  const clipboardRef = useRef(null);
  const machineIndex = useMemo(() => Object.fromEntries(machines.map((m, i) => [m.id, i])), [machines]);

  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(false);
  const tableRef = useRef(null);
  const tbodyRef = useRef(null);
  const [uniformRowHeight, setUniformRowHeight] = useState(null);

  const updateRowHeight = useCallback(() => {
    if (!tbodyRef.current) return;
    const trs = Array.from(tbodyRef.current.children);
    if (!trs.length) return;

    let maxH = 40;
    for (const tr of trs) {
      const cellContents = tr.querySelectorAll("td > *");
      for (const el of cellContents) {
        if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          const needed = Math.ceil(rect.height + 14);
          if (needed > maxH) maxH = needed;
        }
      }
    }
    setUniformRowHeight((prev) => (prev !== maxH ? maxH : prev));
  }, []);

  useLayoutEffect(() => {
    updateRowHeight();
  });

  useEffect(() => {
    const handleResize = () => updateRowHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateRowHeight]);
  const visibleCols = useMemo(() => ["machineStatus", "mold", "order", "filmRoll", ...(dayCollapsed ? [] : ["dayWorkers", "dayOT", "dayTech", "dayOther"]), ...(nightCollapsed ? [] : ["nightWorkers", "nightOT", "nightTech", "nightOther"])], [dayCollapsed, nightCollapsed]);
  const isEmpCol = (k) => k.endsWith("Workers") || k.endsWith("Tech") || k.endsWith("Other");
  const colType = (k) => (isEmpCol(k) ? "employees" : k.endsWith("OT") ? "ot" : k);

  // rectangular selection = every visible column between anchor and focus x every machine row between them
  const buildSelection = useCallback((anchor, focus) => {
    const c1 = visibleCols.indexOf(anchor.colKey), c2 = visibleCols.indexOf(focus.colKey);
    const r1 = machineIndex[anchor.machineId], r2 = machineIndex[focus.machineId];
    if (c1 < 0 || c2 < 0 || r1 === undefined || r2 === undefined) return null;
    const [cLo, cHi] = c1 <= c2 ? [c1, c2] : [c2, c1];
    const [rLo, rHi] = r1 <= r2 ? [r1, r2] : [r2, r1];
    return { anchor, focus, colKeys: visibleCols.slice(cLo, cHi + 1), machineIds: machines.slice(rLo, rHi + 1).map((m) => m.id) };
  }, [visibleCols, machineIndex, machines]);

  const selectCell = useCallback((colKey, machineId, shift) => {
    setSelection((prev) => {
      if (!editable) return prev;
      const cell = { colKey, machineId };
      if (shift && prev) return buildSelection(prev.anchor, cell) || prev;
      return buildSelection(cell, cell);
    });
  }, [editable, buildSelection]);

  const handleCellMouseDown = useCallback((e, colKey, machineId) => {
    if (!editable) return;
    // Allow both left-click (0) and right-click (2) for dragging to select cells
    if (e.button !== 0 && e.button !== 2) return;
    if (
      e.target &&
      e.target.closest &&
      e.target.closest('input,textarea,[draggable="true"],.no-drag,[data-no-drag]')
    ) {
      return;
    }
    e.preventDefault();
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
      document.activeElement.blur();
    }
    if (e.shiftKey) {
      selectCell(colKey, machineId, true);
      return;
    }
    dragRef.current = true;
    setDragging(true);
    selectCell(colKey, machineId, false);
  }, [editable, selectCell]);

  const handleCellEnter = useCallback((colKey, machineId) => {
    if (!dragRef.current) return;
    setSelection((prev) => (prev ? buildSelection(prev.anchor, { colKey, machineId }) || prev : prev));
  }, [buildSelection]);

  useEffect(() => {
    const up = () => {
      if (dragRef.current) {
        dragRef.current = false;
        setDragging(false);
      }
    };
    const handleContextMenu = (e) => {
      if (tableRef.current && tableRef.current.contains(e.target)) {
        if (dragRef.current || (selection && selection.machineIds.length > 1)) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener("mouseup", up);
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("mouseup", up);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [selection]);

  useEffect(() => { setSelection(null); }, [dayCollapsed, nightCollapsed, dateKey, editable]);

  useEffect(() => {
    if (!selection) return;
    const handleOutsideClick = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target)) {
        if (e.target && e.target.closest && (e.target.closest('[role="dialog"]') || e.target.closest('.fixed'))) return;
        setSelection(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selection]);

  const cellText = (colKey, v) => {
    if (colKey === "machineStatus") return MACHINE_STATUS_DEFS[v]?.vi || "";
    if (colKey === "mold") return molds.find((m) => m.id === v)?.moldName || "";
    if (colKey === "order") return ordersById[v]?.orderCode || "";
    if (Array.isArray(v)) return v.map((id) => employeesById[id]?.vietnameseName || id).join(", ");
    return v === null || v === undefined ? "" : String(v);
  };

  const handleCopy = useCallback(() => {
    if (!selection) return;
    const ordered = machines.filter((m) => selection.machineIds.includes(m.id));
    const rows = ordered.map((m) => selection.colKeys.map((colKey) => {
      if (colKey === "machineStatus") return entryMachineStatus(entries[m.id], m);
      const v = getCellValue(entries[m.id], colKey);
      return Array.isArray(v) ? [...v] : v;
    }));
    clipboardRef.current = { colKeys: [...selection.colKeys], rows };
    try { const tsv = rows.map((r) => r.map((v, c) => cellText(selection.colKeys[c], v)).join("\t")).join("\n"); if (navigator.clipboard) navigator.clipboard.writeText(tsv).catch(() => {}); } catch (err) { /* clipboard not available in this sandbox */ }
    const total = rows.length * selection.colKeys.length;
    pushToast(`Đã copy ${rows.length} dòng × ${selection.colKeys.length} cột (${total} ô) / 已复制 ${total} 格`, "info");
  }, [selection, machines, entries, pushToast, molds, ordersById, employeesById]);

  const handlePaste = useCallback(() => {
    if (!editable || !selection) return;
    const clip = clipboardRef.current;
    if (!clip) return;
    const cR = clip.rows.length, cC = clip.colKeys.length;
    const selR = selection.machineIds.length, selC = selection.colKeys.length;
    const startRow = Math.min(...selection.machineIds.map((id) => machineIndex[id]));
    const startCol = visibleCols.indexOf(selection.colKeys[0]);
    if (startCol < 0) return;
    // selection bigger than the copied block and an exact multiple -> tile it (1x1 fills the whole selection); otherwise paste once at the top-left cell
    const tile = (selR > cR || selC > cC) && selR % cR === 0 && selC % cC === 0;
    const outR = tile ? selR : cR, outC = tile ? selC : cC;
    const assignments = [];
    let mismatch = 0, clipped = 0;
    for (let r = 0; r < outR; r++) {
      const machine = machines[startRow + r];
      for (let c = 0; c < outC; c++) {
        const colKey = visibleCols[startCol + c];
        if (!machine || !colKey) { clipped++; continue; }
        if (colKey === "filmRoll") continue;
        const srcCol = clip.colKeys[c % cC];
        if (srcCol === "filmRoll") continue;
        if (colType(srcCol) !== colType(colKey)) { mismatch++; continue; }
        assignments.push({ machineId: machine.id, colKey, value: clip.rows[r % cR][c % cC] });
      }
    }
    if (assignments.length === 0) { pushToast("Không thể dán: khác loại cột dữ liệu / 无法粘贴：列类型不同", "error"); return; }

    const newEntries = { ...entries };
    const allSkipped = [];
    assignments.forEach(({ machineId, colKey, value }) => {
      if (colKey === "machineStatus") {
        if (MACHINE_STATUS_DEFS[value]) newEntries[machineId] = { ...newEntries[machineId], machineStatus: value };
        return;
      }
      const { entry, skipped } = applyCellValue(newEntries[machineId], colKey, value, dateKey, employeesById, {}, ordersById);
      newEntries[machineId] = entry;
      skipped.forEach((s) => allSkipped.push({ ...s, machineId }));
    });
    onBulkUpdate(newEntries);

    const endRow = Math.min(startRow + outR - 1, machines.length - 1), endCol = Math.min(startCol + outC - 1, visibleCols.length - 1);
    setSelection(buildSelection({ colKey: visibleCols[startCol], machineId: machines[startRow].id }, { colKey: visibleCols[endCol], machineId: machines[endRow].id }));
    const notes = allSkipped.length + mismatch + clipped;
    if (notes > 0) pushToast(`Đã dán ${assignments.length} ô, bỏ qua ${notes} ô không hợp lệ / 已粘贴 ${assignments.length} 格，跳过 ${notes} 格`, "warning");
    else pushToast(`Đã dán ${assignments.length} ô / 已粘贴 ${assignments.length} 格`, "success");
  }, [editable, selection, entries, machines, machineIndex, visibleCols, dateKey, employeesById, ordersById, onBulkUpdate, pushToast, buildSelection]);

  const handleDropEmployee = useCallback((targetMachineId, colKey, payload) => {
    if (!editable) return;
    const { employeeId, sourceMachineId, sourceColKey } = payload;
    if (sourceMachineId === targetMachineId && sourceColKey === colKey) return;
    const emp = employeesById[employeeId];
    if (!emp || !isSchedulableOn(emp, dateKey)) { pushToast(`${emp?.vietnameseName || "Nhân viên"} đã nghỉ việc / 已离职`, "error"); return; }
    const newEntries = { ...entries };
    if (sourceMachineId) newEntries[sourceMachineId] = removeFromColumn(newEntries[sourceMachineId], sourceColKey, employeeId);
    const shiftKey = colKey === "dayWorkers" ? "dayShift" : colKey === "nightWorkers" ? "nightShift" : null;
    if (shiftKey) {
      const conflict = machines.find((m) => m.id !== targetMachineId && m.id !== sourceMachineId && newEntries[m.id][shiftKey].workers.includes(employeeId));
      if (conflict) { pushToast(`${emp.vietnameseName} đã được phân ca tại máy ${conflict.machineNumber} / 已在其他机器排班`, "error"); return; }
    }
    newEntries[targetMachineId] = addToColumn(newEntries[targetMachineId], colKey, employeeId);
    onBulkUpdate(newEntries);
    pushToast(`Đã chuyển ${emp.vietnameseName} sang máy ${machines.find((m) => m.id === targetMachineId)?.machineNumber} / 已转移`, "success");
  }, [editable, entries, employeesById, dateKey, machines, onBulkUpdate, pushToast]);

  const handleDeleteSelection = useCallback(() => {
    if (!editable || !selection) return;
    const cols = selection.colKeys.filter((k) => k !== "filmRoll");
    if (cols.length === 0) return;
    const newEntries = { ...entries };
    selection.machineIds.forEach((machineId) => {
      cols.forEach((colKey) => { const { entry } = applyCellValue(newEntries[machineId], colKey, "", dateKey, employeesById, {}, ordersById); newEntries[machineId] = entry; });
    });
    onBulkUpdate(newEntries);
    const total = selection.machineIds.length * cols.length;
    pushToast(`Đã xóa dữ liệu ${total} ô / 已清空 ${total} 格`, "info");
  }, [editable, selection, entries, dateKey, employeesById, ordersById, onBulkUpdate, pushToast]);

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.ctrlKey || e.metaKey;
      const tag = (e.target && e.target.tagName) || "";
      const inField = ["INPUT", "SELECT", "TEXTAREA"].includes(tag);
      if (e.key === "Escape" && !inField && selection) { setSelection(null); return; }
      if (meta) { if (e.key === "c" || e.key === "C") handleCopy(); if (e.key === "v" || e.key === "V") handlePaste(); return; }
      if (!inField && (e.key === "Delete" || e.key === "Backspace") && selection) { e.preventDefault(); handleDeleteSelection(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCopy, handlePaste, handleDeleteSelection, selection]);

  return (
    <div className={`${card} v-rise overflow-hidden`} style={{ "--i": 4 }}>
      <div style={{ overflowX: "auto", overflowY: "hidden" }}>
        <table ref={tableRef} className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0, userSelect: dragging ? "none" : undefined }}>
          <ShiftHeader dayData={dayData} employees={employees} employeesById={employeesById} editable={editable} onChangeLeaders={onChangeLeaders}
            dayCollapsed={dayCollapsed} nightCollapsed={nightCollapsed} onToggleDay={toggleDay} onToggleNight={toggleNight} />
          <tbody ref={tbodyRef}>
            {machines.map((machine) => (
              <ScheduleRow key={machine.id} machine={machine} entry={entries[machine.id]} molds={molds} orders={orders} ordersById={ordersById} editable={editable} activeWorkers={activeWorkers} techniciansPool={techniciansPool} supportPool={supportPool} employeesById={employeesById}
                onPatchEntry={(patch) => onPatchEntry(machine.id, patch)} selection={selection} onSelectCell={(colKey, id, shift) => selectCell(colKey, id, shift)} onCellMouseDown={handleCellMouseDown} onCellEnter={handleCellEnter} onDropEmployee={(colKey, payload) => handleDropEmployee(machine.id, colKey, payload)}
                dayCollapsed={dayCollapsed} nightCollapsed={nightCollapsed} rowHeight={uniformRowHeight} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
