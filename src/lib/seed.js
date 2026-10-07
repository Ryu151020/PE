import { EMP_STATUS, MACHINE_STATUS, MOLD_STATUS, PLAN_STATUS, POSITIONS, RESIGN_REASONS, isActive } from "./constants.js";
import { TODAY_KEY, addDaysKey, pad2 } from "./dates.js";

/* ============================================================
   SEED DATA
   ============================================================ */
export const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Trương", "Bàn", "Lâm"];

export const DEM = ["Văn", "Thị", "Đức", "Minh", "Ngọc", "Thanh", "Hữu", "Xuân", "Thu", "Trung"];

export const TEN = ["Hương", "Vui", "Thúy", "Trung", "Hiếu", "Giang", "Sơn", "Linh", "Luyến", "Hoa", "An", "Bình", "Cường", "Dung", "Phương", "Giàu", "Hạnh", "Khang", "Loan", "Mai", "Nga", "Oanh", "Phúc", "Quân", "Sương", "Tâm", "Uyên", "Vy", "Yến", "Anh", "Chi", "Diệp", "Phong", "Hằng", "Kiên", "Lộc", "Mến", "Nhung", "Phú", "Quý", "Sáng", "Thảo", "Út"];

export const CN_SUR = { Nguyễn: "阮", Trần: "陈", Lê: "黎", Phạm: "范", Hoàng: "黄", Huỳnh: "黄", Phan: "潘", Vũ: "武", Võ: "武", Đặng: "邓", Bùi: "裴", Đỗ: "杜", Hồ: "胡", Ngô: "吴", Dương: "杨", Lý: "李", Đinh: "丁", Trương: "张", Bàn: "盘", Lâm: "林" };

export const pick = (arr, i) => arr[i % arr.length];

export const vnName = (i) => `${pick(HO, i)} ${pick(DEM, Math.floor(i / 3))} ${pick(TEN, i)}`;

export const cnName = (vn, i) => { if (i % 5 === 0) return ""; const surname = CN_SUR[vn.split(" ")[0]] || "阮"; return `${surname}${pick(["氏香", "氏兰", "文强", "氏美", "德全", "氏花", "玉英", "成公", "氏秋", "海燕"], i)}`; };

export function createBlankDb() {
  const machines = [];
  for (let i = 0; i < 41; i++) {
    const machineNumber = i + 1;
    const machineCode = `M${pad2(machineNumber)}`;
    machines.push({
      id: machineCode,
      machineNumber,
      machineCode,
      moldId: null,
      currentOrderId: null,
      status: MACHINE_STATUS.OPEN,
      operatorCount: 0,
      technicianCount: 0,
      otherCount: 0,
      notes: "",
    });
  }
  return { employees: [], machines, molds: [], orders: [], schedules: {} };
}

