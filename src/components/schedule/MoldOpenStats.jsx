import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Layers, Moon, Sun } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";
import { countMoldsByShift } from "../../lib/schedule";
import { card } from "../../lib/styles";
import { Bi } from "../ui/Bi";
import { AXIS_TICK, VenusTooltip } from "../ui/ChartHelpers";
import { CountUp } from "../ui/CountUp";

const COLORS = { day: "#FFB547", night: "#6AD2FF", total: "#4318FF" };
const hideZero = (v) => (v > 0 ? v : "");

/* Tooltip for the stacked chart: day, night and total */
function StackTip({ active, payload, label, lang = "vi" }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="v-tip">
      <span className="v-tip-label">{label}</span>
      <span>{t("dayShift", lang)}: {row.day}</span>
      <span>{t("nightShift", lang)}: {row.night}</span>
      <span>{t("totalSummary", lang)}: {row.total}</span>
    </div>
  );
}

function StatTile({ icon: Icon, iconCls, vi, zh, en, value, lang }) {
  return (
    <div className="rad-20 bg-canvas flex items-center gap-4 p-4">
      <div className={`v-stat-icon ${iconCls}`} style={{ width: 48, height: 48, borderRadius: 14 }}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <Bi vi={vi} zh={zh} en={en} viClass="text-sm font-medium text-mute" />
        <div className="text-ink">
          <CountUp value={value} className="v-value" />{" "}
          <span className="text-sm font-medium text-mute">{t("moldsCount", lang)}</span>
        </div>
      </div>
    </div>
  );
}

export function MoldOpenStats({ day, machines, moldsById }) {
  const { lang = "vi" } = useApp() || {};
  const stats = useMemo(() => countMoldsByShift(day, machines, moldsById), [day, machines, moldsById]);

  const totals = [
    { key: "day", label: t("dayShift", lang), value: stats.day },
    { key: "night", label: t("nightShift", lang), value: stats.night },
    { key: "total", label: t("totalSummary", lang), value: stats.total },
  ];

  const unassignedLabel = t("unassignedMold", lang);
  const byMold = stats.rows.map((r) => ({
    name: r.moldName || `— ${unassignedLabel}`,
    day: r.day,
    night: r.night,
    total: r.total,
  }));

  return (
    <div className={`${card} v-rise p-6`} style={{ "--i": 6 }}>
      <Bi
        vi="Thống kê máy đang mở theo khuôn"
        zh="按模具统计开机机器"
        en="Running Machines by Mold"
        viClass="text-lg font-bold text-ink"
      />
      <p className="mt-1 text-xs font-medium text-mute">
        {t("moldRulesNote", lang)}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <StatTile icon={Sun} iconCls="bg-warn-tint text-warn" vi="Ca ngày" zh="白班" en="Day Shift" value={stats.day} lang={lang} />
        <StatTile icon={Moon} iconCls="bg-night-tint text-night" vi="Ca đêm" zh="夜班" en="Night Shift" value={stats.night} lang={lang} />
        <StatTile icon={Layers} iconCls="bg-brand-tint text-brand" vi="Tổng cộng" zh="合计" en="Total" value={stats.total} lang={lang} />
      </div>

      {stats.total === 0 ? (
        <div className="py-10 text-center text-sm text-mute">
          {lang === "zh" ? "当天暂无工人排班" : lang === "en" ? "No workers scheduled for this date" : "Chưa có công nhân được xếp trong ngày này"}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <div className="mb-2 text-sm font-bold text-ink">{t("shiftComparison", lang)}</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={totals} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E9EDF7" />
                    <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<VenusTooltip />} cursor={{ fill: "rgba(67,24,255,0.06)", radius: 8 }} />
                    <Bar dataKey="value" name={t("moldsCount", lang)} radius={[10, 10, 0, 0]} maxBarSize={56} animationDuration={500} animationEasing="ease-out">
                      {totals.map((tItem) => <Cell key={tItem.key} fill={COLORS[tItem.key]} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 13, fontWeight: 700, fill: "#1B2559" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-ink">{t("byMold", lang)}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-mute">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.day }} />
                    {t("dayShift", lang)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.night }} />
                    {t("nightShift", lang)}
                  </span>
                </div>
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={byMold} margin={{ top: 26, right: 8, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E9EDF7" />
                    <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} width={32} domain={[0, "dataMax + 1"]} />
                    <Tooltip content={<StackTip lang={lang} />} cursor={{ fill: "rgba(67,24,255,0.06)", radius: 8 }} />
                    <Bar dataKey="day" name={t("dayShift", lang)} stackId="molds" fill={COLORS.day} stroke="#fff" strokeWidth={2} radius={[6, 6, 6, 6]} maxBarSize={34} animationDuration={500}>
                      <LabelList dataKey="day" position="center" formatter={hideZero} style={{ fontSize: 12, fontWeight: 700, fill: "#1B2559" }} />
                    </Bar>
                    <Bar dataKey="night" name={t("nightShift", lang)} stackId="molds" fill={COLORS.night} stroke="#fff" strokeWidth={2} radius={[6, 6, 6, 6]} maxBarSize={34} animationDuration={500}>
                      <LabelList dataKey="night" position="center" formatter={hideZero} style={{ fontSize: 12, fontWeight: 700, fill: "#1B2559" }} />
                      <LabelList dataKey="total" position="top" style={{ fontSize: 13, fontWeight: 700, fill: "#4318FF" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="pe-thead">
                <tr>
                  <th className="px-3 py-2.5 text-left">{t("mold", lang)}</th>
                  <th className="px-3 py-2.5 text-center">{t("dayShift", lang)}</th>
                  <th className="px-3 py-2.5 text-center">{t("nightShift", lang)}</th>
                  <th className="px-3 py-2.5 text-center">{t("totalSummary", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {stats.rows.map((r) => (
                  <tr key={r.key} className="border-t border-line hover:bg-canvas">
                    <td className="px-3 py-2.5 font-bold text-ink">{r.moldName || `— ${unassignedLabel}`}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-body">{r.day}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-body">{r.night}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-ink">{r.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-brand-tint font-bold">
                  <td className="px-3 py-3 text-brand">{t("totalSummary", lang)}</td>
                  <td className="px-3 py-3 text-center text-ink">{stats.day}</td>
                  <td className="px-3 py-3 text-center text-ink">{stats.night}</td>
                  <td className="px-3 py-3 text-center text-brand">{stats.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
