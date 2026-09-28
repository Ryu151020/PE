import * as XLSX from "xlsx";
import {
  EMP_STATUS, EMP_STATUS_DEFS, MACHINE_STATUS_DEFS, MOLD_STATUS, MOLD_STATUS_DEFS, PLAN_STATUS,
  POSITION_LIST,
} from "./constants";
import { toKey } from "./dates";
import { byId } from "./schedule";

export function parseCsvText(text) {
  return text.split(/\r?\n/).filter((l) => l.trim()).map((line) => { const cells = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === "," || ch === "\t") { cells.push(cur); cur = ""; } else cur += ch; } cells.push(cur); return cells; });
}

/* ============================================================
   DATA PAGE — Excel export/import (multi-sheet, via SheetJS)
   ============================================================ */
export function normalizeDateCell(v) {
  if (!v) return "";
  if (v instanceof Date) return toKey(v);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return s;
}

export function exportWorkbook(db, fromKeyStr, toKeyStr) {
  const moldsById = byId(db.molds);
  const employeesById = byId(db.employees);
  const wb = XLSX.utils.book_new();

  const moldRows = db.molds.map((m) => ({ "Mã khuôn": m.id, "Tên khuôn": m.moldName, "Trạng thái": m.status, "Ghi chú": m.notes || "" }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(moldRows), "Khuôn máy");

  const orderRows = db.orders.map((o) => ({ "Mã đơn hàng": o.orderCode, "Khuôn": moldsById[o.moldId]?.moldName || "", "Size": o.size || "", "Tên cuộn màng": o.filmRollName || "", "Trạng thái": o.completed ? "Đã hoàn thiện" : "Đang xử lý" }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Đơn hàng");

  const empRows = db.employees.map((e) => ({ "Mã NV": e.employeeCode, "Tên VN": e.vietnameseName, "Tên Trung": e.chineseName || "", "Năm sinh": e.birthYear, "SĐT": e.phone, "Địa chỉ": e.address, "Ngày vào làm": e.joinDate, "Ngày rời đi": e.resignDate || "", "Lý do nghỉ": e.resignReason || "", "Vị trí": e.position, "Trạng thái": e.status }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), "Nhân sự");

  const schedRows = [];
  Object.entries(db.schedules).sort(([a], [b]) => (a < b ? -1 : 1)).forEach(([date, day]) => {
    if (!day) return;
    if (fromKeyStr && date < fromKeyStr) return;
    if (toKeyStr && date > toKeyStr) return;
    db.machines.forEach((m) => {
      const entry = day.entries[m.id];
      if (!entry) return;
      const codes = (ids) => (ids || []).map((id) => { const e = employeesById[id]; return e ? `${e.employeeCode}(${e.vietnameseName})` : null; }).filter(Boolean).join("; ");
      schedRows.push({
        "Ngày": date, "Máy": m.machineNumber, "Trạng thái máy": MACHINE_STATUS_DEFS[entry.machineStatus || m.status]?.vi || entry.machineStatus || m.status,
        "Khuôn": moldsById[entry.moldId]?.moldName || "", "Đơn hàng": db.orders.find((o) => o.id === entry.orderId)?.orderCode || "", "Cuộn màng": entry.filmRollName || "",
        "Công nhân ca ngày": codes(entry.dayShift.workers), "Tăng ca ca ngày": entry.dayShift.overtimeHours || 0, "KTV ca ngày": codes(entry.dayShift.technicians), "Công nhân khác ca ngày": codes(entry.dayShift.otherWorkers),
        "Công nhân ca đêm": codes(entry.nightShift.workers), "Tăng ca ca đêm": entry.nightShift.overtimeHours || 0, "KTV ca đêm": codes(entry.nightShift.technicians), "Công nhân khác ca đêm": codes(entry.nightShift.otherWorkers),
        "Ca trưởng ca ngày": employeesById[day.dayLeader]?.employeeCode || "", "Tổ trưởng ca ngày": codes(day.dayTeamLeaders),
        "Ca trưởng ca đêm": employeesById[day.nightLeader]?.employeeCode || "", "Tổ trưởng ca đêm": codes(day.nightTeamLeaders),
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schedRows), "Kế hoạch");

  XLSX.writeFile(wb, `pe-scheduler-du-lieu_${fromKeyStr || "all"}_${toKeyStr || "all"}.xlsx`);
}

export function parseWorkbook(workbook) {
  const result = { molds: null, orders: null, employees: null, scheduleRows: null };
  if (workbook.SheetNames.includes("Khuôn máy")) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Khuôn máy"]);
    result.molds = rows.map((r, i) => ({ id: String(r["Mã khuôn"] || `MOLD-${Date.now()}-${i}`), moldName: r["Tên khuôn"] || "", status: MOLD_STATUS_DEFS.some((s) => s.vi === r["Trạng thái"]) ? r["Trạng thái"] : MOLD_STATUS.SẴN_SÀNG, notes: r["Ghi chú"] || "" }));
  }
  if (workbook.SheetNames.includes("Đơn hàng")) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Đơn hàng"]);
    const moldByName = {}; (result.molds || []).forEach((m) => { moldByName[m.moldName] = m.id; });
    result.orders = rows.map((r, i) => {
      const code = String(r["Mã đơn hàng"] || "").trim();
      const sz = String(r["Size"] || "").trim();
      return {
        id: `ORD-${code}${sz ? `-${sz}` : ""}-${i}`,
        orderCode: code,
        moldId: moldByName[r["Khuôn"]] || null,
        size: sz,
        filmRollName: r["Tên cuộn màng"] || "",
        completed: r["Trạng thái"] === "Đã hoàn thiện"
      };
    }).filter((o) => o.orderCode);
  }
  if (workbook.SheetNames.includes("Nhân sự")) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Nhân sự"]);
    result.employees = rows.map((r) => ({
      id: String(r["Mã NV"] || ""), employeeCode: String(r["Mã NV"] || ""), vietnameseName: r["Tên VN"] || "", chineseName: r["Tên Trung"] || "",
      birthYear: Number(r["Năm sinh"]) || 2000, phone: String(r["SĐT"] || ""), address: r["Địa chỉ"] || "",
      joinDate: normalizeDateCell(r["Ngày vào làm"]), resignDate: r["Ngày rời đi"] ? normalizeDateCell(r["Ngày rời đi"]) : null, resignReason: r["Lý do nghỉ"] || "",
      position: POSITION_LIST.includes(r["Vị trí"]) ? r["Vị trí"] : POSITION_LIST[0], status: EMP_STATUS_DEFS.some((s) => s.vi === r["Trạng thái"]) ? r["Trạng thái"] : EMP_STATUS.OFFICIAL, notes: "",
    })).filter((e) => e.employeeCode);
  }
  if (workbook.SheetNames.includes("Kế hoạch")) {
    result.scheduleRows = XLSX.utils.sheet_to_json(workbook.Sheets["Kế hoạch"]);
  }
  return result;
}

export function buildSchedulesFromRows(rows, machines, employees, molds, orders) {
  const employeesByCode = {}; employees.forEach((e) => { employeesByCode[e.employeeCode] = e.id; });
  const machineByNumber = {}; machines.forEach((m) => { machineByNumber[m.machineNumber] = m; });
  const moldByName = {}; molds.forEach((m) => { moldByName[m.moldName] = m.id; });
  const orderByCode = {};
  orders.forEach((o) => {
    orderByCode[o.orderCode] = o.id;
    if (o.size) {
      orderByCode[`${o.orderCode} (${o.size})`] = o.id;
      orderByCode[`${o.orderCode} (${o.size.toLowerCase()})`] = o.id;
      orderByCode[`${o.orderCode} ${o.size}`] = o.id;
      orderByCode[`${o.orderCode}_${o.size}`] = o.id;
    }
  });
  const splitCodes = (s) => String(s || "").split(";").map((x) => x.trim()).filter(Boolean).map((token) => token.split("(")[0].trim()).map((code) => employeesByCode[code]).filter(Boolean);
  const statusFromLabel = (label) => (Object.keys(MACHINE_STATUS_DEFS).find((k) => k === label || MACHINE_STATUS_DEFS[k].vi === label)) || null;
  const byDate = {};
  rows.forEach((r) => {
    const date = normalizeDateCell(r["Ngày"]);
    if (!date) return;
    const machine = machineByNumber[Number(r["Máy"])];
    if (!machine) return;
    if (!byDate[date]) byDate[date] = { date, entries: {}, dayLeader: null, dayTeamLeaders: [], nightLeader: null, nightTeamLeaders: [], status: PLAN_STATUS.SAVED, updatedBy: "Nhập từ Excel", updatedAt: new Date().toISOString() };
    const day = byDate[date];
    day.entries[machine.id] = {
      machineId: machine.id, machineStatus: statusFromLabel(r["Trạng thái máy"]) || machine.status, moldId: moldByName[r["Khuôn"]] || null, orderId: orderByCode[r["Đơn hàng"]] || null, filmRollName: r["Cuộn màng"] || "",
      dayShift: { workers: splitCodes(r["Công nhân ca ngày"]), overtimeHours: Number(r["Tăng ca ca ngày"]) || 0, technicians: splitCodes(r["KTV ca ngày"]), otherWorkers: splitCodes(r["Công nhân khác ca ngày"]) },
      nightShift: { workers: splitCodes(r["Công nhân ca đêm"]), overtimeHours: Number(r["Tăng ca ca đêm"]) || 0, technicians: splitCodes(r["KTV ca đêm"]), otherWorkers: splitCodes(r["Công nhân khác ca đêm"]) },
    };
    const dLeader = splitCodes(r["Ca trưởng ca ngày"])[0]; if (dLeader) day.dayLeader = dLeader;
    day.dayTeamLeaders = splitCodes(r["Tổ trưởng ca ngày"]);
    const nLeader = splitCodes(r["Ca trưởng ca đêm"])[0]; if (nLeader) day.nightLeader = nLeader;
    day.nightTeamLeaders = splitCodes(r["Tổ trưởng ca đêm"]);
  });
  return byDate;
}

export function downloadEmployeeTemplate() {
  const wb = XLSX.utils.book_new();
  const sample = [
    {
      "Mã NV": "NV01",
      "Tên VN": "Nguyễn Văn A",
      "Tên Trung": "阮文安",
      "Năm sinh": 1995,
      "SĐT": "0912345678",
      "Địa chỉ": "Hạ Long, Quảng Ninh",
      "Ngày vào làm": "2024-01-15",
      "Ngày rời đi": "",
      "Lý do nghỉ": "",
      "Vị trí": "Công nhân",
      "Trạng thái": "Chính thức",
      "Ghi chú": "Mẫu nhập liệu",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  XLSX.utils.book_append_sheet(wb, ws, "Nhân sự");
  XLSX.writeFile(wb, "mau_nhan_su.xlsx");
}

export function downloadOrderTemplate() {
  const wb = XLSX.utils.book_new();
  const sample = [
    {
      "Mã đơn hàng": "DH-2024-001",
      "Khuôn": "CPE-L",
      "Size": "L",
      "Tên cuộn màng": "MANG-PE-24",
      "Trạng thái": "Đang xử lý",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  XLSX.utils.book_append_sheet(wb, ws, "Đơn hàng");
  XLSX.writeFile(wb, "mau_don_hang.xlsx");
}

export function downloadMoldTemplate() {
  const wb = XLSX.utils.book_new();
  const sample = [
    {
      "Tên khuôn": "CPE-XL",
      "Trạng thái": "Sẵn sàng",
      "Ghi chú": "Khuôn size XL tiêu chuẩn",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  XLSX.utils.book_append_sheet(wb, ws, "Khuôn máy");
  XLSX.writeFile(wb, "mau_khuon_may.xlsx");
}

export function parseAndDedupEmployees(fileBuffer, existingEmployees) {
  const wb = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.includes("Nhân sự") ? "Nhân sự" : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
  const existingCodes = new Set(existingEmployees.map((e) => String(e.employeeCode || "").trim().toLowerCase()));
  const newEmployees = [];
  let skippedCount = 0;

  rows.forEach((r, idx) => {
    const code = String(r["Mã NV"] || r["employeeCode"] || "").trim();
    const vnName = String(r["Tên VN"] || r["vietnameseName"] || "").trim();
    if (!code || !vnName) return;

    if (existingCodes.has(code.toLowerCase())) {
      skippedCount++;
      return;
    }

    existingCodes.add(code.toLowerCase());
    newEmployees.push({
      id: code,
      employeeCode: code,
      vietnameseName: vnName,
      chineseName: String(r["Tên Trung"] || r["chineseName"] || "").trim(),
      birthYear: Number(r["Năm sinh"] || r["birthYear"]) || 2000,
      phone: String(r["SĐT"] || r["phone"] || "").trim(),
      address: String(r["Địa chỉ"] || r["address"] || "").trim(),
      joinDate: normalizeDateCell(r["Ngày vào làm"] || r["joinDate"]) || new Date().toISOString().slice(0, 10),
      resignDate: r["Ngày rời đi"] ? normalizeDateCell(r["Ngày rời đi"]) : null,
      resignReason: String(r["Lý do nghỉ"] || r["resignReason"] || "").trim(),
      position: POSITION_LIST.includes(r["Vị trí"]) ? r["Vị trí"] : POSITION_LIST[0],
      status: EMP_STATUS_DEFS.some((s) => s.vi === r["Trạng thái"]) ? r["Trạng thái"] : EMP_STATUS.OFFICIAL,
      notes: String(r["Ghi chú"] || r["notes"] || "").trim(),
    });
  });

  return { added: newEmployees, addedCount: newEmployees.length, skippedCount };
}

export function parseAndDedupOrders(fileBuffer, existingOrders, molds = []) {
  const wb = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.includes("Đơn hàng") ? "Đơn hàng" : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
  const moldByName = {};
  molds.forEach((m) => {
    moldByName[m.moldName.trim().toLowerCase()] = m.id;
  });

  const getOrderKey = (code, size) =>
    `${String(code || "").trim().toLowerCase()}___${String(size || "").trim().toLowerCase()}`;

  const existingKeys = new Set(
    existingOrders.map((o) => getOrderKey(o.orderCode, o.size))
  );
  const newOrders = [];
  let skippedCount = 0;

  rows.forEach((r, idx) => {
    const code = String(r["Mã đơn hàng"] || r["orderCode"] || "").trim();
    if (!code) return;
    const size = String(r["Size"] || r["size"] || "").trim();
    const key = getOrderKey(code, size);

    if (existingKeys.has(key)) {
      skippedCount++;
      return;
    }

    existingKeys.add(key);
    const moldRaw = String(r["Khuôn"] || r["moldName"] || "").trim().toLowerCase();
    const moldId = moldByName[moldRaw] || null;

    newOrders.push({
      id: `ORD-${code}${size ? `-${size}` : ""}-${Date.now()}-${idx}`,
      orderCode: code,
      moldId,
      size,
      filmRollName: String(r["Tên cuộn màng"] || r["Cuộn màng"] || r["filmRollName"] || "").trim(),
      completed: String(r["Trạng thái"] || "").trim() === "Đã hoàn thiện",
    });
  });

  return { added: newOrders, addedCount: newOrders.length, skippedCount };
}

export function parseAndDedupMolds(fileBuffer, existingMolds) {
  const wb = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.includes("Khuôn máy") ? "Khuôn máy" : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
  const existingNames = new Set(existingMolds.map((m) => String(m.moldName || "").trim().toLowerCase()));
  const newMolds = [];
  let skippedCount = 0;

  rows.forEach((r, idx) => {
    const name = String(r["Tên khuôn"] || r["moldName"] || "").trim();
    if (!name) return;

    if (existingNames.has(name.toLowerCase())) {
      skippedCount++;
      return;
    }

    existingNames.add(name.toLowerCase());
    const id = `MOLD-${Date.now()}-${idx}`;
    newMolds.push({
      id,
      moldName: name,
      status: MOLD_STATUS_DEFS.some((s) => s.vi === r["Trạng thái"]) ? r["Trạng thái"] : MOLD_STATUS.SẴN_SÀNG,
      notes: String(r["Ghi chú"] || r["notes"] || "").trim(),
    });
  });

  return { added: newMolds, addedCount: newMolds.length, skippedCount };
}

