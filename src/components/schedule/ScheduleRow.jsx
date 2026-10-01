import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmployeeMultiSelect } from "./EmployeeChip";
import { ShiftOvertimeBadge } from "./ShiftOvertimeBadge";
import { StackedStatusBadge } from "../ui/Badges";
import { SearchableSelect } from "../ui/SearchableSelect";
import { useApp } from "../../context/AppContext";
import { MACHINE_STATUS_COLOR, MACHINE_STATUS_DEFS, MACHINE_STATUS_TEXT_COLOR, getMoldColor } from "../../lib/constants";
import { getMachineStatusLabel } from "../../lib/i18n";
import { entryMachineStatus } from "../../lib/schedule";

function MachineStatusCell({ machineStatus, onChange, lang, disabled }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ isFlipUp: false, top: 0, bottom: 0, left: 0, width: 140 });
  const st = MACHINE_STATUS_DEFS[machineStatus];

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 140;
    const dropdownHeight = 150;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

    let left = rect.left + rect.width / 2 - dropdownWidth / 2;
    if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;
    if (left < 10) left = 10;

    setCoords({
      isFlipUp: flipUp,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left,
      width: dropdownWidth,
    });
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (disabled) return;
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
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleScroll = (e) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
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

  return (
    <div className="relative inline-flex items-center justify-center w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none disabled:cursor-not-allowed disabled:transform-none select-none"
        title={disabled ? "" : "Bấm để đổi trạng thái máy"}
      >
        <StackedStatusBadge vi={st?.vi} zh={st?.zh} className={MACHINE_STATUS_COLOR[machineStatus]} />
      </button>

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
            className="rounded-lg border border-line bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-sm"
          >
            {Object.entries(MACHINE_STATUS_DEFS).map(([k]) => {
              const isSel = k === machineStatus;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(k);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                    isSel ? "bg-[#F4F7FE]" : "hover:bg-canvas"
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                      k === "OPEN" ? "bg-ok" : k === "STOPPED" ? "bg-bad" : "bg-warn"
                    }`}
                  />
                  <span style={{ color: MACHINE_STATUS_TEXT_COLOR[k] }}>
                    {getMachineStatusLabel(k, lang)}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export function ScheduleRow({ machine, entry, molds, orders, ordersById, editable, activeWorkers, techniciansPool, supportPool, onPatchEntry, selection, onSelectCell, onCellMouseDown, onCellEnter, onDropEmployee, employeesById, dayCollapsed, nightCollapsed }) {
  const { lang = "vi" } = useApp() || {};
  const L0 = 0, L1 = 56, L2 = 176, W0 = 56, W1 = 120, W2 = 140;
  const selInfo = (colKey) => {
    if (!selection || !selection.colKeys.includes(colKey) || !selection.machineIds.includes(machine.id)) return null;
    const ci = selection.colKeys.indexOf(colKey), ri = selection.machineIds.indexOf(machine.id);
    return { top: ri === 0, bottom: ri === selection.machineIds.length - 1, left: ci === 0, right: ci === selection.colKeys.length - 1 };
  };
  const selected = (colKey) => !!selInfo(colKey);
  const edgeShadow = (colKey) => { const e = selInfo(colKey); if (!e) return null; const p = []; if (e.top) p.push("inset 0 2px 0 0 #4318FF"); if (e.bottom) p.push("inset 0 -2px 0 0 #4318FF"); if (e.left) p.push("inset 2px 0 0 0 #4318FF"); if (e.right) p.push("inset -2px 0 0 0 #4318FF"); return p.length ? p.join(", ") : null; };
  const selStyle = (colKey) => { const sh = edgeShadow(colKey); return sh ? { boxShadow: sh } : undefined; };
  const selStickyStyle = (colKey, base) => { const sh = [edgeShadow(colKey), base].filter(Boolean).join(", "); const out = {}; if (sh) out.boxShadow = sh; if (selected(colKey)) out.backgroundColor = "#EFEBFF"; return out; };
  const cellCls = (colKey) => `border-r border-b border-line px-2 py-1.5 align-middle ${selected(colKey) ? "bg-brand-tint" : ""}`;
  const updDay = (patch) => onPatchEntry({ dayShift: { ...entry.dayShift, ...patch } });
  const updNight = (patch) => onPatchEntry({ nightShift: { ...entry.nightShift, ...patch } });
  const machineStatus = entryMachineStatus(entry, machine);

  const handleOrderChange = (orderId) => {
    const order = orderId ? ordersById[orderId] : null;
    // Only the film roll follows the order — the mold stays whatever was picked for this machine (any mold can run any order).
    onPatchEntry({
      orderId: orderId || null,
      filmRollName: order ? (order.filmRollName || "") : "",
    });
  };

  const currentOrder = entry.orderId
    ? (ordersById[entry.orderId] || orders.find((o) => o.id === entry.orderId || o.orderCode === entry.orderId))
    : null;
  const orderLabel = (o) => {
    if (!o) return "";
    const sz = o.size ? String(o.size).replace(/^size\s*/i, "").trim() : "";
    return `${o.orderCode}${sz ? ` (${sz})` : ""}`;
  };
  const currentOrderLabel = currentOrder ? orderLabel(currentOrder) : (entry.orderId ? String(entry.orderId) : "");

  const moldOptions = useMemo(
    () => molds.map((m) => ({ value: m.id, label: m.moldName })),
    [molds]
  );

  const orderOptions = useMemo(
    () =>
      orders
        .filter((o) => !o.completed)
        .map((o) => ({
          value: o.id,
          label: orderLabel(o),
        })),
    [orders]
  );

  const effectiveFilmRoll = currentOrder ? (currentOrder.filmRollName || "") : (entry.filmRollName || "");

  return (
    <tr className="group text-sm">
      <td className="z-10 bg-white group-hover:bg-[#F0F4FE] transition-colors border-r border-b border-line px-2 py-1.5 text-center align-middle text-black font-bold text-[13px]" style={{ position: "sticky", left: L0, width: W0, minWidth: W0, maxWidth: W0 }}>{machine.machineNumber}</td>
      <td className={`z-10 bg-white group-hover:bg-[#F0F4FE] transition-colors border-r border-b border-line px-2 py-1.5 text-center align-middle`} style={{ position: "sticky", left: L1, width: W1, minWidth: W1, maxWidth: W1, ...selStickyStyle("machineStatus") }} onMouseDown={(e) => onCellMouseDown(e, "machineStatus", machine.id)} onMouseEnter={() => onCellEnter("machineStatus", machine.id)} onClick={(e) => onSelectCell("machineStatus", machine.id, e.shiftKey)}>
        <MachineStatusCell
          machineStatus={machineStatus}
          onChange={(val) => onPatchEntry({ machineStatus: val })}
          lang={lang}
          disabled={!editable}
        />
      </td>
      <td className={`z-10 bg-white group-hover:bg-[#F0F4FE] transition-colors border-r border-b border-line px-2 py-1.5 text-center align-middle`} style={{ position: "sticky", left: L2, width: W2, minWidth: W2, maxWidth: W2, ...selStickyStyle("mold", "8px 0 8px -8px rgba(112,144,176,0.28)") }} onMouseDown={(e) => onCellMouseDown(e, "mold", machine.id)} onMouseEnter={() => onCellEnter("mold", machine.id)} onClick={(e) => onSelectCell("mold", machine.id, e.shiftKey)}>
        <SearchableSelect
          value={entry.moldId || null}
          onChange={(val) => onPatchEntry({ moldId: val })}
          options={moldOptions}
          isMold={true}
          cellMode={true}
          disabled={!editable}
          searchPlaceholder="Tìm khuôn... / 搜索..."
        />
      </td>
      <td className={`${cellCls("order")} bg-white group-hover:bg-[#F0F4FE] transition-colors align-middle`} onMouseDown={(e) => onCellMouseDown(e, "order", machine.id)} onMouseEnter={() => onCellEnter("order", machine.id)} onClick={(e) => onSelectCell("order", machine.id, e.shiftKey)} style={selStyle("order")}>
        <SearchableSelect
          value={entry.orderId || null}
          selectedLabel={currentOrderLabel}
          onChange={handleOrderChange}
          options={orderOptions}
          cellMode={true}
          disabled={!editable}
          searchPlaceholder="Tìm đơn... / 搜索..."
        />
      </td>
      <td className="border-r border-b border-line px-2 py-1.5 align-middle bg-white group-hover:bg-[#F0F4FE] transition-colors">
        <span className="text-[13px] font-medium text-black px-1 leading-snug">{effectiveFilmRoll || ""}</span>
      </td>
      {dayCollapsed ? (
        <td className="border-r border-b border-line bg-day-soft group-hover:bg-[#FFF2DF] transition-colors align-middle" style={{ width: 26 }} />
      ) : (<>
        <td className={`${cellCls("dayWorkers")} bg-day-cell group-hover:bg-[#FFF2DF] transition-colors align-middle`} onMouseDown={(e) => onCellMouseDown(e, "dayWorkers", machine.id)} onMouseEnter={() => onCellEnter("dayWorkers", machine.id)} onClick={(e) => onSelectCell("dayWorkers", machine.id, e.shiftKey)} style={selStyle("dayWorkers")}>
          <EmployeeMultiSelect candidates={activeWorkers} selectedIds={entry.dayShift.workers} editable={editable} onChange={(ids) => updDay({ workers: ids })} dragContext={{ machineId: machine.id, colKey: "dayWorkers" }} isDropTarget onDropEmployee={(p) => onDropEmployee("dayWorkers", p)} />
        </td>
        <td className={`${cellCls("dayOT")} bg-day-cell group-hover:bg-[#FFF2DF] transition-colors text-center align-middle`} onMouseDown={(e) => onCellMouseDown(e, "dayOT", machine.id)} onMouseEnter={() => onCellEnter("dayOT", machine.id)} onClick={(e) => onSelectCell("dayOT", machine.id, e.shiftKey)} style={selStyle("dayOT")}>
          <ShiftOvertimeBadge hours={entry.dayShift.overtimeHours || 0} workerCount={entry.dayShift.workers.length} editable={editable} onChange={(h) => updDay({ overtimeHours: h })} />
        </td>
        <td className={`${cellCls("dayTech")} bg-day-cell group-hover:bg-[#FFF2DF] transition-colors align-middle`} onMouseDown={(e) => onCellMouseDown(e, "dayTech", machine.id)} onMouseEnter={() => onCellEnter("dayTech", machine.id)} onClick={(e) => onSelectCell("dayTech", machine.id, e.shiftKey)} style={selStyle("dayTech")}>
          <EmployeeMultiSelect candidates={techniciansPool} selectedIds={entry.dayShift.technicians} editable={editable} onChange={(ids) => updDay({ technicians: ids })} dragContext={{ machineId: machine.id, colKey: "dayTech" }} isDropTarget onDropEmployee={(p) => onDropEmployee("dayTech", p)} />
        </td>
        <td className={`${cellCls("dayOther")} bg-day-cell group-hover:bg-[#FFF2DF] transition-colors align-middle`} onMouseDown={(e) => onCellMouseDown(e, "dayOther", machine.id)} onMouseEnter={() => onCellEnter("dayOther", machine.id)} onClick={(e) => onSelectCell("dayOther", machine.id, e.shiftKey)} style={selStyle("dayOther")}>
          <EmployeeMultiSelect candidates={supportPool} selectedIds={entry.dayShift.otherWorkers} editable={editable} onChange={(ids) => updDay({ otherWorkers: ids })} dragContext={{ machineId: machine.id, colKey: "dayOther" }} isDropTarget onDropEmployee={(p) => onDropEmployee("dayOther", p)} />
        </td>
      </>)}
      {nightCollapsed ? (
        <td className="border-b border-line bg-night-soft group-hover:bg-[#EEF2FD] transition-colors align-middle" style={{ width: 26 }} />
      ) : (<>
        <td className={`${cellCls("nightWorkers")} bg-night-cell group-hover:bg-[#EEF2FD] transition-colors align-middle`} onMouseDown={(e) => onCellMouseDown(e, "nightWorkers", machine.id)} onMouseEnter={() => onCellEnter("nightWorkers", machine.id)} onClick={(e) => onSelectCell("nightWorkers", machine.id, e.shiftKey)} style={selStyle("nightWorkers")}>
          <EmployeeMultiSelect candidates={activeWorkers} selectedIds={entry.nightShift.workers} editable={editable} onChange={(ids) => updNight({ workers: ids })} dragContext={{ machineId: machine.id, colKey: "nightWorkers" }} isDropTarget onDropEmployee={(p) => onDropEmployee("nightWorkers", p)} />
        </td>
        <td className={`${cellCls("nightOT")} bg-night-cell group-hover:bg-[#EEF2FD] transition-colors text-center align-middle`} onMouseDown={(e) => onCellMouseDown(e, "nightOT", machine.id)} onMouseEnter={() => onCellEnter("nightOT", machine.id)} onClick={(e) => onSelectCell("nightOT", machine.id, e.shiftKey)} style={selStyle("nightOT")}>
          <ShiftOvertimeBadge hours={entry.nightShift.overtimeHours || 0} workerCount={entry.nightShift.workers.length} editable={editable} onChange={(h) => updNight({ overtimeHours: h })} />
        </td>
        <td className={`${cellCls("nightTech")} bg-night-cell group-hover:bg-[#EEF2FD] transition-colors align-middle`} onMouseDown={(e) => onCellMouseDown(e, "nightTech", machine.id)} onMouseEnter={() => onCellEnter("nightTech", machine.id)} onClick={(e) => onSelectCell("nightTech", machine.id, e.shiftKey)} style={selStyle("nightTech")}>
          <EmployeeMultiSelect candidates={techniciansPool} selectedIds={entry.nightShift.technicians} editable={editable} onChange={(ids) => updNight({ technicians: ids })} dragContext={{ machineId: machine.id, colKey: "nightTech" }} isDropTarget onDropEmployee={(p) => onDropEmployee("nightTech", p)} />
        </td>
        <td className={`${cellCls("nightOther")} bg-night-cell group-hover:bg-[#EEF2FD] transition-colors !border-r-0 align-middle`} onMouseDown={(e) => onCellMouseDown(e, "nightOther", machine.id)} onMouseEnter={() => onCellEnter("nightOther", machine.id)} onClick={(e) => onSelectCell("nightOther", machine.id, e.shiftKey)} style={selStyle("nightOther")}>
          <EmployeeMultiSelect candidates={supportPool} selectedIds={entry.nightShift.otherWorkers} editable={editable} onChange={(ids) => updNight({ otherWorkers: ids })} dragContext={{ machineId: machine.id, colKey: "nightOther" }} isDropTarget onDropEmployee={(p) => onDropEmployee("nightOther", p)} />
        </td>
      </>)}
    </tr>
  );
}
