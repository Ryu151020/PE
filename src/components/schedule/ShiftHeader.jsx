import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { Bi } from "../ui/Bi";
import { POSITIONS } from "../../lib/constants";

export function LeaderMiniBar({ leaderId, teamLeaderIds, employeesById, shiftLeaders, teamLeaders, editable, onChangeLeader, onChangeTeamLeaders, colorClass }) {
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState("");
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const leaderRef = useRef(null);
  const teamRef = useRef(null);

  const teamNames = teamLeaderIds.map((id) => employeesById[id]?.vietnameseName).filter(Boolean);
  const currentLeader = leaderId ? employeesById[leaderId] : null;

  const filteredShiftLeaders = shiftLeaders.filter((e) =>
    !leaderSearch.trim() || e.vietnameseName.toLowerCase().includes(leaderSearch.toLowerCase().trim())
  );

  const filteredTeamLeaders = teamLeaders.filter((e) =>
    !teamSearch.trim() || e.vietnameseName.toLowerCase().includes(teamSearch.toLowerCase().trim())
  );

  useEffect(() => {
    if (!leaderOpen && !teamOpen) return;
    const handleOutside = (e) => {
      if (leaderOpen && leaderRef.current && !leaderRef.current.contains(e.target)) {
        setLeaderOpen(false);
      }
      if (teamOpen && teamRef.current && !teamRef.current.contains(e.target)) {
        setTeamOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [leaderOpen, teamOpen]);

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 py-1 text-sm ${colorClass}`}>
      <span ref={leaderRef} className="relative flex items-center gap-1">
        <span className="opacity-70 text-xs font-semibold">CT/班长:</span>
        {editable ? (
          <>
            <button
              type="button"
              className="flex items-center gap-1 border border-current bg-white/80 px-2 py-0.5 text-sm rounded-xs max-w-[120px] text-ink"
              onClick={() => setLeaderOpen((v) => !v)}
            >
              <span className="truncate">{currentLeader ? currentLeader.vietnameseName : "—"}</span>
              <ChevronDown size={12} className="opacity-70 shrink-0" />
            </button>
            {leaderOpen && (
              <div className="absolute left-0 top-full z-40 mt-1 w-[200px] border border-line bg-white p-2 shadow-lg rounded-xs text-ink text-left">
                <div className="flex items-center gap-1 border-b border-line pb-1.5 mb-1.5">
                  <Search size={13} className="text-mute shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={leaderSearch}
                    onChange={(e) => setLeaderSearch(e.target.value)}
                    placeholder="Tìm tên... / 搜索..."
                    className="w-full text-sm outline-none bg-transparent"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-0.5">
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1 text-sm text-mute hover:bg-canvas rounded-xs"
                    onClick={() => { onChangeLeader(null); setLeaderOpen(false); }}
                  >
                    — Bỏ chọn / 清空 —
                  </button>
                  {filteredShiftLeaders.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className={`w-full text-left px-2 py-1 text-sm rounded-xs ${leaderId === e.id ? "bg-[#2051A3] text-white" : "hover:bg-canvas text-ink"}`}
                      onClick={() => { onChangeLeader(e.id); setLeaderOpen(false); }}
                    >
                      {e.vietnameseName}
                    </button>
                  ))}
                  {filteredShiftLeaders.length === 0 && (
                    <div className="px-2 py-1 text-xs text-mute">Không tìm thấy / 无结果</div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <span className="font-medium text-sm">{currentLeader ? currentLeader.vietnameseName : "—"}</span>
        )}
      </span>

      <span ref={teamRef} className="relative flex items-center gap-1">
        <span className="opacity-70 text-xs font-semibold">TT/组长:</span>
        {editable ? (
          <button
            type="button"
            className="flex items-center gap-1 border border-current bg-white/80 px-2 py-0.5 text-sm rounded-xs max-w-[150px] text-ink"
            onClick={() => setTeamOpen((v) => !v)}
          >
            <span className="truncate">
              {teamNames.length ? teamNames.join(", ") : "— chọn —"}
            </span>
            <ChevronDown size={12} className="opacity-70 shrink-0" />
          </button>
        ) : (
          <span className="font-medium text-sm">{teamNames.length ? teamNames.join(", ") : "—"}</span>
        )}
        {editable && teamOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 w-[220px] border border-line bg-white p-2 shadow-lg rounded-xs text-ink text-left">
            <div className="flex items-center gap-1 border-b border-line pb-1.5 mb-1.5">
              <Search size={13} className="text-mute shrink-0" />
              <input
                autoFocus
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Tìm tên tổ trưởng... / 搜索..."
                className="w-full text-sm outline-none bg-transparent"
              />
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {filteredTeamLeaders.map((e) => (
                <label key={e.id} className="flex items-center gap-2 px-1.5 py-1 text-sm hover:bg-canvas rounded-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamLeaderIds.includes(e.id)}
                    onChange={(ev) =>
                      onChangeTeamLeaders(
                        ev.target.checked
                          ? [...teamLeaderIds, e.id]
                          : teamLeaderIds.filter((x) => x !== e.id)
                      )
                    }
                  />
                  <span>{e.vietnameseName}</span>
                </label>
              ))}
              {filteredTeamLeaders.length === 0 && (
                <div className="px-2 py-1 text-xs text-mute">Không tìm thấy / 无结果</div>
              )}
            </div>
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
