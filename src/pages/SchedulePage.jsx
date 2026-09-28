import { useEffect, useMemo, useRef, useState } from "react";
import { FileX2, PlusCircle, RefreshCw } from "lucide-react";
import { CopyScheduleModal } from "../components/schedule/CopyScheduleModal";
import { MoldOpenStats } from "../components/schedule/MoldOpenStats";
import { ScheduleSummary } from "../components/schedule/ScheduleSummary";
import { ScheduleTable } from "../components/schedule/ScheduleTable";
import { ScheduleToolbar } from "../components/schedule/ScheduleToolbar";
import { ShiftStaffTable } from "../components/schedule/ShiftStaffTable";
import { SquareDatePicker } from "../components/schedule/SquareDatePicker";
import { Bi } from "../components/ui/Bi";
import { Modal } from "../components/ui/Overlays";
import { useApp } from "../context/AppContext";
import { PLAN_STATUS, POSITIONS, isActive } from "../lib/constants";
import { TODAY_KEY, toDisplay } from "../lib/dates";
import { byId, computeKpis, copySchedule, createHistoryStack, emptyDay, sanitizeDay, withMachineStatus } from "../lib/schedule";
import { btnGhost, btnPrimary, btnSecondary, card } from "../lib/styles";
import { t } from "../lib/i18n";

