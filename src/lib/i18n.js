/* ============================================================
   i18n DICTIONARY AND HELPER FUNCTIONS (VI / ZH / EN)
   ============================================================ */

export const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", short: "VN" },
  { code: "zh", label: "中文", short: "中文" },
  { code: "en", label: "English", short: "EN" },
];

export const DICT = {
  // Navigation
  nav_schedule: { vi: "Kế hoạch sắp đơn", zh: "排单计划", en: "Schedule" },
  nav_machines: { vi: "Dữ liệu khuôn máy", zh: "模具数据", en: "Molds & Machines" },
  nav_orders: { vi: "Dữ liệu đơn hàng", zh: "订单数据", en: "Orders" },
  nav_employees: { vi: "Nhân sự", zh: "人员管理", en: "Personnel" },
  nav_reports: { vi: "Báo cáo tổng hợp", zh: "综合报表", en: "Reports" },
  nav_data: { vi: "Dữ liệu", zh: "数据管理", en: "Data Management" },
  nav_accounts: { vi: "Tài khoản", zh: "账户管理", en: "Accounts" },

  // General Header & Layout
  greeting: { vi: "Xin chào", zh: "你好", en: "Welcome" },
  role: { vi: "Vai trò", zh: "角色", en: "Role" },
  searchHeaderPlaceholder: { vi: "Tìm nhân viên, khuôn, đơn hàng...", zh: "搜索员工、模具、订单...", en: "Search employee, mold, order..." },
  logout: { vi: "Đăng xuất", zh: "退出登录", en: "Log out" },
  workshopTitle: { vi: "Xưởng găng tay", zh: "手套车间", en: "Glove Workshop" },
  workshopSubtitle: { vi: "Hệ thống sắp đơn PE", zh: "手套车间生产排班系统", en: "PE Glove Scheduling System" },
  versionLabel: { vi: "Phiên bản 3.0", zh: "版本 3.0", en: "Version 3.0" },
  collapseMenu: { vi: "Thu gọn", zh: "收起", en: "Collapse" },
  expandMenu: { vi: "Mở rộng", zh: "展开", en: "Expand" },

  // Table Column Headers
  stt: { vi: "STT", zh: "序号", en: "No." },
  machineNumberCol: { vi: "Số máy", zh: "机台号", en: "Machine No." },
  machineStatus: { vi: "Trạng thái máy", zh: "机器状态", en: "Machine Status" },
  mold: { vi: "Khuôn máy", zh: "模具", en: "Mold" },
  order: { vi: "Đơn hàng", zh: "订单", en: "Order" },
  filmRoll: { vi: "Cuộn màng", zh: "卷膜", en: "Film Roll" },
  dayShift: { vi: "CA NGÀY", zh: "白班", en: "DAY SHIFT" },
  nightShift: { vi: "CA ĐÊM", zh: "夜班", en: "NIGHT SHIFT" },
  worker: { vi: "Công nhân", zh: "工人", en: "Worker" },
  workers: { vi: "Công nhân", zh: "工人", en: "Workers" },
  overtime: { vi: "Tăng ca", zh: "加班", en: "Overtime" },
  technician: { vi: "Kỹ thuật viên", zh: "技术员", en: "Technician" },
  otherWorker: { vi: "Công nhân khác", zh: "其他工人", en: "Support Staff" },
  shiftLeaderShort: { vi: "CT", zh: "班长", en: "SL" },
  teamLeaderShort: { vi: "TT", zh: "组长", en: "TL" },
  shiftLeaderLong: { vi: "Ca trưởng", zh: "班长", en: "Shift Leader" },
  teamLeaderLong: { vi: "Tổ trưởng", zh: "组长", en: "Team Leader" },

  // Personnel Table Headers
  empCode: { vi: "Mã NV", zh: "工号", en: "Emp ID" },
  vnName: { vi: "Tên VN", zh: "越南语姓名", en: "VN Name" },
  cnName: { vi: "Tên Trung", zh: "中文姓名", en: "Chinese Name" },
  joinDate: { vi: "Ngày vào làm", zh: "入职", en: "Join Date" },
  resignDate: { vi: "Ngày rời đi", zh: "离职", en: "Resign Date" },
  seniority: { vi: "Thâm niên", zh: "工龄", en: "Seniority" },
  position: { vi: "Vị trí", zh: "职位", en: "Position" },
  status: { vi: "Trạng thái", zh: "状态", en: "Status" },
  birthYear: { vi: "Năm sinh", zh: "出生年", en: "Birth Year" },
  phone: { vi: "Số điện thoại", zh: "电话", en: "Phone" },
  address: { vi: "Địa chỉ", zh: "地址", en: "Address" },
  actions: { vi: "Thao tác", zh: "操作", en: "Actions" },

  // Employee page tabs & buttons
  activeEmployees: { vi: "Đang làm việc", zh: "在职", en: "Active" },
  resignedEmployees: { vi: "Nghỉ việc", zh: "离职", en: "Resigned" },
  addEmployee: { vi: "Thêm nhân sự", zh: "新增员工", en: "Add Employee" },
  manualAdd: { vi: "Nhập tay", zh: "手动输入", en: "Manual Input" },
  excelUpload: { vi: "Tải lên từ Excel", zh: "从Excel导入", en: "Import from Excel" },
  pasteData: { vi: "Dán dữ liệu", zh: "粘贴导入", en: "Paste Data" },
  downloadTemplate: { vi: "Tải file mẫu", zh: "下载模板", en: "Download Template" },
  searchEmpPlaceholder: { vi: "Tìm tên, mã NV...", zh: "搜索姓名、工号...", en: "Search name, ID..." },

  // Schedule Actions
  savePlan: { vi: "Lưu kế hoạch", zh: "保存计划", en: "Save Schedule" },
  editPlan: { vi: "Sửa kế hoạch", zh: "编辑计划", en: "Edit Schedule" },
  getData: { vi: "Lấy dữ liệu", zh: "获取数据", en: "Get Data" },
  clearAll: { vi: "Xóa toàn bộ", zh: "清空", en: "Clear All" },
  lockPlan: { vi: "Khóa kế hoạch", zh: "锁定计划", en: "Lock Schedule" },
  unlockPlan: { vi: "Mở khóa", zh: "解锁", en: "Unlock Schedule" },
  unsavedWarning: { vi: "Có thay đổi chưa được lưu", zh: "有未保存的更改", en: "Unsaved changes" },
  viewingDate: { vi: "Đang xem", zh: "查看日期", en: "Viewing" },
  lastUpdated: { vi: "Thời gian cập nhật", zh: "更新时间", en: "Updated at" },
  noPlanForDate: { vi: "Chưa có kế hoạch cho ngày", zh: "该日期暂无排班计划", en: "No schedule for" },
  getDataFromOtherDate: { vi: "Lấy dữ liệu từ ngày khác", zh: "从其他日期获取数据", en: "Copy from another date" },
  createNewPlan: { vi: "Tạo kế hoạch mới", zh: "创建新计划", en: "Create New Schedule" },

  // Stats / KPIs
  runningMachines: { vi: "Máy đang mở", zh: "开机数量", en: "Running Machines" },
  stoppedMachines: { vi: "Máy đang dừng", zh: "停机数量", en: "Stopped Machines" },
  workingEmployees: { vi: "Người đi làm", zh: "出勤人数", en: "Staff on Duty" },
  runningMachinesByMold: { vi: "Thống kê máy đang mở theo khuôn", zh: "按模具统计开机机器", en: "Running Machines by Mold" },
  shiftComparison: { vi: "So sánh ca", zh: "班次对比", en: "Shift Comparison" },
  byMold: { vi: "Theo từng khuôn", zh: "按模具", en: "By Mold" },
  totalSummary: { vi: "Tổng cộng", zh: "合计", en: "Total" },
  moldsCount: { vi: "khuôn", zh: "模具", en: "molds" },
  moldRulesNote: { vi: "Mỗi khuôn có công nhân trong ca = 1 khuôn mở (1 hay nhiều người đều tính 1; không có người = 0)", zh: "该班次工人栏有人即计 1 个开机模具（不论几人），无人为 0", en: "A mold with assigned workers counts as 1 running mold (0 if no workers assigned)" },

  // Common UI
  search: { vi: "Tìm kiếm...", zh: "搜索...", en: "Search..." },
  searchMoldPlaceholder: { vi: "Tìm khuôn...", zh: "搜索模具...", en: "Search mold..." },
  searchOrderPlaceholder: { vi: "Tìm đơn...", zh: "搜索订单...", en: "Search order..." },
  notFound: { vi: "Không tìm thấy", zh: "未找到", en: "Not found" },
  selectPlaceholder: { vi: "— chọn —", zh: "— 选择 —", en: "— select —" },
  unassigned: { vi: "", zh: "", en: "" },
  unassignedMold: { vi: "—", zh: "—", en: "—" },
  clearSelection: { vi: "— Bỏ chọn —", zh: "— 清空 —", en: "— Clear —" },
  apply: { vi: "Áp dụng", zh: "应用", en: "Apply" },
  cancel: { vi: "Hủy", zh: "取消", en: "Cancel" },
  done: { vi: "Xong", zh: "完成", en: "Done" },
  close: { vi: "Đóng", zh: "关闭", en: "Close" },
  save: { vi: "Lưu", zh: "保存", en: "Save" },
  delete: { vi: "Xóa", zh: "删除", en: "Delete" },
  edit: { vi: "Sửa", zh: "编辑", en: "Edit" },
  from: { vi: "Từ", zh: "从", en: "From" },
  to: { vi: "Đến", zh: "到", en: "To" },
  sortAsc: { vi: "Sắp xếp A đến Z", zh: "升序 (A 到 Z)", en: "Sort A to Z" },
  sortDesc: { vi: "Sắp xếp Z đến A", zh: "降序 (Z 到 A)", en: "Sort Z to A" },
  selectAll: { vi: "Chọn tất cả", zh: "全选", en: "Select All" },
  clearFilter: { vi: "Xóa chọn", zh: "清空", en: "Clear" },
  emptySpot: { vi: "(Chỗ trống)", zh: "(空白)", en: "(Blank)" },
  exportExcel: { vi: "Xuất Excel", zh: "导出 Excel", en: "Export Excel" },
  downloadExcel: { vi: "Tải xuống Excel", zh: "下载 Excel", en: "Download Excel" },
  exportDataToExcel: { vi: "Xuất dữ liệu ra Excel", zh: "导出数据为 Excel", en: "Export Data to Excel" },
  deleteData: { vi: "Xóa dữ liệu", zh: "删除数据", en: "Delete Data" },
  expandDayShift: { vi: "Mở rộng ca ngày", zh: "展开白班", en: "Expand Day Shift" },
  collapseDayShift: { vi: "Thu gọn ca ngày", zh: "收起白班", en: "Collapse Day Shift" },
  expandNightShift: { vi: "Mở rộng ca đêm", zh: "展开夜班", en: "Expand Night Shift" },
  collapseNightShift: { vi: "Thu gọn ca đêm", zh: "收起夜班", en: "Collapse Night Shift" },
  prevDay: { vi: "Hôm trước", zh: "前一天", en: "Previous Day" },
  nextDay: { vi: "Hôm sau", zh: "后一天", en: "Next Day" },
  selectDateTitle: { vi: "Chọn ngày / tháng / năm", zh: "选择日期", en: "Select date" },
  overtimeNote: { vi: "Tăng ca áp dụng cho cả người trên máy này", zh: "加班时数适用于该机器全部人员", en: "Overtime applies to all workers on this machine" },

  // Reports
  yesterday: { vi: "Hôm qua", zh: "昨天", en: "Yesterday" },
  today: { vi: "Hôm nay", zh: "今天", en: "Today" },
  thisWeek: { vi: "Tuần này", zh: "本周", en: "This Week" },
  lastWeek: { vi: "Tuần trước", zh: "上周", en: "Last Week" },
  thisMonth: { vi: "Tháng này", zh: "本月", en: "This Month" },
  lastMonth: { vi: "Tháng trước", zh: "上月", en: "Last Month" },
  thisYear: { vi: "Năm nay", zh: "今年", en: "This Year" },
  custom: { vi: "Tùy chọn", zh: "自定义", en: "Custom" },
  turnoverReport: { vi: "Báo cáo nghỉ việc", zh: "离职报表", en: "Turnover Report" },
  totalResigned: { vi: "Tổng số người nghỉ việc", zh: "离职总数", en: "Total Resigned" },
  noTurnoverInPeriod: { vi: "Không có ai nghỉ việc trong khoảng thời gian này", zh: "所选时间段内无人离职", en: "No resignations in this period" },
  resignedCount: { vi: "Số người nghỉ", zh: "离职人数", en: "Resigned Count" },
  tenureBeforeResign: { vi: "Thời gian làm việc trước khi nghỉ", zh: "离职前工龄", en: "Tenure Before Resignation" },
  tenureQuestion: { vi: "Nhân sự thường nghỉ việc sau bao lâu?", zh: "员工通常工作多久后离职？", en: "How long do staff usually work before resigning?" },
  peopleCountUnit: { vi: "người", zh: "人", en: "staff" },
  reasonStats: { vi: "Thống kê lý do nghỉ việc", zh: "离职原因统计", en: "Resignation Reasons Breakdown" },
  reasonQuestion: { vi: "Lý do nào chiếm phần lớn?", zh: "哪个原因占比最大？", en: "Which reason accounts for the majority?" },
  noDataInPeriod: { vi: "Không có dữ liệu trong khoảng thời gian này", zh: "所选时间段内无数据", en: "No data in this period" },
  resigned: { vi: "người nghỉ", zh: "离职", en: "resigned" },
  dayNightReport: { vi: "Báo cáo ca ngày / ca đêm", zh: "白班·夜班报表", en: "Day / Night Shift Report" },
  dayNightSubtitle: { vi: "Mỗi ngày chỉ tính 1 lần dù làm nhiều khuôn", zh: "每天只计1次（无论做多少副模具）", en: "Counted once per day regardless of molds worked" },
  overtimeReport: { vi: "Báo cáo tăng ca", zh: "加班报表", en: "Overtime Report" },
  totalOvertimeHours: { vi: "Tổng giờ tăng ca", zh: "加班总时数", en: "Total Overtime" },
  noOvertimeData: { vi: "Chưa có dữ liệu tăng ca", zh: "暂无加班数据", en: "No overtime data" },
  hours: { vi: "giờ", zh: "小时", en: "hours" },
  openRateTitle: { vi: "Tỉ lệ mở máy", zh: "开机率", en: "Machine Operating Rate" },
  openRateSubtitle: { vi: "Số ca-máy có người vận hành trên tổng số ca-máy mỗi ngày", zh: "每天有人操作的机台班次占总机台班次的比例", en: "Share of machine-shifts with workers assigned per day" },
  average: { vi: "Trung bình", zh: "平均", en: "Average" },
  headcountTrend: { vi: "Nhân sự theo thời gian", zh: "人员趋势", en: "Headcount Trend" },
  headcountTrendSubtitle: { vi: "Tổng nhân sự đang làm việc mỗi ngày", zh: "每日在职总人数", en: "Total staff working per day" },
  personnel: { vi: "Nhân sự", zh: "人员", en: "Personnel" },
  machineReport: { vi: "Báo cáo theo máy", zh: "按机器统计", en: "Machine Usage Statistics" },
  machineReportSubtitle: { vi: "Trong khoảng thời gian đã chọn", zh: "所选时间段内", en: "Within selected period" },
  machine: { vi: "Máy", zh: "机器", en: "Machine" },
  openDays: { vi: "Ngày mở", zh: "开机天数", en: "Operating Days" },
  stoppedDays: { vi: "Ngày dừng", zh: "停机天数", en: "Stopped Days" },
  orderCount: { vi: "Đơn hàng", zh: "订单", en: "Orders" },
  workerCount: { vi: "Công nhân", zh: "工人", en: "Workers" },
  dayShiftCol: { vi: "Ngày", zh: "白班", en: "Day" },
  nightShiftCol: { vi: "Đêm", zh: "夜班", en: "Night" },
  totalCol: { vi: "Tổng", zh: "合计", en: "Total" },
  noData: { vi: "Chưa có dữ liệu", zh: "暂无数据", en: "No data" },
  employee: { vi: "Nhân viên", zh: "员工", en: "Employee" },
};

