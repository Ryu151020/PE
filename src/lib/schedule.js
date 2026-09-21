import { EMP_STATUS, MACHINE_STATUS, PLAN_STATUS, POSITIONS, isActive } from "./constants";

/* ============================================================
   DOMAIN HELPERS
   ============================================================ */
export function byId(list) { const m = {}; list.forEach((x) => (m[x.id] = x)); return m; }

export function isSchedulableOn(emp, dateKey) {
  if (!emp) return false;
  if (emp.status !== EMP_STATUS.RESIGNED) return true;
  if (emp.resignDate) return dateKey < emp.resignDate;
  return false;
}

/* Machine status is stored PER DAY (entry.machineStatus) so changing it on one date never touches other dates.
   Older saved days without the field fall back to the machine's default status. */
export function entryMachineStatus(entry, machine) { return (entry && entry.machineStatus) || machine.status; }

/* Freeze every entry's status into the day (used on save) so the day no longer depends on the machine default. */
export function withMachineStatus(day, machines) {
  if (!day) return day;
  const entries = { ...day.entries };
  machines.forEach((m) => { const e = entries[m.id]; if (e && !e.machineStatus) entries[m.id] = { ...e, machineStatus: m.status }; });
  return { ...day, entries };
}

export function emptyEntryFor(machine) {
  return { machineId: machine.id, machineStatus: machine.status, moldId: machine.moldId || null, orderId: machine.currentOrderId || null, filmRollName: "", dayShift: { workers: [], overtimeHours: 0, technicians: [], otherWorkers: [] }, nightShift: { workers: [], overtimeHours: 0, technicians: [], otherWorkers: [] } };
}

export function emptyDay(dateKey, machines) {
  const entries = {}; machines.forEach((m) => (entries[m.id] = emptyEntryFor(m)));
  return { date: dateKey, entries, dayLeader: null, dayTeamLeaders: [], nightLeader: null, nightTeamLeaders: [], status: PLAN_STATUS.DRAFT, updatedBy: null, updatedAt: null };
}

export function computeKpis(day, machines, employees) {
  const total = machines.length;
  const totalSlots = total * 2; // day slots + night slots (e.g. 41 + 41 = 82)
  // A machine only counts as "open" for a shift when its status is OPEN AND that shift actually has a worker assigned.
  const dayRunning = day ? machines.filter((m) => day.entries[m.id]?.dayShift.workers.length > 0).length : 0;
  const nightRunning = day ? machines.filter((m) => day.entries[m.id]?.nightShift.workers.length > 0).length : 0;
  const openDay = day ? machines.filter((m) => entryMachineStatus(day.entries[m.id], m) === MACHINE_STATUS.OPEN && day.entries[m.id]?.dayShift.workers.length > 0).length : 0;
  const openNight = day ? machines.filter((m) => entryMachineStatus(day.entries[m.id], m) === MACHINE_STATUS.OPEN && day.entries[m.id]?.nightShift.workers.length > 0).length : 0;
  // A machine counts as "stopped" for a shift whenever that shift has no worker assigned, regardless of the status column.
  const stoppedDay = total - dayRunning;
  const stoppedNight = total - nightRunning;
  const open = openDay + openNight;
  const stopped = stoppedDay + stoppedNight;

  const totalActiveEmployees = employees ? employees.filter((e) => isActive(e)).length : 0;
  const employeesById = byId(employees || []);
  const dayIds = new Set(), nightIds = new Set();
  if (day) {
    Object.values(day.entries).forEach((entry) => {
      [...entry.dayShift.workers, ...entry.dayShift.technicians, ...entry.dayShift.otherWorkers].forEach((id) => dayIds.add(id));
      [...entry.nightShift.workers, ...entry.nightShift.technicians, ...entry.nightShift.otherWorkers].forEach((id) => nightIds.add(id));
    });
    if (day.dayLeader) dayIds.add(day.dayLeader);
    (day.dayTeamLeaders || []).forEach((id) => dayIds.add(id));
    if (day.nightLeader) nightIds.add(day.nightLeader);
    (day.nightTeamLeaders || []).forEach((id) => nightIds.add(id));
  }
  const workingIds = new Set([...dayIds, ...nightIds]);
  const workingToday = workingIds.size;
  const byPosition = { [POSITIONS.WORKER]: 0, [POSITIONS.TECHNICIAN]: 0, [POSITIONS.SUPPORT]: 0, [POSITIONS.TEAM_LEADER]: 0, [POSITIONS.SHIFT_LEADER]: 0 };
  workingIds.forEach((id) => { const e = employeesById[id]; if (e && byPosition[e.position] !== undefined) byPosition[e.position]++; });

  return { total, totalSlots, open, stopped, dayRunning, nightRunning, openDay, openNight, stoppedDay, stoppedNight, totalActiveEmployees, dayHeadcount: dayIds.size, nightHeadcount: nightIds.size, workingToday, byPosition };
}