export function SchedulePage() {
  const { db, setDb, role, user, pushToast, confirmAction, lang = "vi" } = useApp();
  const [dateKey, setDateKey] = useState(TODAY_KEY);
  const machines = db.machines || [];
  const [dayData, setDayDataLocal] = useState(() => sanitizeDay(db.schedules?.[TODAY_KEY], machines));
  const [editable, setEditable] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [leaveGuardOpen, setLeaveGuardOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);
  const historyRef = useRef(null);
  const initialRef = useRef(null);

  const employees = db.employees || [], molds = db.molds || [], orders = db.orders || [];
  const ordersById = useMemo(() => byId(orders), [orders]);
  const moldsById = useMemo(() => byId(molds), [molds]);
  const employeesById = useMemo(() => byId(employees), [employees]);
  const activeWorkers = useMemo(() => employees.filter((e) => isActive(e) && e.position === POSITIONS.WORKER), [employees]);
  const techniciansPool = useMemo(() => employees.filter((e) => isActive(e) && e.position === POSITIONS.TECHNICIAN), [employees]);
  const supportPool = useMemo(() => employees.filter((e) => isActive(e) && e.position === POSITIONS.SUPPORT), [employees]);

  useEffect(() => {
    const existing = sanitizeDay(db.schedules?.[dateKey], machines);
    setDayDataLocal(existing);
    setEditable(false);
    historyRef.current = createHistoryStack(existing);
    initialRef.current = existing;
  }, [dateKey, machines, db.schedules]);

  // Keep the read-only view in sync with the stored day (e.g. after someone else saved it). While editing, the local draft is never overwritten.
  const stored = useMemo(() => sanitizeDay(db.schedules?.[dateKey], machines), [db.schedules, dateKey, machines]);
  useEffect(() => {
    if (editable) return;
    setDayDataLocal(stored); initialRef.current = stored; historyRef.current = createHistoryStack(stored);
  }, [stored, editable]);

  const isDirty = editable && JSON.stringify(dayData) !== JSON.stringify(initialRef.current);
  const kpis = useMemo(() => computeKpis(dayData, machines, employees), [dayData, machines, employees]);

  const applyChange = (updater) => {
    setDayDataLocal((prev) => {
      const base = prev || emptyDay(dateKey, machines);
      const next = typeof updater === "function" ? updater(base) : updater;
      historyRef.current?.push(next);
      return next;
    });
  };
  const handlePatchEntry = (machineId, patch) => applyChange((d) => ({ ...d, entries: { ...d.entries, [machineId]: { ...d.entries[machineId], ...patch } } }));
  const handleBulkUpdate = (newEntries) => applyChange((d) => ({ ...d, entries: newEntries }));
  const handleLeaderPatch = (patch) => applyChange((d) => ({ ...d, ...patch }));
  const handleUndo = () => { const r = historyRef.current?.undo(); if (r !== undefined) setDayDataLocal(r); };
  const handleRedo = () => { const r = historyRef.current?.redo(); if (r !== undefined) setDayDataLocal(r); };
  const handleClearAll = () => {
    confirmAction(
      "Xóa toàn bộ dữ liệu kế hoạch của ngày này? Hành động này có thể hoàn tác bằng nút Undo. / 清空当天全部排班数据？可用撤销按钮恢复。",
      () => {
        applyChange((d) => ({ ...emptyDay(dateKey, machines), dayLeader: null, dayTeamLeaders: [], nightLeader: null, nightTeamLeaders: [], status: (d && d.status) || PLAN_STATUS.DRAFT }));
        pushToast("Đã xóa toàn bộ kế hoạch của ngày này / 已清空当天计划", "info");
      },
      { title: "Xóa toàn bộ kế hoạch / 清空整个计划", confirmLabel: "Xóa toàn bộ / 清空", danger: true }
    );
  };

  useEffect(() => {
    const onKey = (e) => { const meta = e.ctrlKey || e.metaKey; if (!meta || !editable) return; if (e.key === "z" || e.key === "Z") { e.preventDefault(); handleUndo(); } if (e.key === "y" || e.key === "Y") { e.preventDefault(); handleRedo(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable]);

  const userName = (typeof user === "object" && (user?.name || user?.username)) || user || "Admin";

  const handleStartNew = () => { const fresh = emptyDay(dateKey, machines); setDayDataLocal(fresh); historyRef.current = createHistoryStack(fresh); setEditable(true); };
  const handleEnterEdit = () => { initialRef.current = dayData; setEditable(true); };
  const handleSave = () => {
    // freeze each machine's status into this day so it can never change when another date is edited
    const saved = { ...withMachineStatus(dayData, machines), status: PLAN_STATUS.SAVED, updatedBy: userName, updatedAt: new Date().toISOString() };
    setDb((prev) => ({ ...prev, schedules: { ...prev.schedules, [dateKey]: saved } }));
    setDayDataLocal(saved); initialRef.current = saved; setEditable(false);
    pushToast(lang === "zh" ? `已保存 ${toDisplay(dateKey)} 排班计划` : lang === "en" ? `Schedule for ${toDisplay(dateKey)} saved` : `Đã lưu kế hoạch ngày ${toDisplay(dateKey)}`, "success");
  };
  const handleToggleLock = () => {
    if (!dayData) return;
    const nextStatus = dayData.status === PLAN_STATUS.LOCKED ? PLAN_STATUS.SAVED : PLAN_STATUS.LOCKED;
    const updated = { ...dayData, status: nextStatus, updatedAt: new Date().toISOString() };
    setDb((prev) => ({ ...prev, schedules: { ...prev.schedules, [dateKey]: updated } }));
    setDayDataLocal(updated); initialRef.current = updated;
    pushToast(nextStatus === PLAN_STATUS.LOCKED
      ? (lang === "zh" ? "已锁定排班计划" : lang === "en" ? "Schedule locked" : "Đã khóa kế hoạch")
      : (lang === "zh" ? "已解锁排班计划" : lang === "en" ? "Schedule unlocked" : "Đã mở khóa kế hoạch"), "info");
  };
  const requestDateChange = (nextKey) => { if (isDirty) { setPendingDate(nextKey); setLeaveGuardOpen(true); } else setDateKey(nextKey); };
  const confirmLeaveWithSave = () => { handleSave(); setLeaveGuardOpen(false); if (pendingDate) setDateKey(pendingDate); };
  const confirmLeaveWithoutSave = () => { setLeaveGuardOpen(false); if (pendingDate) setDateKey(pendingDate); };
  const buildCopyPreview = (sourceKey, options) => copySchedule({ sourceDay: db.schedules[sourceKey], targetDateKey: dateKey, machines, employeesById, options });
  const applyCopiedData = (copiedDay) => { applyChange(() => copiedDay); setEditable(true); pushToast('Đã áp dụng dữ liệu — nhớ bấm "Lưu kế hoạch" / 已应用，请记得保存', "info"); };

  return (
    <div className="space-y-5">
      <div className="v-card v-rise p-5" style={{ "--i": 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <SquareDatePicker selectedKey={dateKey} onSelect={requestDateChange} />
            {dayData && dayData.updatedAt && (
              <div className="leading-tight">
                <div className="text-xs font-medium text-mute">{t("lastUpdated", lang)}</div>
                <div className="mt-0.5 text-sm font-bold text-ink">{new Date(dayData.updatedAt).toLocaleString("vi-VN")}</div>
              </div>
            )}
          </div>
          <div className="ml-auto">
      <ScheduleToolbar editable={editable} planStatus={dayData?.status || PLAN_STATUS.DRAFT} isDirty={isDirty} canUndo={historyRef.current?.canUndo() || false} canRedo={historyRef.current?.canRedo() || false} role={role}
        onEnterEdit={handleEnterEdit} onSave={handleSave} onUndo={handleUndo} onRedo={handleRedo} onToggleLock={handleToggleLock} onGetData={() => setCopyModalOpen(true)} onClearAll={handleClearAll} />
          </div>
        </div>
      </div>

      {!dayData ? (
        <div className={`${card} flex flex-col items-center justify-center gap-3 py-16 text-center`}>
          <FileX2 size={36} className="text-faint" />
          <Bi
            vi={`Chưa có kế hoạch cho ngày ${toDisplay(dateKey)}`}
            zh={`该日期暂无排班计划: ${toDisplay(dateKey)}`}
            en={`No schedule planned for ${toDisplay(dateKey)}`}
            center
            viClass="text-body font-medium"
          />
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={() => setCopyModalOpen(true)}>
              <RefreshCw size={14} /> {t("getDataFromOtherDate", lang)}
            </button>
            {role !== "VIEWER" && (
              <button className={btnPrimary} onClick={handleStartNew}>
                <PlusCircle size={14} /> {t("createNewPlan", lang)}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <ScheduleSummary kpis={kpis} />
          <div className="space-y-5">
            <ScheduleTable machines={machines} molds={molds} orders={orders} ordersById={ordersById} entries={dayData.entries} editable={editable} dateKey={dateKey} activeWorkers={activeWorkers} techniciansPool={techniciansPool} supportPool={supportPool} employeesById={employeesById}
              onPatchEntry={handlePatchEntry} onBulkUpdate={handleBulkUpdate} dayData={dayData} employees={employees} onChangeLeaders={handleLeaderPatch} />
            <div className="grid grid-cols-2 gap-5">
              <ShiftStaffTable title="Danh sách nhân sự ca ngày" titleZh="白班人员名单" colorClass="bg-day-head text-warn" leaderId={dayData.dayLeader} teamLeaderIds={dayData.dayTeamLeaders} employeesById={employeesById} dayData={dayData} shiftKey="dayShift" />
              <ShiftStaffTable title="Danh sách nhân sự ca đêm" titleZh="夜班人员名单" colorClass="bg-night-tint text-night" leaderId={dayData.nightLeader} teamLeaderIds={dayData.nightTeamLeaders} employeesById={employeesById} dayData={dayData} shiftKey="nightShift" />
            </div>
          </div>
          <MoldOpenStats day={dayData} machines={machines} moldsById={moldsById} />
        </>
      )}
      <CopyScheduleModal open={copyModalOpen} onClose={() => setCopyModalOpen(false)} targetDateKey={dateKey} availableDates={Object.keys(db.schedules).filter((k) => db.schedules[k]).sort().reverse()} buildPreview={buildCopyPreview} onApply={applyCopiedData} />
      <Modal open={leaveGuardOpen} onClose={() => setLeaveGuardOpen(false)} title="Bạn có thay đổi chưa được lưu / 有未保存的更改" footer={<><button className={btnGhost} onClick={() => setLeaveGuardOpen(false)}>Hủy</button><button className={btnSecondary} onClick={confirmLeaveWithoutSave}>Không lưu</button><button className={btnPrimary} onClick={confirmLeaveWithSave}>Lưu</button></>}>
        <p className="text-sm text-body">Bạn có muốn lưu thay đổi trước khi rời trang?</p>
      </Modal>
    </div>
  );
}