/* Position dictionary helper */
export const POSITION_TRANSLATIONS = {
  "Ca trưởng": { vi: "Ca trưởng", zh: "班长", en: "Shift Leader" },
  "Tổ trưởng": { vi: "Tổ trưởng", zh: "组长", en: "Team Leader" },
  "Kỹ thuật viên": { vi: "Kỹ thuật viên", zh: "技术员", en: "Technician" },
  "Công nhân": { vi: "Công nhân", zh: "工人", en: "Worker" },
  "Công nhân khác": { vi: "Công nhân khác", zh: "其他工人", en: "Support Staff" },
  "CN": { vi: "Công nhân", zh: "工人", en: "Worker" },
  "KTV": { vi: "Kỹ thuật viên", zh: "技术员", en: "Technician" },
  "CN khác": { vi: "Công nhân khác", zh: "其他工人", en: "Support Staff" },
};

/* Employee status dictionary helper */
export const STATUS_TRANSLATIONS = {
  "Chính thức": { vi: "Chính thức", zh: "正式工", en: "Official" },
  "Thử việc": { vi: "Thử việc", zh: "试用期", en: "Probation" },
  "Thời vụ": { vi: "Thời vụ", zh: "临时工", en: "Seasonal" },
  "Hỗ trợ": { vi: "Hỗ trợ", zh: "支援", en: "Support" },
  "Đã nghỉ việc": { vi: "Đã nghỉ việc", zh: "已离职", en: "Resigned" },
  "Nghỉ việc": { vi: "Nghỉ việc", zh: "已离职", en: "Resigned" },
};

