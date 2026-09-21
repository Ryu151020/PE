import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Bi } from "../ui/Bi";
import { POSITIONS } from "../../lib/constants";

export function LeaderMiniBar({ leaderId, teamLeaderIds, employeesById, shiftLeaders, teamLeaders, editable, onChangeLeader, onChangeTeamLeaders, colorClass }) {
  const [teamOpen, setTeamOpen] = useState(false);
  const teamNames = teamLeaderIds.map((id) => employeesById[id]?.vietnameseName).filter(Boolean);
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 py-1 ${colorClass}`}>
      <span className="flex items-center gap-1">
        <span className="opacity-70">CT/班长:</span>
        {editable ? (
          <select className="rad-6 border border-current bg-white/70 text-xs py-0.5" style={{ maxWidth: 90 }} value={leaderId || ""} onChange={(e) => onChangeLeader(e.target.value || null)}>
            <option value="">—</option>
            {shiftLeaders.map((e) => <option key={e.id} value={e.id}>{e.vietnameseName}</option>)}
          </select>
        ) : (<span className="font-medium">{leaderId ? employeesById[leaderId]?.vietnameseName : "—"}</span>)}
      </span>
      <span className="relative flex items-center gap-1">
        <span className="opacity-70">TT/组长:</span>
        {editable ? (
          <button className="rad-6 border border-current bg-white/70 px-1.5 text-xs" onClick={() => setTeamOpen((v) => !v)}>{teamNames.length ? teamNames.join(", ").slice(0, 16) + (teamNames.join(",").length > 16 ? "…" : "") : "— chọn —"}</button>
        ) : (<span className="font-medium">{teamNames.length ? teamNames.join(", ") : "—"}</span>)}
        {editable && teamOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 rad-14 border border-line bg-white p-2 sh-soft text-ink" style={{ width: 200 }} onMouseLeave={() => setTeamOpen(false)}>
            {teamLeaders.map((e) => (
              <label key={e.id} className="flex items-center gap-2 rad-6 px-1 py-1 text-xs hover:bg-canvas cursor-pointer">
                <input type="checkbox" checked={teamLeaderIds.includes(e.id)} onChange={(ev) => onChangeTeamLeaders(ev.target.checked ? [...teamLeaderIds, e.id] : teamLeaderIds.filter((x) => x !== e.id))} />
                {e.vietnameseName}
              </label>
            ))}
          </div>
        )}
      </span>
    </div>
  );
}

export function ShiftHeader({ dayData, employees, employeesById, editable, onChangeLeaders, dayCollapsed, nightCollapsed, onToggleDay, onToggleNight }) {
  const shiftLeaders = employees.filter((e) => e.position === POSITIONS.SHIFT_LEADER);
  const teamLeaders = employees.filter((e) => e.position === POSITIONS.TEAM_LEADER);
  const L0 = 0, L1 = 56, L2 = 176, W0 = 56, W1 = 120, W2 = 140; // sticky left offsets: STT | Trạng thái | Khuôn
  return (
    <thead className="sticky top-0 z-20">
      <tr className="text-xs">
        <th rowSpan={3} className="z-30 pe-th border-b border-r border-line px-3 py-3 font-bold" style={{ position: "sticky", left: L0, width: W0, minWidth: W0, maxWidth: W0 }}><Bi vi="STT" zh="序号" center /></th>
        <th rowSpan={3} className="z-30 pe-th border-b border-r border-line px-3 py-3 font-bold text-left" style={{ position: "sticky", left: L1, width: W1, minWidth: W1, maxWidth: W1 }}><Bi vi="Trạng thái máy" zh="机器状态" /></th>
        <th rowSpan={3} className="z-30 pe-th border-b border-r border-line px-3 py-3 font-bold text-left" style={{ position: "sticky", left: L2, width: W2, minWidth: W2, maxWidth: W2, boxShadow: "8px 0 8px -8px rgba(112,144,176,0.28)" }}><Bi vi="Khuôn máy" zh="模具" /></th>
        <th rowSpan={3} className="pe-th border-b border-r border-line px-3 py-3 font-bold text-left" style={{ minWidth: 120 }}><Bi vi="Đơn hàng" zh="订单" /></th>
        <th rowSpan={3} className="pe-th border-b border-r border-line px-3 py-3 font-bold text-left" style={{ minWidth: 110 }}><Bi vi="Cuộn màng" zh="卷膜" /></th>
        {dayCollapsed ? (
          <th rowSpan={3} className="bg-day-head text-warn border-b border-r border-day p-0 text-center cursor-pointer hover:bg-day-head-hover" style={{ width: 26, minWidth: 26 }} onClick={onToggleDay} title="Mở rộng ca ngày / 展开白班">
            <div className="flex h-full flex-col items-center justify-center gap-1 py-2">
              <Plus size={11} />
              <span className="font-bold" style={{ writingMode: "vertical-rl" }}>Ca ngày</span>
            </div>
          </th>
        ) : (
          <th colSpan={4} className="bg-day-head text-warn border-b border-r border-day p-0 text-center">
            <div className="flex items-center justify-center gap-1.5 py-1">
              <Bi vi="CA NGÀY" zh="白班" center viClass="font-bold text-xs" />
              <button className="rad-6 px-1 text-warn hover:bg-day-head-hover" onClick={onToggleDay} title="Thu gọn ca ngày / 收起白班"><ChevronLeft size={13} /></button>
            </div>
          </th>
        )}
        {nightCollapsed ? (
          <th rowSpan={3} className="bg-night-head text-white border-b border-night-head p-0 text-center cursor-pointer hover:bg-night-head-hover" style={{ width: 26, minWidth: 26 }} onClick={onToggleNight} title="Mở rộng ca đêm / 展开夜班">
            <div className="flex h-full flex-col items-center justify-center gap-1 py-2">
              <Plus size={11} />
              <span className="font-bold" style={{ writingMode: "vertical-rl" }}>Ca đêm</span>
            </div>
          </th>
        ) : (
          <th colSpan={4} className="bg-night-head text-white border-b border-night-head p-0 text-center">
            <div className="flex items-center justify-center gap-1.5 py-1">
              <button className="rad-6 px-1 text-night-soft hover:bg-night-head-hover" onClick={onToggleNight} title="Thu gọn ca đêm / 收起夜班"><ChevronRight size={13} /></button>
              <Bi vi="CA ĐÊM" zh="夜班" center viClass="font-bold text-xs" />
            </div>
          </th>
        )}
      </tr>
      <tr className="text-xs">
        {!dayCollapsed && (
          <th colSpan={4} className="bg-day-soft border-b border-r border-day p-0">
            <LeaderMiniBar leaderId={dayData.dayLeader} teamLeaderIds={dayData.dayTeamLeaders} employeesById={employeesById} shiftLeaders={shiftLeaders} teamLeaders={teamLeaders} editable={editable} colorClass="text-warn font-semibold"
              onChangeLeader={(id) => onChangeLeaders({ ...dayData, dayLeader: id })} onChangeTeamLeaders={(ids) => onChangeLeaders({ ...dayData, dayTeamLeaders: ids })} />
          </th>
        )}
        {!nightCollapsed && (
          <th colSpan={4} className="bg-night-tint border-b border-night p-0">
            <LeaderMiniBar leaderId={dayData.nightLeader} teamLeaderIds={dayData.nightTeamLeaders} employeesById={employeesById} shiftLeaders={shiftLeaders} teamLeaders={teamLeaders} editable={editable} colorClass="text-night font-semibold"
              onChangeLeader={(id) => onChangeLeaders({ ...dayData, nightLeader: id })} onChangeTeamLeaders={(ids) => onChangeLeaders({ ...dayData, nightTeamLeaders: ids })} />
          </th>
        )}
      </tr>
      <tr className="text-xs">
        {!dayCollapsed && (<>
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-left" style={{ minWidth: 210 }}><Bi vi="Công nhân" zh="工人" /></th>
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-left" style={{ minWidth: 70 }}><Bi vi="Tăng ca" zh="加班" /></th>
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-left" style={{ minWidth: 110 }}><Bi vi="Kỹ thuật viên" zh="技术员" /></th>
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-left" style={{ minWidth: 110 }}><Bi vi="Công nhân khác" zh="其他工人" /></th>
        </>)}
        {!nightCollapsed && (<>
          <th className="bg-night-tint border-b border-r border-night px-2 py-1.5 text-night font-bold text-left" style={{ minWidth: 210 }}><Bi vi="Công nhân" zh="工人" /></th>
          <th className="bg-night-tint border-b border-r border-night px-2 py-1.5 text-night font-bold text-left" style={{ minWidth: 70 }}><Bi vi="Tăng ca" zh="加班" /></th>
          <th className="bg-night-tint border-b border-r border-night px-2 py-1.5 text-night font-bold text-left" style={{ minWidth: 110 }}><Bi vi="Kỹ thuật viên" zh="技术员" /></th>
          <th className="bg-night-tint border-b border-night px-2 py-1.5 text-night font-bold text-left" style={{ minWidth: 110 }}><Bi vi="Công nhân khác" zh="其他工人" /></th>
        </>)}
      </tr>
    </thead>
  );
}
