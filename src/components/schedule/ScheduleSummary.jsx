import { useEffect, useState } from "react";
import { CheckCircle2, Moon, Sun, Users, XCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { POSITIONS } from "../../lib/constants";
import { getPositionLabel, t } from "../../lib/i18n";
import { Bi } from "../ui/Bi";
import { CountUp } from "../ui/CountUp";

export function progressTone(ratio, goodWhenHigh = true) {
  const r = goodWhenHigh ? ratio : 1 - ratio;
  if (r < 0.4) return "bg-bad";
  if (r < 0.7) return "bg-warn";
  return "bg-ok-bright";
}

/* Track + fill bar with percentage on right */
export function PercentBar({ ratio, toneClass, dark }) {
  const pct = Math.max(0, Math.min(100, Math.round((ratio || 0) * 100)));
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="mt-4 flex items-center gap-3">
      <div className={`h-2 flex-1 overflow-hidden rounded-full ${dark ? "bg-white/25" : "bg-line"}`}>
        <div className={`h-full rounded-full ${dark ? "bg-white" : toneClass}`} style={{ width: `${w}%`, transition: "width 500ms cubic-bezier(.22,1,.36,1)" }} />
      </div>
      <span className={`w-10 shrink-0 text-right text-xs font-bold ${dark ? "text-white" : "text-mute"}`}>{pct}%</span>
    </div>
  );
}

export const PERSONNEL_BREAKDOWN_KEYS = [
  POSITIONS.WORKER,
  POSITIONS.TECHNICIAN,
  POSITIONS.SUPPORT,
  POSITIONS.TEAM_LEADER,
  POSITIONS.SHIFT_LEADER,
];

export function ShiftChip({ kind, hero, children }) {
  const cls = hero ? "bg-white/20 text-white" : kind === "day" ? "bg-warn-tint text-warn" : "bg-night-tint text-night";
  const Icon = kind === "day" ? Sun : Moon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      <Icon size={12} />
      {children}
    </span>
  );
}

export function KpiCard({ index, hero, icon: Icon, iconCls, value, total, vi, zh, en, ratio, barCls, day, night, footer }) {
  return (
    <div className={`v-card v-rise v-hover-lift p-5 ${hero ? "v-card--hero v-sheen" : ""}`} style={{ "--i": index }}>
      <div className="flex items-center gap-3">
        <div className={`v-stat-icon ${hero ? "v-stat-icon--hero" : iconCls}`}><Icon size={26} /></div>
        <div className="min-w-0 flex-1">
          <Bi vi={vi} zh={zh} en={en} viClass={`text-sm font-medium ${hero ? "text-white/80" : "text-mute"}`} />
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <CountUp value={value} className={`v-value ${hero ? "text-white" : "text-ink"}`} />
            <span className={`text-sm font-medium ${hero ? "text-white/70" : "text-mute"}`}>/ {total}</span>
          </div>
        </div>
      </div>
      <PercentBar ratio={ratio} toneClass={barCls} dark={hero} />
      <div className="mt-3 flex flex-wrap gap-2">{day}{night}</div>
      {footer}
    </div>
  );
}

export function ScheduleSummary({ kpis }) {
  const { lang = "vi" } = useApp() || {};
  const openRatio = kpis.totalSlots > 0 ? kpis.open / kpis.totalSlots : 0;
  const stoppedRatio = kpis.totalSlots > 0 ? kpis.stopped / kpis.totalSlots : 0;
  const workingRatio = kpis.totalActiveEmployees > 0 ? kpis.workingToday / kpis.totalActiveEmployees : 0;

  const dayLabel = t("dayShift", lang);
  const nightLabel = t("nightShift", lang);

  return (
    <div className="grid grid-cols-3 items-stretch gap-5">
      <KpiCard
        index={1}
        icon={CheckCircle2}
        iconCls="bg-ok-tint text-ok"
        value={kpis.open}
        total={kpis.totalSlots}
        vi="Máy đang mở"
        zh="开机数量"
        en="Running Machines"
        ratio={openRatio}
        barCls="bg-ok-bright"
        day={<ShiftChip kind="day">{dayLabel}: {kpis.openDay}/{kpis.total}</ShiftChip>}
        night={<ShiftChip kind="night">{nightLabel}: {kpis.openNight}/{kpis.total}</ShiftChip>}
      />
      <KpiCard
        index={2}
        icon={XCircle}
        iconCls="bg-bad-tint text-bad"
        value={kpis.stopped}
        total={kpis.totalSlots}
        vi="Máy đang dừng"
        zh="停机数量"
        en="Stopped Machines"
        ratio={stoppedRatio}
        barCls="bg-bad"
        day={<ShiftChip kind="day">{dayLabel}: {kpis.stoppedDay}/{kpis.total}</ShiftChip>}
        night={<ShiftChip kind="night">{nightLabel}: {kpis.stoppedNight}/{kpis.total}</ShiftChip>}
      />
      <KpiCard
        index={3}
        icon={Users}
        iconCls="bg-brand-tint text-brand"
        value={kpis.workingToday}
        total={kpis.totalActiveEmployees}
        vi="Người đi làm"
        zh="出勤人数"
        en="Staff on Duty"
        ratio={workingRatio}
        barCls={progressTone(workingRatio, true)}
        day={<ShiftChip kind="day">{dayLabel}: {kpis.dayHeadcount}</ShiftChip>}
        night={<ShiftChip kind="night">{nightLabel}: {kpis.nightHeadcount}</ShiftChip>}
        footer={(
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PERSONNEL_BREAKDOWN_KEYS.map((key) => (
              <span key={key} className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-body">
                {getPositionLabel(key, lang)}: <span className="font-bold text-ink">{kpis.byPosition[key] || 0}</span>
              </span>
            ))}
          </div>
        )}
      />
    </div>
  );
}