/* Machine status dictionary helper */
export const MACHINE_STATUS_TRANSLATIONS = {
  OPEN: { vi: "Đang mở", zh: "开机", en: "Running" },
  STOPPED: { vi: "Dừng", zh: "停机", en: "Stopped" },
  MAINTENANCE: { vi: "Bảo trì", zh: "维护", en: "Maintenance" },
  SAMPLE: { vi: "Làm hàng mẫu", zh: "打样", en: "Sampling" },
  "Đang mở": { vi: "Đang mở", zh: "开机", en: "Running" },
  "Dừng": { vi: "Dừng", zh: "停机", en: "Stopped" },
  "Bảo trì": { vi: "Bảo trì", zh: "维护", en: "Maintenance" },
  "Làm hàng mẫu": { vi: "Làm hàng mẫu", zh: "打样", en: "Sampling" },
};

/* Order status dictionary helper */
export const ORDER_STATUS_TRANSLATIONS = {
  open: { vi: "Đang sản xuất", zh: "生产中", en: "In Production" },
  done: { vi: "Đã hoàn thiện", zh: "已完成", en: "Completed" },
  "Đang sản xuất": { vi: "Đang sản xuất", zh: "生产中", en: "In Production" },
  "Đã hoàn thiện": { vi: "Đã hoàn thiện", zh: "已完成", en: "Completed" },
  "Đang xử lý": { vi: "Đang sản xuất", zh: "生产中", en: "In Production" },
};