export function seedData() {
  const employees = [];
  const total = 55;
  for (let i = 0; i < total; i++) {
    const vn = vnName(i);
    const employeeCode = `NV${pad2(i + 1)}`;
    let position = POSITIONS.WORKER;
    if (i === 0 || i === 1) position = POSITIONS.SHIFT_LEADER;
    else if (i >= 2 && i < 6) position = POSITIONS.TEAM_LEADER;
    else if (i >= 6 && i < 12) position = POSITIONS.TECHNICIAN;
    const joinDate = addDaysKey(TODAY_KEY, -(200 + i * 19));
    const isResigned = i % 7 === 3;
    const status = isResigned ? EMP_STATUS.RESIGNED : (i % 11 === 0 ? EMP_STATUS.PROBATION : i % 7 === 0 ? EMP_STATUS.SEASONAL : EMP_STATUS.OFFICIAL);
    const resignDate = isResigned ? addDaysKey(TODAY_KEY, -((i % 10) + 1)) : null;
    const resignReason = isResigned ? pick(RESIGN_REASONS, i).vi : "";
    employees.push({ id: employeeCode, employeeCode, vietnameseName: vn, chineseName: cnName(vn, i), birthYear: 1975 + (i % 28), phone: `09${String(10000000 + i * 137).slice(0, 8)}`, address: `Thôn ${1 + (i % 9)}, Hạ Long, Quảng Ninh`, joinDate, resignDate, resignReason, position, status, notes: "" });
  }

  const molds = [];
  for (let i = 0; i < 18; i++) {
    const moldCode = `MOLD-${pad2(i + 1)}`;
    molds.push({ id: moldCode, moldName: `Khuôn ${String.fromCharCode(65 + (i % 26))}`, status: i % 11 === 0 ? MOLD_STATUS.BẢO_TRÌ : MOLD_STATUS.SẴN_SÀNG, notes: "" });
  }

  const orders = [];
  const sizes = ["S", "M", "L", "XL"];
  for (let i = 0; i < 16; i++) {
    const orderCode = `YL-2601${4000 + i * 137}`;
    const mold = pick(molds, i);
    orders.push({ id: orderCode, orderCode, moldId: mold.id, size: pick(sizes, i), filmRollName: `Cuộn-${orderCode}-${pick(sizes, i)}`, completed: i % 9 === 0 });
  }

  const machines = [];
  for (let i = 0; i < 41; i++) {
    const machineNumber = i + 1;
    const machineCode = `M${pad2(machineNumber)}`;
    let status = MACHINE_STATUS.OPEN;
    if (i % 13 === 0) status = MACHINE_STATUS.STOPPED;
    else if (i % 17 === 0) status = MACHINE_STATUS.MAINTENANCE;
    else if (i % 21 === 0) status = MACHINE_STATUS.SAMPLE;
    const mold = status === MACHINE_STATUS.OPEN ? pick(molds, i) : null;
    const order = status === MACHINE_STATUS.OPEN ? pick(orders, i) : null;
    machines.push({ id: machineCode, machineNumber, machineCode, machineName: `Máy ${machineNumber}`, moldId: mold ? mold.id : null, status, currentOrderId: order ? order.id : null });
  }

  const activeWorkers = employees.filter((e) => isActive(e) && e.position === POSITIONS.WORKER);
  const technicians = employees.filter((e) => isActive(e) && e.position === POSITIONS.TECHNICIAN);
  const supports = employees.filter((e) => isActive(e) && e.position === POSITIONS.SUPPORT);
  const shiftLeaders = employees.filter((e) => isActive(e) && e.position === POSITIONS.SHIFT_LEADER);
  const teamLeaders = employees.filter((e) => isActive(e) && e.position === POSITIONS.TEAM_LEADER);
  const ordersById = Object.fromEntries(orders.map((o) => [o.id, o]));

  function buildDay(dateKey) {
    const entries = {};
    let cursor = 0;
    const nextWorker = () => activeWorkers[cursor++ % activeWorkers.length];
    machines.forEach((m, idx) => {
      const isOpen = m.status === MACHINE_STATUS.OPEN;
      const dayWorkers = isOpen ? [nextWorker(), ...(idx % 6 === 0 ? [nextWorker()] : [])] : [];
      const nightWorkers = isOpen && idx % 4 !== 0 ? [nextWorker()] : [];
      const dayOT = dayWorkers.length > 0 && idx % 5 === 0 ? 2 : dayWorkers.length > 0 && idx % 8 === 0 ? 1 : 0;
      const nightOT = nightWorkers.length > 0 && idx % 6 === 0 ? 1.5 : 0;
      const order = m.currentOrderId ? ordersById[m.currentOrderId] : null;
      entries[m.id] = {
        machineId: m.id, machineStatus: m.status, moldId: m.moldId, orderId: m.currentOrderId, filmRollName: order ? order.filmRollName : "",
        dayShift: { workers: dayWorkers.map((w) => w.id), overtimeHours: dayOT, technicians: isOpen && idx % 5 === 0 ? [technicians[idx % technicians.length]?.id].filter(Boolean) : [], otherWorkers: isOpen && idx % 9 === 0 ? [supports[idx % supports.length]?.id].filter(Boolean) : [] },
        nightShift: { workers: nightWorkers.map((w) => w.id), overtimeHours: nightOT, technicians: isOpen && idx % 7 === 0 ? [technicians[(idx + 1) % technicians.length]?.id].filter(Boolean) : [], otherWorkers: [] },
      };
    });
    return { date: dateKey, entries, dayLeader: shiftLeaders[0]?.id || null, dayTeamLeaders: teamLeaders.slice(0, 2).map((t) => t.id), nightLeader: shiftLeaders[1]?.id || null, nightTeamLeaders: teamLeaders.slice(2, 3).map((t) => t.id), status: PLAN_STATUS.SAVED, updatedBy: "Nguyễn Văn A", updatedAt: `${dateKey}T08:30:00` };
  }

  const schedules = {};
  for (let i = -29; i <= 0; i++) {
    const key = addDaysKey(TODAY_KEY, i);
    schedules[key] = buildDay(key);
  }
  schedules[addDaysKey(TODAY_KEY, 1)] = null;

  return { employees, machines, molds, orders, schedules };
}

/* ============================================================
   EMPLOYEES PAGE
   ============================================================ */
export function suggestChineseName(vn) { const surname = CN_SUR[(vn || "").trim().split(" ")[0]] || "?"; return `${surname}氏(?) — cần xác nhận thủ công`; }
