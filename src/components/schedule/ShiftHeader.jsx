import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { POSITIONS } from "../../lib/constants";
import { t } from "../../lib/i18n";
import { Bi } from "../ui/Bi";

export function LeaderMiniBar({ leaderId, teamLeaderIds, employeesById, shiftLeaders, teamLeaders, editable, onChangeLeader, onChangeTeamLeaders, colorClass }) {
  const { lang = "vi" } = useApp() || {};
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState("");
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const leaderRef = useRef(null);
  const leaderDropdownRef = useRef(null);
  const teamRef = useRef(null);
  const teamDropdownRef = useRef(null);
  const [leaderCoords, setLeaderCoords] = useState({ isFlipUp: false, top: 0, bottom: 0, left: 0, width: 220 });
  const [teamCoords, setTeamCoords] = useState({ isFlipUp: false, top: 0, bottom: 0, left: 0, width: 240 });

  const teamNames = teamLeaderIds.map((id) => employeesById[id]?.vietnameseName).filter(Boolean);
  const currentLeader = leaderId ? employeesById[leaderId] : null;

  const filteredShiftLeaders = shiftLeaders.filter((e) =>
    !leaderSearch.trim() || e.vietnameseName.toLowerCase().includes(leaderSearch.toLowerCase().trim())
  );

  const filteredTeamLeaders = teamLeaders.filter((e) =>
    !teamSearch.trim() || e.vietnameseName.toLowerCase().includes(teamSearch.toLowerCase().trim())
  );

  const updateLeaderPosition = () => {
    if (!leaderRef.current) return;
    const rect = leaderRef.current.getBoundingClientRect();
    const width = 220;
    let left = rect.left;
    if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 10;
    if (left < 10) left = 10;
    const spaceBelow = window.innerHeight - rect.bottom;
    const isFlipUp = spaceBelow < 220 && rect.top > spaceBelow;
    setLeaderCoords({
      isFlipUp,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left,
      width,
    });
  };

  const updateTeamPosition = () => {
    if (!teamRef.current) return;
    const rect = teamRef.current.getBoundingClientRect();
    const width = 240;
    let left = rect.left;
    if (left + width > window.innerWidth - 10) left = window.innerWidth - width - 10;
    if (left < 10) left = 10;
    const spaceBelow = window.innerHeight - rect.bottom;
    const isFlipUp = spaceBelow < 250 && rect.top > spaceBelow;
    setTeamCoords({
      isFlipUp,
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
      left,
      width,
    });
  };

  useEffect(() => {
    if (!leaderOpen) return;
    updateLeaderPosition();
    const handleOutside = (e) => {
      if (
        leaderDropdownRef.current &&
        !leaderDropdownRef.current.contains(e.target) &&
        leaderRef.current &&
        !leaderRef.current.contains(e.target)
      ) {
        setLeaderOpen(false);
      }
    };
    const handleScroll = (e) => {
      if (leaderDropdownRef.current && leaderDropdownRef.current.contains(e.target)) return;
      updateLeaderPosition();
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateLeaderPosition);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateLeaderPosition);
    };
  }, [leaderOpen]);

  useEffect(() => {
    if (!teamOpen) return;
    updateTeamPosition();
    const handleOutside = (e) => {
      if (
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(e.target) &&
        teamRef.current &&
        !teamRef.current.contains(e.target)
      ) {
        setTeamOpen(false);
      }
    };
    const handleScroll = (e) => {
      if (teamDropdownRef.current && teamDropdownRef.current.contains(e.target)) return;
      updateTeamPosition();
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updateTeamPosition);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updateTeamPosition);
    };
  }, [teamOpen]);

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 py-1 text-sm ${colorClass}`}>
      <span ref={leaderRef} className="relative flex items-center gap-1">
        <span className="opacity-70 text-xs font-semibold">{t("shiftLeaderShort", lang)}:</span>
        {editable ? (
          <>
            <button
              type="button"
              className="flex items-center gap-1 border border-transparent hover:border-current bg-white/40 hover:bg-white/90 px-2 py-0.5 text-xs rounded-xs text-ink transition-colors cursor-pointer"
              onClick={() => {
                if (!leaderOpen) {
                  updateLeaderPosition();
                  setLeaderSearch("");
                }
                setLeaderOpen((v) => !v);
              }}
            >
              <span className="whitespace-nowrap min-w-[20px]">{currentLeader ? currentLeader.vietnameseName : ""}</span>
              <ChevronDown size={12} className="opacity-60 shrink-0" />
            </button>
            {leaderOpen &&
              createPortal(
                <div
                  ref={leaderDropdownRef}
                  style={{
                    position: "fixed",
                    ...(leaderCoords.isFlipUp ? { bottom: leaderCoords.bottom } : { top: leaderCoords.top }),
                    left: leaderCoords.left,
                    width: leaderCoords.width,
                    zIndex: 99999,
                  }}
                  className="max-h-64 overflow-hidden border border-line bg-white shadow-2xl rounded-md flex flex-col animate-in fade-in zoom-in-95 duration-100 text-sm"
                >
                  <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2 bg-canvas">
                    <Search size={14} className="text-mute shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={leaderSearch}
                      onChange={(e) => setLeaderSearch(e.target.value)}
                      placeholder={t("searchLeader", lang)}
                      className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute"
                    />
                    {leaderSearch && (
                      <button
                        type="button"
                        onClick={() => setLeaderSearch("")}
                        className="text-mute hover:text-ink cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1">
                    <div
                      onClick={() => {
                        onChangeLeader(null);
                        setLeaderOpen(false);
                      }}
                      className="cursor-pointer px-2.5 py-1.5 text-sm text-mute hover:bg-canvas rounded-xs"
                    >
                      — {lang === "zh" ? "留空" : lang === "en" ? "Empty" : "Để trống"} —
                    </div>
                    {filteredShiftLeaders.length === 0 ? (
                      <div className="px-2.5 py-3 text-center text-sm text-mute">{t("notFound", lang)}</div>
                    ) : (
                      filteredShiftLeaders.map((e) => {
                        const isSelected = leaderId === e.id;
                        return (
                          <div
                            key={e.id}
                            onClick={() => {
                              onChangeLeader(e.id);
                              setLeaderOpen(false);
                            }}
                            className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-sm rounded-xs cursor-pointer ${
                              isSelected ? "bg-[#2051A3] text-white" : "text-ink hover:bg-canvas"
                            }`}
                          >
                            <span>{e.vietnameseName}</span>
                            {e.chineseName && (
                              <span className={`text-xs ${isSelected ? "text-white/80" : "text-mute"}`}>
                                {e.chineseName}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>,
                document.body
              )}
          </>
        ) : (
          <span className="font-medium text-xs">{currentLeader ? currentLeader.vietnameseName : ""}</span>
        )}
      </span>

      <span ref={teamRef} className="relative flex items-center gap-1">
        <span className="opacity-70 text-xs font-semibold">{t("teamLeaderShort", lang)}:</span>
        {editable ? (
          <>
            <button
              type="button"
              className="flex items-center gap-1 border border-transparent hover:border-current bg-white/40 hover:bg-white/90 px-2 py-0.5 text-xs rounded-xs text-ink transition-colors cursor-pointer"
              onClick={() => {
                if (!teamOpen) {
                  updateTeamPosition();
                  setTeamSearch("");
                }
                setTeamOpen((v) => !v);
              }}
            >
              <span className="whitespace-nowrap min-w-[20px]">
                {teamNames.length ? teamNames.join(", ") : ""}
              </span>
              <ChevronDown size={12} className="opacity-60 shrink-0" />
            </button>
            {teamOpen &&
              createPortal(
                <div
                  ref={teamDropdownRef}
                  style={{
                    position: "fixed",
                    ...(teamCoords.isFlipUp ? { bottom: teamCoords.bottom } : { top: teamCoords.top }),
                    left: teamCoords.left,
                    width: teamCoords.width,
                    zIndex: 99999,
                  }}
                  className="max-h-64 overflow-hidden border border-line bg-white shadow-2xl rounded-md flex flex-col animate-in fade-in zoom-in-95 duration-100 text-sm"
                >
                  <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2 bg-canvas">
                    <Search size={14} className="text-mute shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder={t("searchTeamLeader", lang)}
                      className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute"
                    />
                    {teamSearch && (
                      <button
                        type="button"
                        onClick={() => setTeamSearch("")}
                        className="text-mute hover:text-ink cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
                    {filteredTeamLeaders.length === 0 ? (
                      <div className="px-2.5 py-3 text-center text-sm text-mute">{t("notFound", lang)}</div>
                    ) : (
                      filteredTeamLeaders.map((e) => {
                        const checked = teamLeaderIds.includes(e.id);
                        return (
                          <label
                            key={e.id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-xs cursor-pointer transition-colors ${
                              checked ? "bg-brand/10 text-brand font-medium" : "text-ink hover:bg-canvas"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(ev) =>
                                onChangeTeamLeaders(
                                  ev.target.checked
                                    ? [...teamLeaderIds, e.id]
                                    : teamLeaderIds.filter((x) => x !== e.id)
                                )
                              }
                              className="rounded border-line text-brand focus:ring-brand cursor-pointer"
                            />
                            <span className="flex-1">{e.vietnameseName}</span>
                            {e.chineseName && <span className="text-xs text-mute">{e.chineseName}</span>}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>,
                document.body
              )}
          </>
        ) : (
          <span className="font-medium text-xs">{teamNames.length ? teamNames.join(", ") : ""}</span>
        )}
      </span>
    </div>
  );
}

export function ShiftHeader({ dayData, employees, employeesById, editable, onChangeLeaders, dayCollapsed, nightCollapsed, onToggleDay, onToggleNight }) {
  const { lang = "vi" } = useApp() || {};
  const shiftLeaders = employees.filter((e) => e.position === POSITIONS.SHIFT_LEADER);
  const teamLeaders = employees.filter((e) => e.position === POSITIONS.TEAM_LEADER);
  const L0 = 0, L1 = 70, L2 = 190, W0 = 70, W1 = 120, W2 = 140; // sticky left offsets: Số máy | Trạng thái | Khuôn

  return (
    <thead className="sticky top-0 z-20">
      <tr className="text-xs">
        <th rowSpan={3} className="z-30 pe-th border-b border-r border-line px-2 py-3 font-bold text-center align-middle text-black !bg-white bg-white" style={{ position: "sticky", left: L0, width: W0, minWidth: W0, maxWidth: W0 }}>
          <Bi vi="Số máy" zh="机台号" en="Machine No." center viClass="font-bold text-black text-sm" zhClass="font-bold text-black text-sm" enClass="font-bold text-black text-sm" />
        </th>
        <th rowSpan={3} className="z-30 pe-th border-b border-r border-line px-3 py-3 font-bold text-center align-middle text-black !bg-white bg-white" style={{ position: "sticky", left: L1, width: W1, minWidth: W1, maxWidth: W1 }}>
          <Bi vi="Trạng thái máy" zh="机器状态" en="Machine Status" center viClass="font-bold text-black text-sm" zhClass="font-bold text-black text-sm" enClass="font-bold text-black text-sm" />
        </th>
        <th rowSpan={3} className="z-30 pe-th border-b border-r border-line px-3 py-3 font-bold text-center align-middle text-black !bg-white bg-white" style={{ position: "sticky", left: L2, width: W2, minWidth: W2, maxWidth: W2, boxShadow: "8px 0 8px -8px rgba(112,144,176,0.28)" }}>
          <Bi vi="Khuôn máy" zh="模具" en="Mold" center viClass="font-bold text-black text-sm" zhClass="font-bold text-black text-sm" enClass="font-bold text-black text-sm" />
        </th>
        <th rowSpan={3} className="pe-th border-b border-r border-line px-3 py-3 font-bold text-center align-middle text-black !bg-white bg-white" style={{ minWidth: 120 }}>
          <Bi vi="Đơn hàng" zh="订单" en="Order" center viClass="font-bold text-black text-sm" zhClass="font-bold text-black text-sm" enClass="font-bold text-black text-sm" />
        </th>
        <th rowSpan={3} className="pe-th border-b border-r border-line px-3 py-3 font-bold text-center align-middle text-black !bg-white bg-white" style={{ minWidth: 110 }}>
          <Bi vi="Cuộn màng" zh="卷膜" en="Film Roll" center viClass="font-bold text-black text-sm" zhClass="font-bold text-black text-sm" enClass="font-bold text-black text-sm" />
        </th>
        {dayCollapsed ? (
          <th rowSpan={3} className="bg-day-head text-warn border-b border-r border-day p-0 text-center cursor-pointer hover:bg-day-head-hover" style={{ width: 26, minWidth: 26 }} onClick={onToggleDay} title={t("expandDayShift", lang)}>
            <div className="flex h-full flex-col items-center justify-center gap-1 py-2">
              <Plus size={11} />
              <span className="font-bold" style={{ writingMode: "vertical-rl" }}>{t("dayShift", lang)}</span>
            </div>
          </th>
        ) : (
          <th colSpan={4} className="bg-day-head text-warn border-b border-r border-day p-0 text-center">
            <div className="flex items-center justify-center gap-1.5 py-1">
              <Bi vi="CA NGÀY" zh="白班" en="DAY SHIFT" center viClass="font-bold text-xs" />
              <button className="rad-6 px-1 text-warn hover:bg-day-head-hover" onClick={onToggleDay} title={t("collapseDayShift", lang)}>
                <ChevronLeft size={13} />
              </button>
            </div>
          </th>
        )}
        {nightCollapsed ? (
          <th rowSpan={3} className="bg-night-head text-white border-b border-night-head p-0 text-center cursor-pointer hover:bg-night-head-hover" style={{ width: 26, minWidth: 26 }} onClick={onToggleNight} title={t("expandNightShift", lang)}>
            <div className="flex h-full flex-col items-center justify-center gap-1 py-2">
              <Plus size={11} />
              <span className="font-bold" style={{ writingMode: "vertical-rl" }}>{t("nightShift", lang)}</span>
            </div>
          </th>
        ) : (
          <th colSpan={4} className="bg-night-head text-white border-b border-night-head p-0 text-center">
            <div className="flex items-center justify-center gap-1.5 py-1">
              <button className="rad-6 px-1 text-night-soft hover:bg-night-head-hover" onClick={onToggleNight} title={t("collapseNightShift", lang)}>
                <ChevronRight size={13} />
              </button>
              <Bi vi="CA ĐÊM" zh="夜班" en="NIGHT SHIFT" center viClass="font-bold text-xs" />
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
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-center align-middle" style={{ minWidth: 210 }}>
            <Bi vi="Công nhân" zh="工人" en="Workers" center />
          </th>
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-center align-middle" style={{ minWidth: 70 }}>
            <Bi vi="Tăng ca" zh="加班" en="Overtime" center />
          </th>
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-center align-middle" style={{ minWidth: 110 }}>
            <Bi vi="Kỹ thuật viên" zh="技术员" en="Technicians" center />
          </th>
          <th className="bg-day-soft border-b border-r border-day px-2 py-1.5 text-warn font-bold text-center align-middle" style={{ minWidth: 110 }}>
            <Bi vi="Công nhân khác" zh="其他工人" en="Support Staff" center />
          </th>
        </>)}
        {!nightCollapsed && (<>
          <th className="bg-night-tint border-b border-r border-night px-2 py-1.5 text-night font-bold text-center align-middle" style={{ minWidth: 210 }}>
            <Bi vi="Công nhân" zh="工人" en="Workers" center />
          </th>
          <th className="bg-night-tint border-b border-r border-night px-2 py-1.5 text-night font-bold text-center align-middle" style={{ minWidth: 70 }}>
            <Bi vi="Tăng ca" zh="加班" en="Overtime" center />
          </th>
          <th className="bg-night-tint border-b border-r border-night px-2 py-1.5 text-night font-bold text-center align-middle" style={{ minWidth: 110 }}>
            <Bi vi="Kỹ thuật viên" zh="技术员" en="Technicians" center />
          </th>
          <th className="bg-night-tint border-b border-r border-night px-2 py-1.5 text-night font-bold text-center align-middle" style={{ minWidth: 110 }}>
            <Bi vi="Công nhân khác" zh="其他工人" en="Support Staff" center />
          </th>
        </>)}
      </tr>
    </thead>
  );
}
