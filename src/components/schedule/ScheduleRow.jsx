import { EmployeeMultiSelect } from "./EmployeeChip";
import { ShiftOvertimeBadge } from "./ShiftOvertimeBadge";
import { StackedStatusBadge } from "../ui/Badges";
import { MACHINE_STATUS_COLOR, MACHINE_STATUS_DEFS, MACHINE_STATUS_TEXT_COLOR } from "../../lib/constants";
import { inputCls } from "../../lib/styles";
import { entryMachineStatus } from "../../lib/schedule";

export function ScheduleRow({ machine, entry, molds, orders, ordersById, editable, activeWorkers, techniciansPool, supportPool, onPatchEntry, selection, onSelectCell, onCellMouseDown, onCellEnter, onDropEmployee, employeesById, dayCollapsed, nightCollapsed }) {
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
  const cellCls = (colKey) => `border-r border-b border-line px-2 py-1.5 align-top ${selected(colKey) ? "bg-brand-tint" : ""}`;
  const updDay = (patch) => onPatchEntry({ dayShift: { ...entry.dayShift, ...patch } });
  const updNight = (patch) => onPatchEntry({ nightShift: { ...entry.nightShift, ...patch } });
  const machineStatus = entryMachineStatus(entry, machine);
  const st = MACHINE_STATUS_DEFS[machineStatus];
  const handleOrderChange = (orderId) => {
    const order = orderId ? ordersById[orderId] : null;
    // Only the film roll follows the order — the mold stays whatever was picked for this machine (any mold can run any order).
    onPatchEntry({ orderId: orderId || null, filmRollName: order ? order.filmRollName : entry.filmRollName });
  };
  const currentOrder = entry.orderId ? ordersById[entry.orderId] : null;
  const orderLabel = (o) => `${o.orderCode}${o.size ? ` (Size ${o.size})` : ""}`;
  return (
    <tr className="hover:bg-canvas text-sm">
      <td className="z-10 bg-white border-r border-b border-line px-2 py-1.5 text-center text-mute font-bold" style={{ position: "sticky", left: L0, width: W0, minWidth: W0, maxWidth: W0 }}>{machine.machineNumber}</td>
      <td className={`z-10 bg-white border-r border-b border-line px-2 py-1.5 `} style={{ position: "sticky", left: L1, width: W1, minWidth: W1, maxWidth: W1, ...selStickyStyle("machineStatus") }} onMouseDown={(e) => onCellMouseDown(e, "machineStatus", machine.id)} onMouseEnter={() => onCellEnter("machineStatus", machine.id)} onClick={(e) => onSelectCell("machineStatus", machine.id, e.shiftKey)}>
        {editable ? (
          <select className="rad-6 border font-bold text-xs py-1 px-1 w-full" style={{ borderColor: MACHINE_STATUS_TEXT_COLOR[machineStatus], color: MACHINE_STATUS_TEXT_COLOR[machineStatus] }} value={machineStatus} onChange={(e) => onPatchEntry({ machineStatus: e.target.value })}>
            {Object.entries(MACHINE_STATUS_DEFS).map(([k, v]) => <option key={k} value={k}>{v.vi}</option>)}
          </select>
        ) : (<StackedStatusBadge vi={st.vi} zh={st.zh} className={MACHINE_STATUS_COLOR[machineStatus]} />)}
      </td>
      <td className={`z-10 bg-white border-r border-b border-line px-2 py-1.5 `} style={{ position: "sticky", left: L2, width: W2, minWidth: W2, maxWidth: W2, ...selStickyStyle("mold", "8px 0 8px -8px rgba(112,144,176,0.28)") }} onMouseDown={(e) => onCellMouseDown(e, "mold", machine.id)} onMouseEnter={() => onCellEnter("mold", machine.id)} onClick={(e) => onSelectCell("mold", machine.id, e.shiftKey)}>
        {editable ? (<select className={`${inputCls} v-input--sm`} value={entry.moldId || ""} onChange={(e) => onPatchEntry({ moldId: e.target.value || null })}><option value="">— Chưa gán / 未指定 —</option>{molds.map((m) => <option key={m.id} value={m.id}>{m.moldName}</option>)}</select>) : (<span className="text-xs font-medium text-ink">{molds.find((m) => m.id === entry.moldId)?.moldName || "—"}</span>)}
      </td>
      <td className={cellCls("order")} onMouseDown={(e) => onCellMouseDown(e, "order", machine.id)} onMouseEnter={() => onCellEnter("order", machine.id)} onClick={(e) => onSelectCell("order", machine.id, e.shiftKey)} style={selStyle("order")}>
        {editable ? (
          <select className={`${inputCls} v-input--sm`} value={entry.orderId || ""} onChange={(e) => handleOrderChange(e.target.value)}>
            <option value="">— Chưa gán / 未指定 —</option>
            {orders.filter((o) => !o.completed || o.id === entry.orderId).map((o) => (
              <option key={o.id} value={o.id} disabled={o.completed}>{orderLabel(o)}{o.completed ? " — đã hoàn thiện (khóa)" : ""}</option>
            ))}
          </select>
        ) : (<span className="text-xs text-body">{currentOrder ? orderLabel(currentOrder) : "—"}</span>)}
      </td>
      <td className={cellCls("filmRoll")} onMouseDown={(e) => onCellMouseDown(e, "filmRoll", machine.id)} onMouseEnter={() => onCellEnter("filmRoll", machine.id)} onClick={(e) => onSelectCell("filmRoll", machine.id, e.shiftKey)} style={selStyle("filmRoll")}>
        {editable ? (<input className={`${inputCls} v-input--sm`} value={entry.filmRollName || ""} onChange={(e) => onPatchEntry({ filmRollName: e.target.value })} />) : (<span className="text-xs text-body">{entry.filmRollName || "—"}</span>)}
      </td>
      {dayCollapsed ? (
        <td className="border-r border-b border-line bg-day-soft" style={{ width: 26 }} />
      ) : (<>
        <td className={`${cellCls("dayWorkers")} bg-day-cell`} onMouseDown={(e) => onCellMouseDown(e, "dayWorkers", machine.id)} onMouseEnter={() => onCellEnter("dayWorkers", machine.id)} onClick={(e) => onSelectCell("dayWorkers", machine.id, e.shiftKey)} style={selStyle("dayWorkers")}>
          <EmployeeMultiSelect candidates={activeWorkers} selectedIds={entry.dayShift.workers} editable={editable} onChange={(ids) => updDay({ workers: ids })} dragContext={{ machineId: machine.id, colKey: "dayWorkers" }} isDropTarget onDropEmployee={(p) => onDropEmployee("dayWorkers", p)} />
        </td>
        <td className={`${cellCls("dayOT")} bg-day-cell text-center`} onMouseDown={(e) => onCellMouseDown(e, "dayOT", machine.id)} onMouseEnter={() => onCellEnter("dayOT", machine.id)} onClick={(e) => onSelectCell("dayOT", machine.id, e.shiftKey)} style={selStyle("dayOT")}>
          <ShiftOvertimeBadge hours={entry.dayShift.overtimeHours || 0} workerCount={entry.dayShift.workers.length} editable={editable} onChange={(h) => updDay({ overtimeHours: h })} />
        </td>
        <td className={`${cellCls("dayTech")} bg-day-cell`} onMouseDown={(e) => onCellMouseDown(e, "dayTech", machine.id)} onMouseEnter={() => onCellEnter("dayTech", machine.id)} onClick={(e) => onSelectCell("dayTech", machine.id, e.shiftKey)} style={selStyle("dayTech")}>
          <EmployeeMultiSelect candidates={techniciansPool} selectedIds={entry.dayShift.technicians} editable={editable} onChange={(ids) => updDay({ technicians: ids })} dragContext={{ machineId: machine.id, colKey: "dayTech" }} isDropTarget onDropEmployee={(p) => onDropEmployee("dayTech", p)} />
        </td>
        <td className={`${cellCls("dayOther")} bg-day-cell`} onMouseDown={(e) => onCellMouseDown(e, "dayOther", machine.id)} onMouseEnter={() => onCellEnter("dayOther", machine.id)} onClick={(e) => onSelectCell("dayOther", machine.id, e.shiftKey)} style={selStyle("dayOther")}>
          <EmployeeMultiSelect candidates={supportPool} selectedIds={entry.dayShift.otherWorkers} editable={editable} onChange={(ids) => updDay({ otherWorkers: ids })} dragContext={{ machineId: machine.id, colKey: "dayOther" }} isDropTarget onDropEmployee={(p) => onDropEmployee("dayOther", p)} />
        </td>
      </>)}
      {nightCollapsed ? (
        <td className="border-b border-line bg-night-soft" style={{ width: 26 }} />
      ) : (<>
        <td className={`${cellCls("nightWorkers")} bg-night-cell`} onMouseDown={(e) => onCellMouseDown(e, "nightWorkers", machine.id)} onMouseEnter={() => onCellEnter("nightWorkers", machine.id)} onClick={(e) => onSelectCell("nightWorkers", machine.id, e.shiftKey)} style={selStyle("nightWorkers")}>
          <EmployeeMultiSelect candidates={activeWorkers} selectedIds={entry.nightShift.workers} editable={editable} onChange={(ids) => updNight({ workers: ids })} dragContext={{ machineId: machine.id, colKey: "nightWorkers" }} isDropTarget onDropEmployee={(p) => onDropEmployee("nightWorkers", p)} />
        </td>
        <td className={`${cellCls("nightOT")} bg-night-cell text-center`} onMouseDown={(e) => onCellMouseDown(e, "nightOT", machine.id)} onMouseEnter={() => onCellEnter("nightOT", machine.id)} onClick={(e) => onSelectCell("nightOT", machine.id, e.shiftKey)} style={selStyle("nightOT")}>
          <ShiftOvertimeBadge hours={entry.nightShift.overtimeHours || 0} workerCount={entry.nightShift.workers.length} editable={editable} onChange={(h) => updNight({ overtimeHours: h })} />
        </td>
        <td className={`${cellCls("nightTech")} bg-night-cell`} onMouseDown={(e) => onCellMouseDown(e, "nightTech", machine.id)} onMouseEnter={() => onCellEnter("nightTech", machine.id)} onClick={(e) => onSelectCell("nightTech", machine.id, e.shiftKey)} style={selStyle("nightTech")}>
          <EmployeeMultiSelect candidates={techniciansPool} selectedIds={entry.nightShift.technicians} editable={editable} onChange={(ids) => updNight({ technicians: ids })} dragContext={{ machineId: machine.id, colKey: "nightTech" }} isDropTarget onDropEmployee={(p) => onDropEmployee("nightTech", p)} />
        </td>
        <td className={`${cellCls("nightOther")} bg-night-cell !border-r-0`} onMouseDown={(e) => onCellMouseDown(e, "nightOther", machine.id)} onMouseEnter={() => onCellEnter("nightOther", machine.id)} onClick={(e) => onSelectCell("nightOther", machine.id, e.shiftKey)} style={selStyle("nightOther")}>
          <EmployeeMultiSelect candidates={supportPool} selectedIds={entry.nightShift.otherWorkers} editable={editable} onChange={(ids) => updNight({ otherWorkers: ids })} dragContext={{ machineId: machine.id, colKey: "nightOther" }} isDropTarget onDropEmployee={(p) => onDropEmployee("nightOther", p)} />
        </td>
      </>)}
    </tr>
  );
}