export function moldsOpenByOrderAndMold(day, machines) {
  if (!day) return [];
  const counts = {};
  machines.forEach((m) => {
    const entry = day.entries[m.id];
    if (entryMachineStatus(entry, m) !== MACHINE_STATUS.OPEN) return;
    const orderId = entry?.orderId || m.currentOrderId;
    const moldId = entry?.moldId || m.moldId;
    if (!orderId) return;
    const key = `${orderId}|${moldId || "none"}`;
    if (!counts[key]) counts[key] = { orderId, moldId, count: 0 };
    counts[key].count++;
  });
  return Object.values(counts).sort((a, b) => b.count - a.count);
}

export function copySchedule({ sourceDay, targetDateKey, machines, employeesById, options }) {
  const { copyMachines = true, copyOrders = true, copyWorkers = true, copyTechnicians = true, copyOtherWorkers = true, copyOvertime = true, copyLeaders = true } = options || {};
  const filterSched = (ids) => (ids || []).filter((id) => isSchedulableOn(employeesById[id], targetDateKey));
  const entries = {};
  machines.forEach((m) => {
    const src = sourceDay?.entries?.[m.id];
    const base = emptyEntryFor(m);
    if (!src) { entries[m.id] = base; return; }
    const dW = copyWorkers ? filterSched(src.dayShift.workers) : [];
    const nW = copyWorkers ? filterSched(src.nightShift.workers) : [];
    entries[m.id] = {
      machineId: m.id, machineStatus: copyMachines ? (src.machineStatus || m.status) : base.machineStatus, moldId: copyMachines ? src.moldId : base.moldId, orderId: copyOrders ? src.orderId : base.orderId, filmRollName: copyOrders ? src.filmRollName : "",
      dayShift: { workers: dW, overtimeHours: copyOvertime && dW.length > 0 ? src.dayShift.overtimeHours : 0, technicians: copyTechnicians ? filterSched(src.dayShift.technicians) : [], otherWorkers: copyOtherWorkers ? filterSched(src.dayShift.otherWorkers) : [] },
      nightShift: { workers: nW, overtimeHours: copyOvertime && nW.length > 0 ? src.nightShift.overtimeHours : 0, technicians: copyTechnicians ? filterSched(src.nightShift.technicians) : [], otherWorkers: copyOtherWorkers ? filterSched(src.nightShift.otherWorkers) : [] },
    };
  });
  return { date: targetDateKey, entries, dayLeader: copyLeaders ? filterSched([sourceDay?.dayLeader])[0] || null : null, dayTeamLeaders: copyLeaders ? filterSched(sourceDay?.dayTeamLeaders) : [], nightLeader: copyLeaders ? filterSched([sourceDay?.nightLeader])[0] || null : null, nightTeamLeaders: copyLeaders ? filterSched(sourceDay?.nightTeamLeaders) : [], status: PLAN_STATUS.DRAFT, updatedBy: null, updatedAt: null };
}

export function createHistoryStack(initial, limit = 50) {
  let past = [], present = initial, future = [];
  return {
    get present() { return present; },
    push(next) { past.push(present); if (past.length > limit) past.shift(); present = next; future = []; },
    undo() { if (!past.length) return present; future.unshift(present); present = past.pop(); return present; },
    redo() { if (!future.length) return present; past.push(present); present = future.shift(); return present; },
    canUndo: () => past.length > 0, canRedo: () => future.length > 0,
  };
}

export function getCellValue(entry, colKey) {
  switch (colKey) {
    case "mold": return entry.moldId;
    case "order": return entry.orderId;
    case "filmRoll": return entry.filmRollName;
    case "dayOT": return entry.dayShift.overtimeHours || 0;
    case "nightOT": return entry.nightShift.overtimeHours || 0;
    case "dayWorkers": return entry.dayShift.workers;
    case "dayTech": return entry.dayShift.technicians;
    case "dayOther": return entry.dayShift.otherWorkers;
    case "nightWorkers": return entry.nightShift.workers;
    case "nightTech": return entry.nightShift.technicians;
    case "nightOther": return entry.nightShift.otherWorkers;
    default: return null;
  }
}

export function applyCellValue(entry, colKey, value, dateKey, employeesById, claimed) {
  const filterIds = (ids) => { const kept = [], skipped = []; (ids || []).forEach((id) => { const e = employeesById[id]; if (!e || !isSchedulableOn(e, dateKey)) { skipped.push({ id, reason: "đã nghỉ việc" }); return; } kept.push(id); }); return { kept, skipped }; };
  switch (colKey) {
    case "mold": return { entry: { ...entry, moldId: value || null }, skipped: [] };
    case "order": return { entry: { ...entry, orderId: value || null }, skipped: [] };
    case "filmRoll": return { entry: { ...entry, filmRollName: value || "" }, skipped: [] };
    case "dayOT": return { entry: { ...entry, dayShift: { ...entry.dayShift, overtimeHours: Number(value) || 0 } }, skipped: [] };
    case "nightOT": return { entry: { ...entry, nightShift: { ...entry.nightShift, overtimeHours: Number(value) || 0 } }, skipped: [] };
    case "dayWorkers": case "nightWorkers": {
      const shiftKey = colKey === "dayWorkers" ? "dayShift" : "nightShift";
      const { kept: sched, skipped: rSkip } = filterIds(value);
      const kept = [], dSkip = [];
      sched.forEach((id) => { if (claimed[colKey].has(id)) { dSkip.push({ id, reason: "trùng ca với máy khác trong lượt dán này" }); return; } claimed[colKey].add(id); kept.push(id); });
      return { entry: { ...entry, [shiftKey]: { ...entry[shiftKey], workers: kept } }, skipped: [...rSkip, ...dSkip] };
    }
    case "dayTech": case "nightTech": { const shiftKey = colKey === "dayTech" ? "dayShift" : "nightShift"; const { kept, skipped } = filterIds(value); return { entry: { ...entry, [shiftKey]: { ...entry[shiftKey], technicians: kept } }, skipped }; }
    case "dayOther": case "nightOther": { const shiftKey = colKey === "dayOther" ? "dayShift" : "nightShift"; const { kept, skipped } = filterIds(value); return { entry: { ...entry, [shiftKey]: { ...entry[shiftKey], otherWorkers: kept } }, skipped }; }
    default: return { entry, skipped: [] };
  }
}

