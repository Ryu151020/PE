import { BarChart3, CalendarClock, ClipboardList, Cog, Database, UserCog, Users } from "lucide-react";

/* ============================================================
   LAYOUT
   ============================================================ */
export const NAV_ITEMS = [
  { key: "schedule", vi: "Kế hoạch sắp đơn", zh: "排单计划", en: "Schedule", icon: CalendarClock },
  { key: "machines", vi: "Dữ liệu khuôn máy", zh: "模具数据", en: "Molds & Machines", icon: Cog },
  { key: "orders", vi: "Dữ liệu đơn hàng", zh: "订单数据", en: "Orders", icon: ClipboardList },
  { key: "employees", vi: "Nhân sự", zh: "人员管理", en: "Personnel", icon: Users },
  { key: "reports", vi: "Báo cáo tổng hợp", zh: "综合报表", en: "Reports", icon: BarChart3 },
  { key: "data", vi: "Dữ liệu", zh: "数据管理", en: "Data Management", icon: Database },
  { key: "accounts", vi: "Tài khoản", zh: "账户管理", en: "Accounts", icon: UserCog, adminOnly: true },
];