/* Mold status dictionary helper */
export const MOLD_STATUS_TRANSLATIONS = {
  "Sẵn sàng": { vi: "Sẵn sàng", zh: "可用", en: "Ready" },
  "Đang dùng": { vi: "Đang dùng", zh: "使用中", en: "In Use" },
  "Bảo trì": { vi: "Bảo trì", zh: "维护中", en: "Maintenance" },
};

/* Plan status dictionary helper */
export const PLAN_STATUS_TRANSLATIONS = {
  DRAFT: { vi: "Chưa lập", zh: "未排班", en: "Draft" },
  SAVED: { vi: "Đã lưu", zh: "已保存", en: "Saved" },
  LOCKED: { vi: "Đã khóa", zh: "已锁定", en: "Locked" },
  "Chưa lập": { vi: "Chưa lập", zh: "未排班", en: "Draft" },
  "Đã lưu": { vi: "Đã lưu", zh: "已保存", en: "Saved" },
  "Đã khóa": { vi: "Đã khóa", zh: "已锁定", en: "Locked" },
};

/* Resign reason dictionary helper */
export const RESIGN_REASON_TRANSLATIONS = {
  "Về quê": { vi: "Về quê", zh: "回老家", en: "Returned home" },
  "Chuyển việc khác": { vi: "Chuyển việc khác", zh: "跳槽", en: "Changed jobs" },
  "Lý do cá nhân": { vi: "Lý do cá nhân", zh: "个人原因", en: "Personal reasons" },
  "Lý do sức khỏe": { vi: "Lý do sức khỏe", zh: "健康原因", en: "Health reasons" },
  "Hết hợp đồng thời vụ": { vi: "Hết hợp đồng thời vụ", zh: "临时合同到期", en: "Contract ended" },
  "Lương chưa phù hợp": { vi: "Lương chưa phù hợp", zh: "薪资问题", en: "Salary concerns" },
  "Mâu thuẫn với quản lý": { vi: "Mâu thuẫn với quản lý", zh: "与管理层有矛盾", en: "Management conflict" },
  "Khác": { vi: "Khác", zh: "其他", en: "Other" },
  "Chưa ghi nhận": { vi: "Chưa ghi nhận", zh: "未记录", en: "Not recorded" },
};

