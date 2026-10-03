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
import { useApp } from "../context/AppContext";
import { PLAN_STATUS, POSITIONS, isActive } from "../lib/constants";
import { TODAY_KEY, toDisplay } from "../lib/dates";
import { byId, computeKpis, copySchedule, createHistoryStack, emptyDay, sanitizeDay, withMachineStatus } from "../lib/schedule";
import { deleteFromSupabase, isSupabaseConfigured, scheduleToDb, syncTableToSupabase } from "../lib/supabase";
import { btnPrimary, btnSecondary, card } from "../lib/styles";
import { t } from "../lib/i18n";
import { storage } from "../sync/storage";

export function SchedulePage() {
  const { db, setDb, role, user, pushToast, confirmAction, lang = "vi" } = useApp();
  const [dateKey, setDateKey] = useState(() => {
    try {
      return sessionStorage.getItem("pe_active_schedule_date") || TODAY_KEY;
    } catch {
      return TODAY_KEY;
    }
  });
  const machines = db.machines || [];
  const [dayData, setDayDataLocal] = useState(() => sanitizeDay(db.schedules?.[dateKey || TODAY_KEY], machines));
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const historyRef = useRef(null);

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
    if (existing) {
      historyRef.current = createHistoryStack(existing);
    }
  }, [dateKey, machines, db.schedules]);

  const userName = (typeof user === "object" && (user?.name || user?.username)) || user || "Admin";
  const isLocked = dayData?.status === PLAN_STATUS.LOCKED;
  const editable = role !== "VIEWER" && !isLocked;

  const kpis = useMemo(() => computeKpis(dayData, machines, employees), [dayData, machines, employees]);

  const applyChange = (updater) => {
    if (!dayData) {
      console.warn("Cannot apply changes: plan for this date does not exist. Please create or copy a plan first.");
      return;
    }
    const next = typeof updater === "function" ? updater(dayData) : updater;
    const nowIso = new Date().toISOString();
    const saved = {
      ...withMachineStatus(next, machines),
      status: isLocked ? PLAN_STATUS.LOCKED : PLAN_STATUS.SAVED,
      updatedBy: userName,
      updatedAt: nowIso,
    };
    historyRef.current?.push(saved);
    setDayDataLocal(saved);
    setDb((prevDb) => ({
      ...prevDb,
      schedules: {
        ...prevDb.schedules,
        [dateKey]: saved,
      },
    }));

    if (isSupabaseConfigured) {
      const row = scheduleToDb(dateKey, saved);
      syncTableToSupabase("schedules", [row], "date").catch((err) =>
        console.error("Supabase sync schedule error:", err)
      );
    }
  };

  const handlePatchEntry = (machineId, patch) =>
    applyChange((d) => ({
      ...d,
      entries: {
        ...d.entries,
        [machineId]: { ...d.entries[machineId], ...patch, updatedAt: Date.now() },
      },
    }));

  const handleBulkUpdate = (newEntries) => {
    const now = Date.now();
    const stamped = {};
    Object.entries(newEntries || {}).forEach(([mId, ent]) => {
      stamped[mId] = { ...ent, updatedAt: now };
    });
    applyChange((d) => ({ ...d, entries: stamped }));
  };

  const handleLeaderPatch = (patch) => applyChange((d) => ({ ...d, ...patch }));

  const handleUndo = () => {
    const r = historyRef.current?.undo();
    if (r !== undefined) {
      const saved = {
        ...withMachineStatus(r, machines),
        status: isLocked ? PLAN_STATUS.LOCKED : PLAN_STATUS.SAVED,
        updatedBy: userName,
        updatedAt: new Date().toISOString(),
      };
      setDayDataLocal(saved);
      setDb((prevDb) => ({
        ...prevDb,
        schedules: {
          ...prevDb.schedules,
          [dateKey]: saved,
        },
      }));
    }
  };

  const handleRedo = () => {
    const r = historyRef.current?.redo();
    if (r !== undefined) {
      const saved = {
        ...withMachineStatus(r, machines),
        status: isLocked ? PLAN_STATUS.LOCKED : PLAN_STATUS.SAVED,
        updatedBy: userName,
        updatedAt: new Date().toISOString(),
      };
      setDayDataLocal(saved);
      setDb((prevDb) => ({
        ...prevDb,
        schedules: {
          ...prevDb.schedules,
          [dateKey]: saved,
        },
      }));
    }
  };

  const handleClearAll = () => {
    confirmAction(
      `Bạn có chắc chắn muốn xóa toàn bộ kế hoạch ngày ${toDisplay(dateKey)} không? Kế hoạch sẽ được xóa hoàn toàn và trở về trạng thái trống ban đầu.\n\n/ 确定要清空该日期的全部排班计划吗？`,
      async () => {
        try {
          if (isSupabaseConfigured) {
            await deleteFromSupabase("schedules", dateKey);
          }

          // Trở về giao diện bảng trống (Chưa có kế hoạch cho ngày ...)
          setDayDataLocal(null);
          historyRef.current = null;
          setDb((prevDb) => {
            const nextSchedules = { ...(prevDb.schedules || {}) };
            delete nextSchedules[dateKey];
            return {
              ...prevDb,
              schedules: nextSchedules,
            };
          });

          pushToast(
            lang === "zh"
              ? "已清空并删除当天排班计划"
              : lang === "en"
              ? "Schedule cleared for this date"
              : `Đã xóa toàn bộ kế hoạch ngày ${toDisplay(dateKey)}`,
            "info"
          );
        } catch (err) {
          console.error("Clear schedule error:", err);
          pushToast("Lỗi xóa kế hoạch: " + err.message, "error");
        }
      },
      {
        title: lang === "zh" ? "清空当天计划" : lang === "en" ? "Delete Schedule" : "Xóa toàn bộ kế hoạch",
        confirmLabel: lang === "zh" ? "Xóa toàn bộ / 清空" : lang === "en" ? "Delete All" : "Xóa toàn bộ",
        danger: true,
      }
    );
  };

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta || !editable) return;
      if (e.key === "z" || e.key === "Z") { e.preventDefault(); handleUndo(); }
      if (e.key === "y" || e.key === "Y") { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable]);

  const handleStartNew = async () => {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const fresh = emptyDay(dateKey, machines);
    const stampedEntries = {};
    Object.entries(fresh.entries || {}).forEach(([mId, entry]) => {
      stampedEntries[mId] = { ...entry, updatedAt: nowMs };
    });
    const saved = {
      ...withMachineStatus({ ...fresh, entries: stampedEntries }, machines),
      status: PLAN_STATUS.SAVED,
      updatedBy: userName,
      updatedAt: nowIso,
    };
    setDb((prev) => ({ ...prev, schedules: { ...prev.schedules, [dateKey]: saved } }));
    setDayDataLocal(saved);
    historyRef.current = createHistoryStack(saved);

    if (isSupabaseConfigured) {
      try {
        const row = scheduleToDb(dateKey, saved);
        await syncTableToSupabase("schedules", [row], "date");
      } catch (err) {
        console.error("Direct Supabase sync on start new failed:", err);
      }
    }
    pushToast(lang === "zh" ? "已创建排班计划并自动保存" : lang === "en" ? "Schedule created and auto-saved" : "Đã tạo mới kế hoạch và tự động lưu", "success");
  };

  const handleToggleLock = () => {
    if (!dayData) return;
    const nextStatus = dayData.status === PLAN_STATUS.LOCKED ? PLAN_STATUS.SAVED : PLAN_STATUS.LOCKED;
    const updated = { ...dayData, status: nextStatus, updatedAt: new Date().toISOString() };
    setDb((prev) => ({ ...prev, schedules: { ...prev.schedules, [dateKey]: updated } }));
    setDayDataLocal(updated);
    pushToast(nextStatus === PLAN_STATUS.LOCKED
      ? (lang === "zh" ? "已锁定排班计划" : lang === "en" ? "Schedule locked" : "Đã khóa kế hoạch")
      : (lang === "zh" ? "已解锁排班计划" : lang === "en" ? "Schedule unlocked" : "Đã mở khóa kế hoạch"), "info");
  };

  const requestDateChange = (nextKey) => {
    setDateKey(nextKey);
    try {
      sessionStorage.setItem("pe_active_schedule_date", nextKey);
    } catch {}
  };

  const buildCopyPreview = (sourceKey, options) => copySchedule({ sourceDay: db.schedules[sourceKey], targetDateKey: dateKey, machines, employeesById, options });
  
  const applyCopiedData = async (copiedDay) => {
    if (!copiedDay) return;

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const stampedEntries = {};
    Object.entries(copiedDay.entries || {}).forEach(([mId, entry]) => {
      stampedEntries[mId] = {
        ...entry,
        updatedAt: nowMs,
      };
    });

    const saved = {
      ...withMachineStatus({ ...copiedDay, entries: stampedEntries }, machines),
      date: dateKey,
      status: PLAN_STATUS.SAVED,
      updatedBy: userName,
      updatedAt: nowIso,
    };

    historyRef.current = createHistoryStack(saved);
    setDayDataLocal(saved);
    setDb((prevDb) => ({
      ...prevDb,
      schedules: {
        ...prevDb.schedules,
        [dateKey]: saved,
      },
    }));

    if (isSupabaseConfigured) {
      try {
        const row = scheduleToDb(dateKey, saved);
        await syncTableToSupabase("schedules", [row], "date");
      } catch (err) {
        console.error("Direct Supabase sync on copy schedule failed:", err);
      }
    }

    pushToast(
      lang === "zh"
        ? "已应用排班数据并自动保存"
        : lang === "en"
        ? "Schedule data applied and auto-saved"
        : "Đã áp dụng kế hoạch và tự động lưu",
      "success"
    );
  };

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
            <ScheduleToolbar
              editable={editable}
              hasData={Boolean(dayData)}
              planStatus={dayData ? (dayData.status || PLAN_STATUS.SAVED) : PLAN_STATUS.DRAFT}
              canUndo={historyRef.current?.canUndo() || false}
              canRedo={historyRef.current?.canRedo() || false}
              role={role}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onToggleLock={handleToggleLock}
              onGetData={() => setCopyModalOpen(true)}
              onClearAll={handleClearAll}
            />
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
      <CopyScheduleModal
        open={copyModalOpen}
        onClose={() => setCopyModalOpen(false)}
        targetDateKey={dateKey}
        availableDates={Object.keys(db.schedules || {}).filter((k) => db.schedules[k] && Object.keys(db.schedules[k].entries || {}).length > 0).sort().reverse()}
        buildPreview={buildCopyPreview}
        onApply={applyCopiedData}
      />
    </div>
  );
}
