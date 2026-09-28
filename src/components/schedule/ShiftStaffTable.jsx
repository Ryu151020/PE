import { useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { EMP_STATUS_TAG, POSITIONS } from "../../lib/constants";
import { getPositionLabel, t } from "../../lib/i18n";
import { card } from "../../lib/styles";

/* Combined staff table for one shift, grouped by position */
export function ShiftStaffTable({ title, titleZh, colorClass, leaderId, teamLeaderIds, employeesById, dayData, shiftKey }) {
  const { lang = "vi" } = useApp() || {};
  const groups = useMemo(() => {
    const techSet = new Set(), workerSet = new Set(), otherSet = new Set();
    if (dayData) {
      Object.values(dayData.entries).forEach((e) => {
        const s = e[shiftKey];
        s.technicians.forEach((id) => techSet.add(id));
        s.workers.forEach((id) => workerSet.add(id));
        s.otherWorkers.forEach((id) => otherSet.add(id));
      });
    }
    const rows = [];
    if (leaderId && employeesById[leaderId]) rows.push({ ...employeesById[leaderId], _role: POSITIONS.SHIFT_LEADER });
    teamLeaderIds.forEach((id) => { if (employeesById[id]) rows.push({ ...employeesById[id], _role: POSITIONS.TEAM_LEADER }); });
    [...techSet].map((id) => employeesById[id]).filter(Boolean).sort((a, b) => a.vietnameseName.localeCompare(b.vietnameseName)).forEach((e) => rows.push({ ...e, _role: POSITIONS.TECHNICIAN }));
    [...workerSet].map((id) => employeesById[id]).filter(Boolean).sort((a, b) => a.vietnameseName.localeCompare(b.vietnameseName)).forEach((e) => rows.push({ ...e, _role: POSITIONS.WORKER }));
    [...otherSet].map((id) => employeesById[id]).filter(Boolean).sort((a, b) => a.vietnameseName.localeCompare(b.vietnameseName)).forEach((e) => rows.push({ ...e, _role: POSITIONS.SUPPORT }));
    return rows;
  }, [dayData, leaderId, teamLeaderIds, employeesById, shiftKey]);

  const displayTitle = lang === "zh" ? titleZh : lang === "en" ? (title.includes("Ngày") ? "Day Shift Staff" : "Night Shift Staff") : title;

  return (
    <div className={`${card} p-4`}>
      <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${colorClass}`}>
        <span>{displayTitle}</span>
        <span className="ml-1 rounded-full bg-white/60 px-1.5">{groups.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="pe-thead">
            <tr>
              <th className="px-2 py-1.5 text-left">{t("stt", lang)}</th>
              <th className="px-2 py-1.5 text-left">{t("vnName", lang)}</th>
              <th className="px-2 py-1.5 text-left">{t("cnName", lang)}</th>
              <th className="px-2 py-1.5 text-left">{t("empCode", lang)}</th>
              <th className="px-2 py-1.5 text-left">{t("position", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((e, i) => (
              <tr key={`${e.id}-${e._role}`} className="border-t border-line">
                <td className="px-2 py-1.5">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium">
                  {e.vietnameseName}
                  {EMP_STATUS_TAG[e.status] && (
                    <span className={`ml-1 rad-6 ${EMP_STATUS_TAG[e.status].color} px-1 text-xs font-bold text-white`}>
                      {EMP_STATUS_TAG[e.status].char}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-mute">{e.chineseName || (lang === "zh" ? "未更新" : lang === "en" ? "Not set" : "Chưa cập nhật")}</td>
                <td className="px-2 py-1.5">{e.employeeCode}</td>
                <td className="px-2 py-1.5 font-medium">{getPositionLabel(e._role, lang)}</td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-mute">
                  {lang === "zh" ? "暂无数据" : lang === "en" ? "No data" : "Chưa có dữ liệu"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