export function removeFromColumn(entry, colKey, employeeId) {
  switch (colKey) {
    case "dayWorkers": return { ...entry, dayShift: { ...entry.dayShift, workers: entry.dayShift.workers.filter((id) => id !== employeeId) } };
    case "nightWorkers": return { ...entry, nightShift: { ...entry.nightShift, workers: entry.nightShift.workers.filter((id) => id !== employeeId) } };
    case "dayTech": return { ...entry, dayShift: { ...entry.dayShift, technicians: entry.dayShift.technicians.filter((id) => id !== employeeId) } };
    case "nightTech": return { ...entry, nightShift: { ...entry.nightShift, technicians: entry.nightShift.technicians.filter((id) => id !== employeeId) } };
    case "dayOther": return { ...entry, dayShift: { ...entry.dayShift, otherWorkers: entry.dayShift.otherWorkers.filter((id) => id !== employeeId) } };
    case "nightOther": return { ...entry, nightShift: { ...entry.nightShift, otherWorkers: entry.nightShift.otherWorkers.filter((id) => id !== employeeId) } };
    default: return entry;
  }
}

export function addToColumn(entry, colKey, employeeId) {
  const has = (arr) => arr.includes(employeeId);
  switch (colKey) {
    case "dayWorkers": return has(entry.dayShift.workers) ? entry : { ...entry, dayShift: { ...entry.dayShift, workers: [...entry.dayShift.workers, employeeId] } };
    case "nightWorkers": return has(entry.nightShift.workers) ? entry : { ...entry, nightShift: { ...entry.nightShift, workers: [...entry.nightShift.workers, employeeId] } };
    case "dayTech": return has(entry.dayShift.technicians) ? entry : { ...entry, dayShift: { ...entry.dayShift, technicians: [...entry.dayShift.technicians, employeeId] } };
    case "nightTech": return has(entry.nightShift.technicians) ? entry : { ...entry, nightShift: { ...entry.nightShift, technicians: [...entry.nightShift.technicians, employeeId] } };
    case "dayOther": return has(entry.dayShift.otherWorkers) ? entry : { ...entry, dayShift: { ...entry.dayShift, otherWorkers: [...entry.dayShift.otherWorkers, employeeId] } };
    case "nightOther": return has(entry.nightShift.otherWorkers) ? entry : { ...entry, nightShift: { ...entry.nightShift, otherWorkers: [...entry.nightShift.otherWorkers, employeeId] } };
    default: return entry;
  }
}

/* Mold-open statistics per shift.
   RULE: one machine row (= one mold set) counts as exactly 1 open mold in a shift when that shift's WORKER column
   contains at least one person — 1 worker or 10 workers both give 1; no worker gives 0.
   Returns totals for the day shift, night shift and both (total = day + night) plus a per-mold breakdown. */
export function countMoldsByShift(day, machines, moldsById) {
  const rows = {};
  let dayTotal = 0, nightTotal = 0;
  if (day) {
    machines.forEach((m) => {
      const entry = day.entries[m.id];
      if (!entry) return;
      const d = entry.dayShift && entry.dayShift.workers && entry.dayShift.workers.length > 0 ? 1 : 0;
      const n = entry.nightShift && entry.nightShift.workers && entry.nightShift.workers.length > 0 ? 1 : 0;
      if (!d && !n) return;
      const moldId = entry.moldId || m.moldId || null;
      const key = moldId || "__none__";
      if (!rows[key]) rows[key] = { key, moldId, moldName: moldId ? (moldsById[moldId] && moldsById[moldId].moldName) || moldId : null, day: 0, night: 0, total: 0 };
      rows[key].day += d; rows[key].night += n; rows[key].total += d + n;
      dayTotal += d; nightTotal += n;
    });
  }
  const list = Object.values(rows).sort((a, b) => b.total - a.total || String(a.moldName).localeCompare(String(b.moldName)));
  return { day: dayTotal, night: nightTotal, total: dayTotal + nightTotal, rows: list };
}
