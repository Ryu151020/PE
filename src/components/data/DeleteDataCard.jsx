import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Loader2, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PLAN_STATUS, ROLES } from "../../lib/constants";
import { TODAY_KEY, inRange } from "../../lib/dates";
import { t } from "../../lib/i18n";
import { btnDanger, card } from "../../lib/styles";
import { Bi } from "../ui/Bi";
import { DateFieldVN } from "../ui/Fields";
import { Segmented } from "../ui/Segmented";

export function DeleteDataCard({ db, setDb, deleteData, role, pushToast, confirmAction, scheduleDates }) {
  const { lang = "vi" } = useApp() || {};
  const [mode, setMode] = useState("everything");
  const [range, setRange] = useState(() => ({
    from: scheduleDates[0] || TODAY_KEY,
    to: scheduleDates[scheduleDates.length - 1] || TODAY_KEY,
  }));
  const [deleting, setDeleting] = useState(false);
  const isAdmin = role === ROLES.ADMIN;

  useEffect(() => {
    if (scheduleDates && scheduleDates.length > 0) {
      setRange((prev) => {
        if (prev.from === TODAY_KEY && prev.to === TODAY_KEY) {
          return { from: scheduleDates[0], to: scheduleDates[scheduleDates.length - 1] };
        }
        return prev;
      });
    }
  }, [scheduleDates]);

  const info = useMemo(() => {
    let days = 0, locked = 0;
    const allDays = Object.keys(db.schedules || {}).filter((k) => !!db.schedules[k]).length;
    Object.entries(db.schedules || {}).forEach(([d, day]) => {
      if (!day) return;
      if (mode === "range" && !inRange(d, range.from, range.to)) return;
      if (day.status === PLAN_STATUS.LOCKED) locked++;
      days++;
    });
    return { days, locked, allDays };
  }, [db.schedules, mode, range]);

  const rangeInvalid = mode === "range" && range.from > range.to;

  const nothing = useMemo(() => {
    if (mode === "everything") {
      return (
        info.allDays === 0 &&
        (db.molds || []).length === 0 &&
        (db.orders || []).length === 0 &&
        (db.employees || []).length === 0
      );
    }
    if (mode === "allPlans") return info.allDays === 0;
    if (mode === "orders") return (db.orders || []).length === 0;
    if (mode === "employees") return (db.employees || []).length === 0;
    if (mode === "molds") return (db.molds || []).length === 0;
    return info.days === 0;
  }, [mode, info, db]);

  const DESC = {
    everything: lang === "zh"
      ? "彻底清空全部数据（排班计划、模具、订单、人员）。保留41台机器基本框架。"
      : lang === "en"
      ? "Permanently delete ALL data: schedules, molds, orders, and staff. Machine list is kept blank."
      : "Xóa sạch toàn bộ hệ thống: kế hoạch sắp đơn, đơn hàng, khuôn máy và nhân sự. Giữ nguyên 41 máy trống.",
    allPlans: lang === "zh"
      ? "删除全部日期的排班计划，保留模具、订单、人员数据。"
      : lang === "en"
      ? "Delete all schedules for all days; molds, orders and staff are preserved."
      : "Xóa toàn bộ kế hoạch sắp đơn của mọi ngày; giữ nguyên khuôn, đơn hàng và nhân sự.",
    range: lang === "zh"
      ? "删除所选日期范围内的排班计划。"
      : lang === "en"
      ? "Delete all schedules within the selected date range."
      : "Xóa kế hoạch sắp đơn của các ngày trong khoảng ngày đã chọn.",
    orders: lang === "zh"
      ? "删除全部订单列表。排班计划、模具和人员保留。"
      : lang === "en"
      ? "Delete all orders in the system. Schedules, molds, and staff are preserved."
      : "Xóa toàn bộ danh sách đơn hàng trong hệ thống. Kế hoạch, khuôn và nhân sự được giữ nguyên.",
    employees: lang === "zh"
      ? "删除全部人员列表。排班计划、模具和订单保留。"
      : lang === "en"
      ? "Delete all personnel in the system. Schedules, molds, and orders are preserved."
      : "Xóa toàn bộ danh sách nhân sự trong hệ thống. Kế hoạch, khuôn và đơn hàng được giữ nguyên.",
    molds: lang === "zh"
      ? "删除全部模具列表。排班计划、订单和人员保留。"
      : lang === "en"
      ? "Delete all molds in the system. Schedules, orders, and staff are preserved."
      : "Xóa toàn bộ danh sách khuôn máy trong hệ thống. Kế hoạch, đơn hàng và nhân sự được giữ nguyên.",
  };

  const summary = useMemo(() => {
    if (mode === "everything") {
      return lang === "zh"
        ? `将彻底删除：${info.allDays} 天排班计划、${(db.molds || []).length} 个模具、${(db.orders || []).length} 个订单、${(db.employees || []).length} 名员工。`
        : lang === "en"
        ? `Will permanently delete: ${info.allDays} days of schedules, ${(db.molds || []).length} molds, ${(db.orders || []).length} orders, ${(db.employees || []).length} staff.`
        : `Sẽ xóa vĩnh viễn: ${info.allDays} ngày kế hoạch, ${(db.molds || []).length} khuôn máy, ${(db.orders || []).length} đơn hàng, ${(db.employees || []).length} nhân sự.`;
    }
    if (mode === "allPlans") {
      return lang === "zh"
        ? `将删除全部 ${info.allDays} 天排班计划。`
        : lang === "en"
        ? `Will delete all ${info.allDays} days of schedules.`
        : `Sẽ xóa toàn bộ ${info.allDays} ngày kế hoạch sắp đơn của mọi ngày.`;
    }
    if (mode === "orders") {
      return lang === "zh"
        ? `将删除全部 ${(db.orders || []).length} 个订单。`
        : lang === "en"
        ? `Will delete all ${(db.orders || []).length} orders.`
        : `Sẽ xóa toàn bộ ${(db.orders || []).length} đơn hàng trong hệ thống.`;
    }
    if (mode === "employees") {
      return lang === "zh"
        ? `将删除全部 ${(db.employees || []).length} 名员工。`
        : lang === "en"
        ? `Will delete all ${(db.employees || []).length} staff.`
        : `Sẽ xóa toàn bộ ${(db.employees || []).length} nhân sự trong hệ thống.`;
    }
    if (mode === "molds") {
      return lang === "zh"
        ? `将删除全部 ${(db.molds || []).length} 个模具。`
        : lang === "en"
        ? `Will delete all ${(db.molds || []).length} molds.`
        : `Sẽ xóa toàn bộ ${(db.molds || []).length} khuôn máy trong hệ thống.`;
    }
    return lang === "zh"
      ? `将删除 ${info.days} 天排班计划（${range.from} 至 ${range.to}）。`
      : lang === "en"
      ? `Will delete ${info.days} days of schedules (${range.from} to ${range.to}).`
      : `Sẽ xóa ${info.days} ngày kế hoạch sắp đơn (từ ${range.from} đến ${range.to}).`;
  }, [mode, info, db, range, lang]);

  const buttonLabel = useMemo(() => {
    if (mode === "everything") return lang === "zh" ? "清空全部数据" : lang === "en" ? "Delete All Data" : "Xóa toàn bộ dữ liệu";
    if (mode === "allPlans") return lang === "zh" ? "清空全部排班" : lang === "en" ? "Delete All Schedules" : "Xóa toàn bộ kế hoạch";
    if (mode === "range") return lang === "zh" ? "删除选中日期排班" : lang === "en" ? "Delete Schedules in Range" : "Xóa kế hoạch trong khoảng";
    if (mode === "orders") return lang === "zh" ? "清空全部订单" : lang === "en" ? "Delete All Orders" : "Xóa toàn bộ đơn hàng";
    if (mode === "employees") return lang === "zh" ? "清空全部人员" : lang === "en" ? "Delete All Staff" : "Xóa toàn bộ nhân sự";
    if (mode === "molds") return lang === "zh" ? "清空全部模具" : lang === "en" ? "Delete All Molds" : "Xóa toàn bộ khuôn máy";
    return t("deleteData", lang);
  }, [mode, lang]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      if (deleteData) {
        await deleteData({ mode, range, includeLocked: true });
      } else {
        setDb((prev) => {
          if (mode === "everything") {
            return {
              ...prev,
              employees: [],
              molds: [],
              orders: [],
              schedules: {},
              machines: prev.machines.map((m) => ({ ...m, moldId: null, currentOrderId: null })),
            };
          }
          if (mode === "allPlans") return { ...prev, schedules: {} };
          if (mode === "orders") return { ...prev, orders: [] };
          if (mode === "employees") return { ...prev, employees: [] };
          if (mode === "molds") return { ...prev, molds: [], machines: prev.machines.map((m) => ({ ...m, moldId: null })) };
          const next = {};
          Object.entries(prev.schedules || {}).forEach(([d, day]) => {
            const inScope = inRange(d, range.from, range.to);
            if (inScope && day) return;
            next[d] = day;
          });
          return { ...prev, schedules: next };
        });
      }
      pushToast(lang === "zh" ? "已彻底删除数据！" : lang === "en" ? "Data deleted permanently!" : "Đã xóa dữ liệu vĩnh viễn!", "success");
    } catch (err) {
      console.error("Delete failed:", err);
      pushToast(lang === "zh" ? "删除失败: " + err.message : lang === "en" ? "Delete failed: " + err.message : "Lỗi xóa dữ liệu: " + err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const askDelete = () =>
    confirmAction(
      `${summary}\n\n${
        lang === "zh"
          ? "⚠️ 警告：数据将在云端 Supabase 及本地浏览器中永久删除，无法撤销！"
          : lang === "en"
          ? "⚠️ WARNING: Data will be permanently wiped from both Supabase Cloud and local storage. This action CANNOT be undone!"
          : "⚠️ CẢNH BÁO: Dữ liệu sẽ bị xóa VĨNH VIỄN trên Cloud Supabase và trên máy. Hành động này KHÔNG THỂ HOÀN TÁC!"
      }`,
      doDelete,
      {
        title: lang === "zh" ? "确认删除" : lang === "en" ? "Confirm Deletion" : "Xác nhận xóa vĩnh viễn",
        confirmLabel: lang === "zh" ? "确认删除" : lang === "en" ? "Confirm Delete" : "Xác nhận xóa",
        danger: true,
      }
    );

  return (
    <div className={`${card} v-rise v-hover-lift p-6 flex flex-col justify-between h-full`} style={{ "--i": 2 }}>
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="v-stat-icon bg-bad-tint text-bad">
              <Trash2 size={24} />
            </div>
            <Bi vi="Xóa dữ liệu" zh="删除数据" en="Delete Data" viClass="text-lg font-bold text-ink" />
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold">
            <CheckCircle2 size={13} /> Cloud Sync Active
          </span>
        </div>

        <Segmented
          value={mode}
          onChange={setMode}
          items={[
            { key: "everything", label: lang === "zh" ? "全部数据" : lang === "en" ? "All Data" : "Toàn bộ dữ liệu" },
            { key: "allPlans", label: lang === "zh" ? "全部排班" : lang === "en" ? "All Schedules" : "Toàn bộ kế hoạch" },
            { key: "range", label: lang === "zh" ? "按日期范围" : lang === "en" ? "Date Range" : "Theo khoảng ngày" },
            { key: "orders", label: lang === "zh" ? "订单" : lang === "en" ? "Orders" : "Đơn hàng" },
            { key: "employees", label: lang === "zh" ? "人员" : lang === "en" ? "Staff" : "Nhân sự" },
            { key: "molds", label: lang === "zh" ? "模具" : lang === "en" ? "Molds" : "Khuôn máy" },
          ]}
        />

        <p className="mt-3.5 text-sm text-body">{DESC[mode]}</p>

        {mode === "range" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm bg-white p-2.5 rounded-xl border border-line">
            <span className="text-xs text-mute font-semibold">{t("from", lang)}</span>
            <DateFieldVN value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
            <span className="text-xs text-mute font-semibold">{t("to", lang)}</span>
            <DateFieldVN value={range.to} onChange={(v) => setRange({ ...range, to: v })} />
          </div>
        )}

        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium border ${
            rangeInvalid
              ? "bg-bad-tint text-bad border-bad/30"
              : mode === "everything"
              ? "bg-[#FFF5F5] text-[#EE5D50] border-[#EE5D50]/20"
              : "bg-canvas text-body border-line"
          }`}
        >
          {rangeInvalid
            ? lang === "zh"
              ? "开始日期不能晚于结束日期"
              : lang === "en"
              ? "Start date must be on or before end date"
              : "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc"
            : summary}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 pt-3 border-t border-line/60">
        <button
          className={btnDanger}
          disabled={!isAdmin || nothing || rangeInvalid || deleting}
          onClick={askDelete}
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          {" "}
          {deleting
            ? lang === "zh"
              ? "正在从云端彻底删除..."
              : lang === "en"
              ? "Deleting permanently..."
              : "Đang xóa dữ liệu trên hệ thống..."
            : buttonLabel}
        </button>

        {!isAdmin && (
          <span className="text-xs font-medium text-mute">
            {lang === "zh" ? "仅管理员可删除" : lang === "en" ? "Admin only" : "Chỉ ADMIN mới được xóa dữ liệu"}
          </span>
        )}
      </div>
    </div>
  );
}
