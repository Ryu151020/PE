/* ============================================================
   CONSTANTS (bilingual)
   ============================================================ */
export const POSITION_DEFS = [
  { key: "SHIFT_LEADER", vi: "Ca trưởng", zh: "班长" },
  { key: "TEAM_LEADER", vi: "Tổ trưởng", zh: "组长" },
  { key: "TECHNICIAN", vi: "Kỹ thuật viên", zh: "技术员" },
  { key: "WORKER", vi: "Công nhân", zh: "工人" },
  { key: "SUPPORT", vi: "Công nhân khác", zh: "其他工人" },
];

export const POSITIONS = Object.fromEntries(POSITION_DEFS.map((p) => [p.key, p.vi]));

export const POSITION_ZH = Object.fromEntries(POSITION_DEFS.map((p) => [p.vi, p.zh]));

export const POSITION_LIST = POSITION_DEFS.map((p) => p.vi);

export const EMP_STATUS_DEFS = [
  { key: "OFFICIAL", vi: "Chính thức", zh: "正式工" },
  { key: "PROBATION", vi: "Thử việc", zh: "试用期" },
  { key: "SEASONAL", vi: "Thời vụ", zh: "临时工" },
  { key: "SUPPORT", vi: "Hỗ trợ", zh: "支援" },
  { key: "RESIGNED", vi: "Đã nghỉ việc", zh: "已离职" },
];

export const EMP_STATUS = Object.fromEntries(EMP_STATUS_DEFS.map((s) => [s.key, s.vi]));

export const EMP_STATUS_ZH = Object.fromEntries(EMP_STATUS_DEFS.map((s) => [s.vi, s.zh]));

export const EMP_STATUS_COLOR = {
  [EMP_STATUS.OFFICIAL]: "bg-ok-tint text-ok",
  [EMP_STATUS.PROBATION]: "bg-brand-tint text-brand",
  [EMP_STATUS.SEASONAL]: "bg-day-soft text-warn",
  [EMP_STATUS.SUPPORT]: "bg-[#E6F8FE] text-[#0088A9]",
  [EMP_STATUS.RESIGNED]: "bg-canvas text-mute",
};

// One-character chip tag shown next to a worker's name in the schedule table
export const EMP_STATUS_TAG = {
  [EMP_STATUS.OFFICIAL]: { char: "正", color: "bg-ok" },
  [EMP_STATUS.PROBATION]: { char: "试", color: "bg-brand" },
  [EMP_STATUS.SEASONAL]: { char: "临", color: "bg-warn-deep" },
  [EMP_STATUS.SUPPORT]: { char: "支", color: "bg-[#0284C7]" },
};

export const isActive = (e) => e && e.status !== EMP_STATUS.RESIGNED;

export const RESIGN_REASONS = [
  { vi: "Về quê", zh: "回老家" },
  { vi: "Chuyển việc khác", zh: "跳槽" },
  { vi: "Lý do cá nhân", zh: "个人原因" },
  { vi: "Lý do sức khỏe", zh: "健康原因" },
  { vi: "Hết hợp đồng thời vụ", zh: "临时合同到期" },
  { vi: "Lương chưa phù hợp", zh: "薪资问题" },
  { vi: "Mâu thuẫn với quản lý", zh: "与管理层有矛盾" },
  { vi: "Khác", zh: "其他" },
];

export const MACHINE_STATUS = { OPEN: "OPEN", STOPPED: "STOPPED", MAINTENANCE: "MAINTENANCE", SAMPLE: "SAMPLE" };

export const MACHINE_STATUS_DEFS = {
  OPEN: { vi: "Đang mở", zh: "开机" },
  STOPPED: { vi: "Dừng", zh: "停机" },
  MAINTENANCE: { vi: "Bảo trì", zh: "维护" },
  SAMPLE: { vi: "Làm hàng mẫu", zh: "打样" },
};

export const MACHINE_STATUS_COLOR = {
  OPEN: "bg-ok-tint text-ok",
  STOPPED: "bg-bad-tint text-bad",
  MAINTENANCE: "bg-warn-tint text-warn",
  SAMPLE: "bg-brand-tint text-brand",
};

export const MACHINE_STATUS_TEXT_COLOR = { OPEN: "#05CD99", STOPPED: "#EE5D50", MAINTENANCE: "#C9820A", SAMPLE: "#4318FF" };

