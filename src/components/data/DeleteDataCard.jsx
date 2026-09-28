import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PLAN_STATUS, ROLES } from "../../lib/constants";
import { TODAY_KEY, inRange } from "../../lib/dates";
import { t } from "../../lib/i18n";
import { btnDanger, card } from "../../lib/styles";
import { Bi } from "../ui/Bi";
import { DateFieldVN } from "../ui/Fields";
import { Segmented } from "../ui/Segmented";

/* Delete data: by date range, all plans, or everything */
export function DeleteDataCard({ db, setDb, role, pushToast, confirmAction, scheduleDates }) {
  const { lang = "vi" } = useApp() || {};
  const [mode, setMode] = useState("range");
  const [range, setRange] = useState(() => ({ from: scheduleDates[0] || TODAY_KEY, to: scheduleDates[scheduleDates.length - 1] || TODAY_KEY }));
  const isAdmin = role === ROLES.ADMIN;

  const info = useMemo(() => {
    let days = 0, locked = 0;
    Object.entries(db.schedules).forEach(([d, day]) => {
      if (!day) return;
      if (mode === "range" && !inRange(d, range.from, range.to)) return;
      if (mode !== "everything" && day.status === PLAN_STATUS.LOCKED) { locked++; return; }
      days++;
    });
    return { days, locked };
  }, [db.schedules, mode, range]);

  const rangeInvalid = mode === "range" && range.from > range.to;
  const nothing = mode !== "everything" && info.days === 0;

  const DESC = {
    range: lang === "zh"
      ? "删除所选日期范围内的排班，已锁定的排班将保留。"
      : lang === "en"
      ? "Delete schedules within the selected date range. Locked schedules are kept."
      : "Xóa kế hoạch sắp đơn của các ngày trong khoảng đã chọn. Kế hoạch đã khóa sẽ được giữ lại.",
    allPlans: lang === "zh"
      ? "删除全部排班，模具、订单、人员保留。"
      : lang === "en"
      ? "Delete all schedules; molds, orders and personnel are preserved."
      : "Xóa kế hoạch của mọi ngày; giữ nguyên khuôn, đơn hàng và nhân sự. Kế hoạch đã khóa sẽ được giữ lại.",
    everything: lang === "zh"
      ? "删除全部数据（排班、模具、订单、人员）。保留机器列表。"
      : lang === "en"
      ? "Delete ALL data: schedules, molds, orders, and personnel. Machine list is kept."
      : "Xóa TẤT CẢ: kế hoạch (kể cả đã khóa), khuôn, đơn hàng và nhân sự. Danh sách máy được giữ lại.",
  };

  const summary = mode === "everything"
    ? (lang === "zh"
        ? `将删除 ${info.days} 天计划、${db.molds.length} 个模具、${db.orders.length} 个订单、${db.employees.length} 名员工。`
        : lang === "en"
        ? `Will delete ${info.days} days of schedules, ${db.molds.length} molds, ${db.orders.length} orders, ${db.employees.length} staff.`
        : `Sẽ xóa ${info.days} ngày kế hoạch, ${db.molds.length} khuôn, ${db.orders.length} đơn hàng, ${db.employees.length} nhân sự.`)
    : (lang === "zh"
        ? `将删除 ${info.days} 天计划${info.locked > 0 ? ` (保留 ${info.locked} 天已锁定)` : ""}。`
        : lang === "en"
        ? `Will delete ${info.days} days of schedules${info.locked > 0 ? ` (keeping ${info.locked} locked)` : ""}.`
        : `Sẽ xóa ${info.days} ngày kế hoạch${info.locked > 0 ? ` (giữ lại ${info.locked} ngày đã khóa)` : ""}.`);

  const doDelete = () => {
    setDb((prev) => {
      if (mode === "everything") return { ...prev, employees: [], molds: [], orders: [], schedules: {}, machines: prev.machines.map((m) => ({ ...m, moldId: null, currentOrderId: null })) };
      const next = {};
      Object.entries(prev.schedules).forEach(([d, day]) => {
        const inScope = mode === "allPlans" || inRange(d, range.from, range.to);
        if (inScope && day && day.status !== PLAN_STATUS.LOCKED) return;
        next[d] = day;
      });
      return { ...prev, schedules: next };
    });
    pushToast(lang === "zh" ? "已删除数据" : lang === "en" ? "Data deleted" : "Đã xóa dữ liệu", "success");
  };

  const askDelete = () => confirmAction(
    `${summary}\n${lang === "zh" ? "此操作无法撤销。" : lang === "en" ? "This action cannot be undone." : "Hành động này không thể hoàn tác."}`,
    doDelete,
    {
      title: lang === "zh" ? "删除数据" : lang === "en" ? "Delete Data" : "Xóa dữ liệu",
      confirmLabel: lang === "zh" ? "删除" : lang === "en" ? "Delete" : "Xóa",
      danger: true,
    }
  );

  return (
    <div className={`${card} v-rise v-hover-lift p-6 flex flex-col justify-between h-full`} style={{ "--i": 2 }}>
      <div>
        <div className="mb-4 flex items-center gap-4">
          <div className="v-stat-icon bg-bad-tint text-bad"><Trash2 size={24} /></div>
          <Bi vi="Xóa dữ liệu" zh="删除数据" en="Delete Data" viClass="text-lg font-bold text-ink" />
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          items={[
            { key: "range", label: lang === "zh" ? "按日期范围" : lang === "en" ? "Date Range" : "Theo khoảng ngày" },
            { key: "allPlans", label: lang === "zh" ? "全部排班" : lang === "en" ? "All Schedules" : "Toàn bộ kế hoạch" },
            { key: "everything", label: lang === "zh" ? "全部数据" : lang === "en" ? "All Data" : "Toàn bộ dữ liệu" },
          ]}
        />
        <p className="mt-4 text-sm text-body">{DESC[mode]}</p>
        {mode === "range" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs text-mute font-semibold">{t("from", lang)}</span>
            <DateFieldVN value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
            <span className="text-xs text-mute font-semibold">{t("to", lang)}</span>
            <DateFieldVN value={range.to} onChange={(v) => setRange({ ...range, to: v })} />
          </div>
        )}
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${rangeInvalid ? "bg-bad-tint text-bad" : mode === "everything" ? "bg-bad-tint text-bad" : "bg-canvas text-body"}`}>
          {rangeInvalid
            ? (lang === "zh" ? "开始日期不能晚于结束日期" : lang === "en" ? "Start date must be on or before end date" : "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc")
            : summary}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className={btnDanger} disabled={!isAdmin || nothing || rangeInvalid} onClick={askDelete}>
          <Trash2 size={14} /> {t("deleteData", lang)}
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
