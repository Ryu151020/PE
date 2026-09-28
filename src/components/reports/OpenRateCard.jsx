import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReportCard } from "./ReportCard";
import { ShiftChip } from "../schedule/ScheduleSummary";
import { AXIS_TICK, VenusTooltip } from "../ui/ChartHelpers";
import { CountUp } from "../ui/CountUp";
import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";

/* Machine open-rate: share of machine-shifts that actually have a worker assigned, per day (total + day/night). */
export function OpenRateCard({ data, index = 0 }) {
  const { lang = "vi" } = useApp() || {};
  const avg = (key) => (data.length ? Math.round(data.reduce((sum, d) => sum + d[key], 0) / data.length) : 0);
  const avgTotal = avg("total"), avgDay = avg("day"), avgNight = avg("night");

  const title = t("openRateTitle", lang);
  const subtitle = t("openRateSubtitle", lang);
  const totalLabel = t("totalCol", lang);
  const dayShiftLabel = t("dayShift", lang);
  const nightShiftLabel = t("nightShift", lang);

  return (
    <ReportCard index={index} title={title} subtitle={subtitle}>
      {data.length === 0 ? <div className="py-10 text-center text-sm text-mute">{t("noDataInPeriod", lang)}</div> : (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-mute">{t("average", lang)}</div>
              <div className="flex items-baseline gap-1 text-ink"><CountUp value={avgTotal} className="v-value" /><span className="text-2xl font-bold">%</span></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShiftChip kind="day">{dayShiftLabel}: {avgDay}%</ShiftChip>
              <ShiftChip kind="night">{nightShiftLabel}: {avgNight}%</ShiftChip>
            </div>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <defs><linearGradient id="peRateFill" x1="0" y1="0" x2="0" y2="1"><stop offset="1.43%" stopColor="#E9E3FF" stopOpacity={1} /><stop offset="95.71%" stopColor="#E9E3FF" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E9EDF7" />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<VenusTooltip unit="%" />} cursor={{ stroke: "#4318FF", strokeOpacity: 0.25, strokeDasharray: "3 4" }} />
                <Area type="monotone" dataKey="total" name={totalLabel} stroke="#4318FF" strokeWidth={3} fill="url(#peRateFill)" dot={false} activeDot={{ r: 7, stroke: "#2200B7", strokeWidth: 3, fill: "#fff" }} animationDuration={500} />
                <Line type="monotone" dataKey="day" name={dayShiftLabel} stroke="#FFB547" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={500} />
                <Line type="monotone" dataKey="night" name={nightShiftLabel} stroke="#6AD2FF" strokeWidth={2} strokeDasharray="5 5" dot={false} animationDuration={500} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-mute">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" />{totalLabel}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warn" />{dayShiftLabel}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cyan" />{nightShiftLabel}</span>
          </div>
        </>
      )}
    </ReportCard>
  );
}
