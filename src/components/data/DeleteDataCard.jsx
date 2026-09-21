import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Bi } from "../ui/Bi";
import { DateFieldVN } from "../ui/Fields";
import { Segmented } from "../ui/Segmented";
import { PLAN_STATUS, ROLES } from "../../lib/constants";
import { TODAY_KEY, inRange } from "../../lib/dates";
import { btnDanger, card } from "../../lib/styles";

/* Delete data: by date range, all plans, or everything. Locked plans are protected except in "everything". */
export function DeleteDataCard({ db, setDb, role, pushToast, confirmAction, scheduleDates }) {
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
    range: "Xóa kế hoạch sắp đơn của các ngày trong khoảng đã chọn. Kế hoạch đã khóa sẽ được giữ lại. / 删除所选日期范围内的排班，已锁定的排班将保留。",
    allPlans: "Xóa kế hoạch của mọi ngày; giữ nguyên khuôn, đơn hàng và nhân sự. Kế hoạch đã khóa sẽ được giữ lại. / 删除全部排班，模具、订单、人员保留。",
    everything: "Xóa TẤT CẢ: kế hoạch (kể cả đã khóa), khuôn, đơn hàng và nhân sự. Danh sách máy được giữ lại. / 删除全部数据（排班、模具、订单、人员）。",
  };
  const summary = mode === "everything"
    ? `Sẽ xóa ${info.days} ngày kế hoạch, ${db.molds.length} khuôn, ${db.orders.length} đơn hàng, ${db.employees.length} nhân sự.`
    : `Sẽ xóa ${info.days} ngày kế hoạch${info.locked > 0 ? ` (giữ lại ${info.locked} ngày đã khóa)` : ""}.`;
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
    pushToast("Đã xóa dữ liệu / 已删除数据", "success");
  };
  const askDelete = () => confirmAction(
    `${summary}\nHành động này không thể hoàn tác. / 此操作无法撤销。`,
    doDelete,
    { title: "Xóa dữ liệu / 删除数据", confirmLabel: "Xóa / 删除", danger: true }
  );
  return (
    <div className={`${card} v-rise p-6`} style={{ "--i": 2 }}>
      <div className="mb-4 flex items-center gap-4">
        <div className="v-stat-icon bg-bad-tint text-bad"><Trash2 size={24} /></div>
        <Bi vi="Xóa dữ liệu" zh="删除数据" viClass="text-lg font-bold text-ink" zhClass="text-sm font-medium text-mute" />
      </div>
      <Segmented value={mode} onChange={setMode} items={[
        { key: "range", label: "Theo khoảng ngày / 按日期范围" },
        { key: "allPlans", label: "Toàn bộ kế hoạch / 全部排班" },
        { key: "everything", label: "Toàn bộ dữ liệu / 全部数据" },
      ]} />
      <p className="mt-4 text-sm text-body">{DESC[mode]}</p>
      {mode === "range" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs text-mute">Từ / 从</span><DateFieldVN value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
          <span className="text-xs text-mute">Đến / 到</span><DateFieldVN value={range.to} onChange={(v) => setRange({ ...range, to: v })} />
        </div>
      )}
      <div className={`mt-4 rad-14 px-4 py-3 text-sm font-medium ${rangeInvalid ? "bg-bad-tint text-bad" : mode === "everything" ? "bg-bad-tint text-bad" : "bg-canvas text-body"}`}>
        {rangeInvalid ? "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc / 开始日期不能晚于结束日期" : summary}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={btnDanger} disabled={!isAdmin || nothing || rangeInvalid} onClick={askDelete}><Trash2 size={14} /> Xóa dữ liệu / 删除数据</button>
        {!isAdmin && <span className="text-xs font-medium text-mute">Chỉ ADMIN mới được xóa dữ liệu / 仅管理员可删除</span>}
      </div>
    </div>
  );
}
