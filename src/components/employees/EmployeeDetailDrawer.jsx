import { useMemo } from "react";
import { Undo2 } from "lucide-react";
import { StatusBadge } from "../ui/Badges";
import { Drawer } from "../ui/Overlays";
import { useApp } from "../../context/AppContext";
import { EMP_STATUS, EMP_STATUS_COLOR, EMP_STATUS_ZH } from "../../lib/constants";
import { formatSeniority, toDisplay } from "../../lib/dates";
import { getPositionLabel, getResignReasonLabel, t } from "../../lib/i18n";
import { btnSecondary } from "../../lib/styles";

export function EmployeeDetailDrawer({ employee, onClose, machinesById, ordersById, moldsById, schedules, onRestore }) {
  const { lang = "vi" } = useApp() || {};
  const history = useMemo(() => {
    if (!employee) return [];
    const rows = [];
    Object.entries(schedules).sort(([a], [b]) => (a < b ? 1 : -1)).forEach(([date, day]) => {
      if (!day) return;
      Object.values(day.entries).forEach((entry) => {
        const inDay = entry.dayShift.workers.includes(employee.id), inNight = entry.nightShift.workers.includes(employee.id);
        if (!inDay && !inNight) return;
        const ot = inDay ? entry.dayShift.overtimeHours : entry.nightShift.overtimeHours;
        rows.push({ date, machineId: entry.machineId, orderId: entry.orderId, moldId: entry.moldId, shift: inDay ? "Ngày" : "Đêm", ot: ot || 0 });
      });
    });
    return rows.slice(0, 30);
  }, [employee, schedules]);

  return (
    <Drawer open={!!employee} onClose={onClose} title={employee ? employee.vietnameseName : ""}>
      {employee && (
        <div className="space-y-5 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-full bg-brand-tint2 text-lg font-bold text-brand" style={{ height: 48, width: 48 }}>
              {employee.vietnameseName.split(" ").pop()?.[0]}
            </div>
            <div>
              <div className="font-semibold text-ink">{employee.vietnameseName}</div>
              <div className="text-xs text-mute">{employee.chineseName || (lang === "zh" ? "未填写" : lang === "en" ? "Not set" : "Chưa cập nhật")} · {employee.employeeCode}</div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1.5">
              <StatusBadge vi={employee.status} zh={EMP_STATUS_ZH[employee.status]} className={EMP_STATUS_COLOR[employee.status]} />
              {employee.status === EMP_STATUS.RESIGNED && onRestore && (
                <button className={btnSecondary} onClick={() => onRestore(employee)}>
                  <Undo2 size={13} /> {lang === "zh" ? "恢复" : lang === "en" ? "Restore" : "Khôi phục"}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 rad-14 bg-canvas p-3">
            <span className="text-mute">{t("position", lang)}</span>
            <span className="text-ink font-medium">{getPositionLabel(employee.position, lang)}</span>
            <span className="text-mute">{t("joinDate", lang)}</span>
            <span className="text-ink font-medium">{employee.joinDate}</span>
            <span className="text-mute">{t("resignDate", lang)}</span>
            <span className="text-ink font-medium">{employee.resignDate || "—"}</span>
            <span className="text-mute">{t("seniority", lang)}</span>
            <span className="text-ink font-medium">{formatSeniority(employee.joinDate, employee.resignDate)}</span>
            {employee.resignReason && (
              <>
                <span className="text-mute">{lang === "zh" ? "离职原因" : lang === "en" ? "Resign Reason" : "Lý do nghỉ"}</span>
                <span className="text-ink font-medium">{getResignReasonLabel(employee.resignReason, lang)}</span>
              </>
            )}
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-mute">{lang === "zh" ? "工作历史" : lang === "en" ? "Work History" : "Lịch sử làm việc"}</div>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div key={i} className="rad-14 border border-line px-3 py-2 text-xs">
                  <div className="flex items-center justify-between font-medium text-ink">
                    <span>{toDisplay(h.date)}</span>
                    <span>{h.shift === "Ngày" ? t("dayShift", lang) : t("nightShift", lang)}</span>
                  </div>
                  <div className="mt-0.5 text-mute">
                    {lang === "zh" ? "机器" : lang === "en" ? "Machine" : "Máy"} {machinesById[h.machineId]?.machineNumber} · {ordersById[h.orderId]?.orderCode || "—"} · {moldsById[h.moldId]?.moldName || "—"}
                    {h.ot > 0 && <span className="ml-1 text-warn">· OT {h.ot}h</span>}
                  </div>
                </div>
              ))}
              {history.length === 0 && <div className="py-6 text-center text-mute">{lang === "zh" ? "暂无记录" : lang === "en" ? "No history" : "Chưa có lịch sử"}</div>}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
