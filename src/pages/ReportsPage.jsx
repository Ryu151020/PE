import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { EmployeeDetailDrawer } from "../components/employees/EmployeeDetailDrawer";
import { OpenRateCard } from "../components/reports/OpenRateCard";
import { ReportCard, Th } from "../components/reports/ReportCard";
import { StackedStatusBadge } from "../components/ui/Badges";
import { Bi } from "../components/ui/Bi";
import { AXIS_TICK, PieTip, VenusTooltip } from "../components/ui/ChartHelpers";
import { CountUp } from "../components/ui/CountUp";
import { PageHeader } from "../components/ui/PageHeader";
import { Segmented } from "../components/ui/Segmented";
import { useApp } from "../context/AppContext";
import { EMP_STATUS_COLOR, EMP_STATUS_ZH, PIE_COLORS, POSITION_ZH, TENURE_ZH, isActive, reasonZh } from "../lib/constants";
import { TODAY_KEY, computePreset, inRange, monthsBetween, toDisplay } from "../lib/dates";
import { byId, computeKpis } from "../lib/schedule";
import { card, inputCls } from "../lib/styles";
import { getPositionLabel, getResignReasonLabel, getStatusLabel, t } from "../lib/i18n";

export function ReportsPage() {
  const { db, lang = "vi" } = useApp();
  const [preset, setPreset] = useState("thisWeek");
  const [range, setRange] = useState(() => computePreset("thisWeek"));
  const [detailEmployee, setDetailEmployee] = useState(null);
  const employeesById = useMemo(() => byId(db.employees), [db.employees]);
  const ordersById = useMemo(() => byId(db.orders), [db.orders]);
  const moldsById = useMemo(() => byId(db.molds), [db.molds]);
  const machinesById = useMemo(() => byId(db.machines), [db.machines]);

  const resignedInRange = useMemo(() => db.employees.filter((e) => !isActive(e) && e.resignDate && inRange(e.resignDate, range.from, range.to)), [db.employees, range]);
  const turnoverByDay = useMemo(() => { const m = {}; resignedInRange.forEach((e) => (m[e.resignDate] = (m[e.resignDate] || 0) + 1)); return Object.entries(m).sort(([a], [b]) => (a < b ? -1 : 1)).map(([d, c]) => ({ date: toDisplay(d).slice(0, 5), count: c })); }, [resignedInRange]);
  const tenureBuckets = useMemo(() => {
    const buckets = ["< 1 tháng", "1-3 tháng", "3-6 tháng", "6-12 tháng", "1-2 năm", "> 2 năm"];
    const bucketOf = (join, end) => { const months = monthsBetween(join, end || TODAY_KEY); if (months < 1) return buckets[0]; if (months < 3) return buckets[1]; if (months < 6) return buckets[2]; if (months < 12) return buckets[3]; if (months < 24) return buckets[4]; return buckets[5]; };
    const counts = Object.fromEntries(buckets.map((b) => [b, 0]));
    resignedInRange.forEach((e) => { const b = bucketOf(e.joinDate, e.resignDate); counts[b] = (counts[b] || 0) + 1; });
    const total = resignedInRange.length || 1;
    return buckets.map((b) => ({ bucket: b, count: counts[b], percent: Math.round((counts[b] / total) * 1000) / 10 }));
  }, [resignedInRange]);
  const reasonBreakdown = useMemo(() => {
    const counts = {};
    resignedInRange.forEach((e) => { const r = e.resignReason || "Chưa ghi nhận"; counts[r] = (counts[r] || 0) + 1; });
    const total = resignedInRange.length || 1;
    return Object.entries(counts).map(([reason, count]) => ({ reason, count, percent: Math.round((count / total) * 1000) / 10 })).sort((a, b) => b.count - a.count);
  }, [resignedInRange]);

  const shiftSummary = useMemo(() => {
    const acc = {}; db.employees.forEach((e) => (acc[e.id] = { employee: e, dayDates: new Set(), nightDates: new Set() }));
    Object.entries(db.schedules).forEach(([date, day]) => {
      if (!day || !inRange(date, range.from, range.to)) return;
      const dToday = new Set(), nToday = new Set();
      Object.values(day.entries).forEach((entry) => { (entry.dayShift?.workers || []).forEach((id) => dToday.add(id)); (entry.nightShift?.workers || []).forEach((id) => nToday.add(id)); });
      dToday.forEach((id) => { if (acc[id]) acc[id].dayDates.add(date); });
      nToday.forEach((id) => { if (acc[id]) acc[id].nightDates.add(date); });
    });
    return Object.values(acc).map((s) => ({ employee: s.employee, dayShiftDays: s.dayDates.size, nightShiftDays: s.nightDates.size, totalDays: new Set([...s.dayDates, ...s.nightDates]).size })).filter((s) => s.totalDays > 0).sort((a, b) => b.totalDays - a.totalDays);
  }, [db.employees, db.schedules, range]);

  const otByEmployee = useMemo(() => {
    const m = {};
    Object.entries(db.schedules).forEach(([date, day]) => {
      if (!day || !inRange(date, range.from, range.to)) return;
      Object.values(day.entries).forEach((entry) => {
        if (entry.dayShift?.overtimeHours > 0) (entry.dayShift?.workers || []).forEach((id) => { m[id] = m[id] || { employeeId: id, dayOT: 0, nightOT: 0 }; m[id].dayOT += entry.dayShift.overtimeHours; });
        if (entry.nightShift?.overtimeHours > 0) (entry.nightShift?.workers || []).forEach((id) => { m[id] = m[id] || { employeeId: id, dayOT: 0, nightOT: 0 }; m[id].nightOT += entry.nightShift.overtimeHours; });
      });
    });
    return Object.values(m).map((r) => ({ ...r, totalOT: Math.round((r.dayOT + r.nightOT) * 10) / 10, dayOT: Math.round(r.dayOT * 10) / 10, nightOT: Math.round(r.nightOT * 10) / 10 })).sort((a, b) => b.totalOT - a.totalOT);
  }, [db.schedules, range]);

  const trend = useMemo(() => Object.entries(db.schedules).filter(([d, day]) => day && inRange(d, range.from, range.to)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([d, day]) => { const ids = new Set(); Object.values(day.entries).forEach((e) => { [...(e.dayShift?.workers || []), ...(e.dayShift?.technicians || []), ...(e.dayShift?.otherWorkers || []), ...(e.nightShift?.workers || []), ...(e.nightShift?.technicians || []), ...(e.nightShift?.otherWorkers || [])].forEach((id) => ids.add(id)); }); return { date: toDisplay(d).slice(0, 5), count: ids.size }; }), [db.schedules, range]);

  const openRate = useMemo(() => Object.entries(db.schedules).filter(([d, day]) => day && inRange(d, range.from, range.to)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([d, day]) => { const k = computeKpis(day, db.machines, db.employees); const pct = (n, t) => (t > 0 ? Math.round((n / t) * 1000) / 10 : 0); return { date: toDisplay(d).slice(0, 5), total: pct(k.open, k.totalSlots), day: pct(k.openDay, k.total), night: pct(k.openNight, k.total) }; }), [db.schedules, db.machines, db.employees, range]);

  const machineSummary = useMemo(() => db.machines.map((m) => {
    let openDays = 0, stoppedDays = 0, dayShiftDays = 0, nightShiftDays = 0; const orderSet = new Set(), workerSet = new Set();
    Object.entries(db.schedules).forEach(([date, day]) => { if (!day || !inRange(date, range.from, range.to)) return; const entry = day.entries[m.id]; if (!entry) return; const hasDay = (entry.dayShift?.workers || []).length > 0, hasNight = (entry.nightShift?.workers || []).length > 0; if (hasDay) { dayShiftDays++; openDays++; } if (hasNight) nightShiftDays++; if (!hasDay && !hasNight) stoppedDays++; if (entry.orderId) orderSet.add(entry.orderId); [...(entry.dayShift?.workers || []), ...(entry.nightShift?.workers || [])].forEach((id) => workerSet.add(id)); });
    return { machine: m, openDays, stoppedDays, orderCount: orderSet.size, workerCount: workerSet.size, dayShiftDays, nightShiftDays };
  }), [db.machines, db.schedules, range]);

  const presetItems = [
    { key: "yesterday", label: t("yesterday", lang) },
    { key: "today", label: t("today", lang) },
    { key: "thisWeek", label: t("thisWeek", lang) },
    { key: "lastWeek", label: t("lastWeek", lang) },
    { key: "thisMonth", label: t("thisMonth", lang) },
    { key: "lastMonth", label: t("lastMonth", lang) },
    { key: "thisYear", label: t("thisYear", lang) },
    { key: "custom", label: t("custom", lang) },
  ];

  return (
    <div className="space-y-5">
      {/* Sticky Filter Bar */}
      <div className={`${card} sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-sm p-4 flex flex-wrap items-center gap-4`}>
        <Segmented
          small
          value={preset}
          onChange={(k) => {
            setPreset(k);
            const c = computePreset(k);
            if (c) setRange(c);
          }}
          items={presetItems}
        />
        <div className="flex items-center gap-2 text-sm ml-auto">
          <span className="text-xs text-mute font-semibold">{t("from", lang)}</span>
          <input
            type="date"
            className={`${inputCls} v-input--w36`}
            value={range.from}
            onChange={(e) => {
              setPreset("custom");
              setRange({ ...range, from: e.target.value });
            }}
          />
          <span className="text-xs text-mute font-semibold">{t("to", lang)}</span>
          <input
            type="date"
            className={`${inputCls} v-input--w36`}
            value={range.to}
            onChange={(e) => {
              setPreset("custom");
              setRange({ ...range, to: e.target.value });
            }}
          />
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid gap-5 grid-cols-2">
          <ReportCard
            title={t("turnoverReport", lang)}
            subtitle={`${t("totalResigned", lang)}: ${resignedInRange.length}`}
          >
            {turnoverByDay.length === 0 ? (
              <div className="py-10 text-center text-sm text-mute">{t("noTurnoverInPeriod", lang)}</div>
            ) : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={turnoverByDay} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E9EDF7" />
                    <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<VenusTooltip />} cursor={{ fill: "rgba(67,24,255,0.06)", radius: 8 }} />
                    <Bar dataKey="count" name={t("resignedCount", lang)} fill="#4318FF" radius={[8, 8, 0, 0]} maxBarSize={35} animationDuration={500} animationEasing="ease-out">
                      <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 700, fill: "#1B2559" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportCard>
          <ReportCard
            title={t("tenureBeforeResign", lang)}
            subtitle={t("tenureQuestion", lang)}
          >
            <div className="space-y-2">
              {tenureBuckets.map((tItem) => (
                <div key={tItem.bucket} className="flex items-center gap-2 text-xs">
                  <span className="text-body font-medium" style={{ width: 96 }}>
                    {t(tItem.bucket, lang)}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-canvas overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${tItem.percent}%` }} />
                  </div>
                  <span className="text-right text-body" style={{ width: 100 }}>
                    {tItem.count} {t("peopleCountUnit", lang)} ({tItem.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </ReportCard>
        </div>

        <ReportCard
          title={t("reasonStats", lang)}
          subtitle={t("reasonQuestion", lang)}
        >
          {reasonBreakdown.length === 0 ? (
            <div className="py-10 text-center text-sm text-mute">{t("noDataInPeriod", lang)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-6 items-center">
              <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={reasonBreakdown} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={62} outerRadius={94} paddingAngle={3} cornerRadius={6} strokeWidth={2} stroke="#fff" animationDuration={500}>
                      {reasonBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <CountUp value={resignedInRange.length} className="text-3xl font-bold text-ink" />
                  <span className="text-xs text-mute">{t("resigned", lang)}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {reasonBreakdown.map((r, i) => (
                  <div key={r.reason}>
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate text-body">{getResignReasonLabel(r.reason, lang)}</span>
                      <span className="font-semibold text-ink">{r.count} {t("peopleCountUnit", lang)}</span>
                      <span className="w-10 text-right text-xs text-mute">{r.percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                      <div className="h-full rounded-full transition-all" style={{ width: `${r.percent}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportCard>

        <div className="space-y-5">
          <ReportCard
            title={t("dayNightReport", lang)}
            subtitle={t("dayNightSubtitle", lang)}
          >
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-sm border-separate border-spacing-0" style={{ tableLayout: "fixed" }}>
                <colgroup><col style={{ width: "12%" }} /><col style={{ width: "23%" }} /><col style={{ width: "17%" }} /><col style={{ width: "16%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "12%" }} /></colgroup>
                <thead className="pe-thead sticky top-0 z-10 bg-[#F8FAFC] shadow-xs">
                  <tr>
                    <Th vi="Mã NV" zh="工号" en="Emp ID" />
                    <Th vi="Nhân viên" zh="员工" en="Employee" />
                    <Th vi="Vị trí" zh="职位" en="Position" />
                    <Th vi="Trạng thái" zh="状态" en="Status" />
                    <Th vi="Ca ngày" zh="白班" en="Day" right />
                    <Th vi="Ca đêm" zh="夜班" en="Night" right />
                    <Th vi="Tổng" zh="合计" en="Total" right />
                  </tr>
                </thead>
                <tbody>
                  {shiftSummary.map((r) => (
                    <tr key={r.employee.id} className="border-t border-line cursor-pointer hover:bg-canvas" onClick={() => setDetailEmployee(r.employee)}>
                      <td className="px-2 py-2 text-mute">{r.employee.employeeCode}</td>
                      <td className="px-2 py-2 font-medium text-ink">
                        {lang === "zh" ? (r.employee.chineseName || r.employee.vietnameseName) : r.employee.vietnameseName}
                      </td>
                      <td className="px-2 py-2 text-body">
                        {getPositionLabel(r.employee.position, lang)}
                      </td>
                      <td className="px-2 py-2">
                        <StackedStatusBadge vi={getStatusLabel(r.employee.status, lang)} className={EMP_STATUS_COLOR[r.employee.status]} />
                      </td>
                      <td className="px-2 py-2 text-right">{r.dayShiftDays}</td>
                      <td className="px-2 py-2 text-right">{r.nightShiftDays}</td>
                      <td className="px-2 py-2 text-right font-medium">{r.totalDays}</td>
                    </tr>
                  ))}
                  {shiftSummary.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-2 py-6 text-center text-mute">{t("noData", lang)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReportCard>

          <ReportCard
            title={t("overtimeReport", lang)}
            subtitle={`${t("totalOvertimeHours", lang)}: ${Math.round(otByEmployee.reduce((s, r) => s + r.totalOT, 0) * 10) / 10} ${t("hours", lang)}`}
          >
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-sm border-separate border-spacing-0" style={{ tableLayout: "fixed" }}>
                <colgroup><col style={{ width: "12%" }} /><col style={{ width: "23%" }} /><col style={{ width: "17%" }} /><col style={{ width: "16%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "12%" }} /></colgroup>
                <thead className="pe-thead sticky top-0 z-10 bg-[#F8FAFC] shadow-xs">
                  <tr>
                    <Th vi="Mã NV" zh="工号" en="Emp ID" />
                    <Th vi="Nhân viên" zh="员工" en="Employee" />
                    <Th vi="Vị trí" zh="职位" en="Position" />
                    <Th vi="Trạng thái" zh="状态" en="Status" />
                    <Th vi="Ca ngày" zh="白班" en="Day" right />
                    <Th vi="Ca đêm" zh="夜班" en="Night" right />
                    <Th vi="Tổng" zh="合计" en="Total" right />
                  </tr>
                </thead>
                <tbody>
                  {otByEmployee.map((r) => {
                    const emp = employeesById[r.employeeId];
                    const high = r.totalOT >= 20;
                    return (
                      <tr key={r.employeeId} className={`border-t border-line ${high ? "bg-bad-tint" : ""}`}>
                        <td className="px-2 py-2 text-mute">{emp?.employeeCode || "—"}</td>
                        <td className="px-2 py-2 font-medium text-ink">
                          {emp ? (lang === "zh" ? (emp.chineseName || emp.vietnameseName) : emp.vietnameseName) : r.employeeId}
                        </td>
                        <td className="px-2 py-2 text-body">
                          {emp ? getPositionLabel(emp.position, lang) : "—"}
                        </td>
                        <td className="px-2 py-2">
                          {emp && <StackedStatusBadge vi={getStatusLabel(emp.status, lang)} className={EMP_STATUS_COLOR[emp.status]} />}
                        </td>
                        <td className="px-2 py-2 text-right">{r.dayOT}</td>
                        <td className="px-2 py-2 text-right">{r.nightOT}</td>
                        <td className="px-2 py-2 text-right font-medium">
                          <span className="inline-flex items-center gap-1">{high && <AlertTriangle size={11} className="text-bad" />}{r.totalOT}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {otByEmployee.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-2 py-6 text-center text-mute">{t("noOvertimeData", lang)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ReportCard>
        </div>

        <OpenRateCard data={openRate} index={4} />

        <ReportCard
          title={t("headcountTrend", lang)}
          subtitle={t("headcountTrendSubtitle", lang)}
        >
          {trend.length === 0 ? (
            <div className="py-10 text-center text-sm text-mute">{t("noData", lang)}</div>
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="peAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="1.43%" stopColor="#E9E3FF" stopOpacity={1} />
                      <stop offset="95.71%" stopColor="#E9E3FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E9EDF7" />
                  <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<VenusTooltip />} cursor={{ stroke: "#4318FF", strokeOpacity: 0.25, strokeDasharray: "3 4" }} />
                  <Area type="monotone" dataKey="count" name={t("personnel", lang)} stroke="#4318FF" strokeWidth={3} fill="url(#peAreaFill)" dot={false} activeDot={{ r: 7, stroke: "#2200B7", strokeWidth: 3, fill: "#fff" }} animationDuration={500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ReportCard>

        <ReportCard
          title={t("machineReport", lang)}
          subtitle={t("machineReportSubtitle", lang)}
        >
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-sm border-separate border-spacing-0" style={{ tableLayout: "fixed" }}>
              <colgroup><col style={{ width: "16%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /></colgroup>
              <thead className="pe-thead sticky top-0 z-10 bg-[#F8FAFC] shadow-xs">
                <tr>
                  <Th vi="Máy" zh="机器" en="Machine" />
                  <Th vi="Ngày mở" zh="开机天数" en="Operating Days" right />
                  <Th vi="Ngày dừng" zh="停机天数" en="Stopped Days" right />
                  <Th vi="Đơn hàng" zh="订单" en="Orders" right />
                  <Th vi="Công nhân" zh="工人" en="Workers" right />
                  <Th vi="Ca ngày" zh="白班" en="Day" right />
                  <Th vi="Ca đêm" zh="夜班" en="Night" right />
                </tr>
              </thead>
              <tbody>
                {machineSummary.map((r) => (
                  <tr key={r.machine.id} className="border-t border-line">
                    <td className="truncate px-2 py-2 font-medium text-ink">{r.machine.machineName}</td>
                    <td className="px-2 py-2 text-right">{r.openDays}</td>
                    <td className="px-2 py-2 text-right">{r.stoppedDays}</td>
                    <td className="px-2 py-2 text-right">{r.orderCount}</td>
                    <td className="px-2 py-2 text-right">{r.workerCount}</td>
                    <td className="px-2 py-2 text-right">{r.dayShiftDays}</td>
                    <td className="px-2 py-2 text-right">{r.nightShiftDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportCard>
      </div>

      <EmployeeDetailDrawer employee={detailEmployee} onClose={() => setDetailEmployee(null)} machinesById={machinesById} ordersById={ordersById} moldsById={moldsById} schedules={db.schedules} />
    </div>
  );
}
