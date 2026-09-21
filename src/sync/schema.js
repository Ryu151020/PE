/* Maps the in-memory db onto Google Sheets tabs.
   `cols` = the human-readable columns written next to the JSON (column I onward in the sheet). */
const str = (v) => (v === null || v === undefined ? "" : String(v));

export const COLLECTIONS = [
  { key: "employees", sheet: "employees", cols: (r) => ({ employeeCode: r.employeeCode, vietnameseName: r.vietnameseName, chineseName: str(r.chineseName), position: r.position, status: r.status, joinDate: str(r.joinDate), resignDate: str(r.resignDate), resignReason: str(r.resignReason), phone: str(r.phone) }) },
  { key: "molds", sheet: "molds", cols: (r) => ({ moldName: r.moldName, status: r.status, notes: str(r.notes) }) },
  { key: "orders", sheet: "orders", cols: (r) => ({ orderCode: r.orderCode, moldId: str(r.moldId), size: str(r.size), filmRollName: str(r.filmRollName), completed: r.completed ? "TRUE" : "FALSE" }) },
  { key: "machines", sheet: "machines", cols: (r) => ({ machineCode: str(r.machineCode), machineName: str(r.machineName), status: r.status, moldId: str(r.moldId), currentOrderId: str(r.currentOrderId) }) },
];

export function scheduleCols(key, day) {
  if (!day) return { date: key, status: "" };
  const entries = Object.values(day.entries || {});
  return {
    date: key, status: str(day.status), dayLeader: str(day.dayLeader), nightLeader: str(day.nightLeader),
    machinesDayWorkers: entries.filter((e) => e.dayShift && e.dayShift.workers.length > 0).length,
    machinesNightWorkers: entries.filter((e) => e.nightShift && e.nightShift.workers.length > 0).length,
    updatedBy: str(day.updatedBy), updatedAt: str(day.updatedAt),
  };
}