export const MACHINE_STATUS_BOX_STYLES = {
  OPEN: {
    backgroundColor: "#E6FAF5",
    color: "#05CD99",
    borderColor: "rgba(5, 205, 153, 0.4)",
  },
  STOPPED: {
    backgroundColor: "#FFF5F5",
    color: "#EE5D50",
    borderColor: "rgba(238, 93, 80, 0.4)",
  },
  MAINTENANCE: {
    backgroundColor: "#FFF9E6",
    color: "#C9820A",
    borderColor: "rgba(201, 130, 10, 0.4)",
  },
  SAMPLE: {
    backgroundColor: "#F4F7FE",
    color: "#4318FF",
    borderColor: "rgba(67, 24, 255, 0.4)",
  },
};

export const MOLD_STATUS_DEFS = [
  { vi: "Sẵn sàng", zh: "可用" },
  { vi: "Đang dùng", zh: "使用中" },
  { vi: "Bảo trì", zh: "维护中" },
];

export const MOLD_STATUS = Object.fromEntries(MOLD_STATUS_DEFS.map((s) => [s.vi.toUpperCase().replace(/\s/g, "_"), s.vi]));

export const MOLD_STATUS_ZH = Object.fromEntries(MOLD_STATUS_DEFS.map((s) => [s.vi, s.zh]));

export const MOLD_STATUS_COLOR = {
  [MOLD_STATUS.SẴN_SÀNG]: "bg-ok-tint text-ok",
  [MOLD_STATUS.ĐANG_DÙNG]: "bg-brand-tint text-brand",
  [MOLD_STATUS.BẢO_TRÌ]: "bg-warn-tint text-warn",
};

export const PLAN_STATUS = { DRAFT: "DRAFT", SAVED: "SAVED", LOCKED: "LOCKED" };

export const PLAN_STATUS_DEFS = { DRAFT: { vi: "Chưa lập", zh: "未排班" }, SAVED: { vi: "Đã lưu", zh: "已保存" }, LOCKED: { vi: "Đã khóa", zh: "已锁定" } };

export const PLAN_STATUS_COLOR = {
  DRAFT: "bg-canvas text-mute",
  SAVED: "bg-ok-tint text-ok",
  LOCKED: "bg-brand-tint text-brand",
};

export const ROLES = { ADMIN: "ADMIN", USER: "USER", VIEWER: "VIEWER" };

export const OT_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

export const RANGE_PRESET_BUTTONS = [
  ["yesterday", "Hôm qua"], ["today", "Hôm nay"], ["thisWeek", "Tuần này"], ["lastWeek", "Tuần trước"],
  ["thisMonth", "Tháng này"], ["lastMonth", "Tháng trước"],
];

export const PIE_COLORS = ["#4318FF", "#6AD2FF", "#05CD99", "#FFB547", "#EE5D50", "#868CFF", "#1C6CB7", "#A3AED0"];

export const TENURE_ZH = { "< 1 tháng": "< 1 个月", "1-3 tháng": "1-3 个月", "3-6 tháng": "3-6 个月", "6-12 tháng": "6-12 个月", "1-2 năm": "1-2 年", "> 2 năm": "> 2 年" };

export function reasonZh(r) { const f = RESIGN_REASONS.find((x) => x.vi === r); return f ? f.zh : r === "Chưa ghi nhận" ? "未记录" : ""; }

export const MOLD_COLOR_PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-300" },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
  { bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-300" },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
  { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-300" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
];

export function getMoldColor(moldName) {
  if (!moldName) return { bg: "bg-canvas", text: "text-mute", border: "border-line", style: {} };
  const numMatch = String(moldName).match(/\d+/);
  let seed = 0;
  if (numMatch) {
    seed = parseInt(numMatch[0], 10);
  } else {
    for (let i = 0; i < moldName.length; i++) {
      seed = (seed << 5) - seed + moldName.charCodeAt(i);
      seed |= 0;
    }
    seed = Math.abs(seed);
  }
  // Golden angle approximation (137.508 degrees) gives optimal visual separation
  const hue = Math.round((seed * 137.508) % 360);
  return {
    bg: "",
    text: "",
    border: "",
    style: {
      backgroundColor: `hsl(${hue}, 88%, 94%)`,
      color: `hsl(${hue}, 92%, 24%)`,
      borderColor: `hsl(${hue}, 65%, 75%)`,
    },
  };
}
