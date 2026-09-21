import { BarChart3, CalendarClock, ClipboardList, Cog, Database, Users } from "lucide-react";

/* ============================================================
   LAYOUT
   ============================================================ */
export const NAV_ITEMS = [
  { key: "schedule", vi: "Kế hoạch sắp đơn", zh: "排单计划", icon: CalendarClock },
  { key: "machines", vi: "Dữ liệu khuôn máy", zh: "模具数据", icon: Cog },
  { key: "orders", vi: "Dữ liệu đơn hàng", zh: "订单数据", icon: ClipboardList },
  { key: "employees", vi: "Nhân sự", zh: "人员管理", icon: Users },
  { key: "reports", vi: "Báo cáo tổng hợp", zh: "综合报表", icon: BarChart3 },
  { key: "data", vi: "Dữ liệu", zh: "数据管理", icon: Database },
];