/* Tenure buckets */
export const TENURE_TRANSLATIONS = {
  "< 1 tháng": { vi: "< 1 tháng", zh: "< 1 个月", en: "< 1 month" },
  "1-3 tháng": { vi: "1-3 tháng", zh: "1-3 个月", en: "1-3 months" },
  "3-6 tháng": { vi: "3-6 tháng", zh: "3-6 个月", en: "3-6 months" },
  "6-12 tháng": { vi: "6-12 tháng", zh: "6-12 个月", en: "6-12 months" },
  "1-2 năm": { vi: "1-2 năm", zh: "1-2 年", en: "1-2 years" },
  "> 2 năm": { vi: "> 2 năm", zh: "> 2 年", en: "> 2 years" },
};

/* Translate helper */
export function t(key, lang = "vi", fallback = null) {
  if (DICT[key] && DICT[key][lang]) {
    return DICT[key][lang];
  }
  if (POSITION_TRANSLATIONS[key] && POSITION_TRANSLATIONS[key][lang]) {
    return POSITION_TRANSLATIONS[key][lang];
  }
  if (STATUS_TRANSLATIONS[key] && STATUS_TRANSLATIONS[key][lang]) {
    return STATUS_TRANSLATIONS[key][lang];
  }
  if (MACHINE_STATUS_TRANSLATIONS[key] && MACHINE_STATUS_TRANSLATIONS[key][lang]) {
    return MACHINE_STATUS_TRANSLATIONS[key][lang];
  }
  if (MOLD_STATUS_TRANSLATIONS[key] && MOLD_STATUS_TRANSLATIONS[key][lang]) {
    return MOLD_STATUS_TRANSLATIONS[key][lang];
  }
  if (PLAN_STATUS_TRANSLATIONS[key] && PLAN_STATUS_TRANSLATIONS[key][lang]) {
    return PLAN_STATUS_TRANSLATIONS[key][lang];
  }
  if (RESIGN_REASON_TRANSLATIONS[key] && RESIGN_REASON_TRANSLATIONS[key][lang]) {
    return RESIGN_REASON_TRANSLATIONS[key][lang];
  }
  if (TENURE_TRANSLATIONS[key] && TENURE_TRANSLATIONS[key][lang]) {
    return TENURE_TRANSLATIONS[key][lang];
  }

  return fallback !== null ? fallback : key;
}

export function getPositionLabel(pos, lang = "vi") {
  return POSITION_TRANSLATIONS[pos]?.[lang] || pos;
}

export function getStatusLabel(status, lang = "vi") {
  return STATUS_TRANSLATIONS[status]?.[lang] || status;
}

export function getMachineStatusLabel(status, lang = "vi") {
  return MACHINE_STATUS_TRANSLATIONS[status]?.[lang] || status;
}

export function getMoldStatusLabel(status, lang = "vi") {
  return MOLD_STATUS_TRANSLATIONS[status]?.[lang] || status;
}

export function getPlanStatusLabel(status, lang = "vi") {
  return PLAN_STATUS_TRANSLATIONS[status]?.[lang] || status;
}

export function getResignReasonLabel(reason, lang = "vi") {
  return RESIGN_REASON_TRANSLATIONS[reason]?.[lang] || reason;
}

export function getOrderStatusLabel(status, lang = "vi") {
  const key = status === true || status === "done" ? "done" : "open";
  return ORDER_STATUS_TRANSLATIONS[key]?.[lang] || (key === "done" ? "Đã hoàn thiện" : "Đang sản xuất");
}
