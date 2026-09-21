import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Layers, Moon, Sun } from "lucide-react";
import { countMoldsByShift } from "../../lib/schedule";
import { card } from "../../lib/styles";
import { Bi } from "../ui/Bi";
import { AXIS_TICK, VenusTooltip } from "../ui/ChartHelpers";
import { CountUp } from "../ui/CountUp";

const COLORS = { day: "#FFB547", night: "#6AD2FF", total: "#4318FF" };
const hideZero = (v) => (v > 0 ? v : "");   // no "0" labels inside empty segments

/* tooltip for the stacked chart: day, night and the total of the hovered mold */
function StackTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="v-tip">
      <span className="v-tip-label">{label}</span>
      <span>Ca ngày / 白班: {row.day}</span>
      <span>Ca đêm / 夜班: {row.night}</span>
      <span>Tổng cộng / 合计: {row.total}</span>
    </div>
  );
}

function StatTile({ icon: Icon, iconCls, vi, zh, value }) {
  return (
    <div className="rad-20 bg-canvas flex items-center gap-4 p-4">
      <div className={`v-stat-icon ${iconCls}`} style={{ width: 48, height: 48, borderRadius: 14 }}><Icon size={22} /></div>
      <div className="min-w-0">
        <Bi vi={vi} zh={zh} viClass="text-sm font-medium text-mute" zhClass="text-xs text-mute" />
        <div className="text-ink"><CountUp value={value} className="v-value" /> <span className="text-sm font-medium text-mute">khuôn / 模具</span></div>
      </div>
    </div>
  );
}

/* 按模具统计开机机器 — open molds per shift, based on the presence of workers (see countMoldsByShift). */
export function MoldOpenStats({ day, machines, moldsById }) {
  const stats = useMemo(() => countMoldsByShift(day, machines, moldsById), [day, machines, moldsById]);
  const totals = [
    { key: "day", label: "Ca ngày / 白班", value: stats.day },
    { key: "night", label: "Ca đêm / 夜班", value: stats.night },
    { key: "total", label: "Tổng cộng / 合计", value: stats.total },
  ];
  const byMold = stats.rows.map((r) => ({ name: r.moldName || "— Chưa gán / 未分配", day: r.day, night: r.night, total: r.total }));
  return (
    <div className={`${card} v-rise p-6`} style={{ "--i": 6 }}>
      <Bi vi="Thống kê máy đang mở theo khuôn" zh="按模具统计开机机器" viClass="text-lg font-bold text-ink" zhClass="text-sm font-medium text-mute" />
      <p className="mt-1 text-xs font-medium text-mute">Mỗi khuôn có công nhân trong ca = 1 khuôn mở (1 hay nhiều người đều tính 1; không có người = 0) / 该班次工人栏有人即计 1 个开机模具（不论几人），无人为 0</p>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <StatTile icon={Sun} iconCls="bg-warn-tint text-warn" vi="Ca ngày" zh="白班" value={stats.day} />
        <StatTile icon={Moon} iconCls="bg-night-tint text-night" vi="Ca đêm" zh="夜班" value={stats.night} />
        <StatTile icon={Layers} iconCls="bg-brand-tint text-brand" vi="Tổng cộng" zh="合计" value={stats.total} />
      </div>

      {stats.total === 0 ? (
        <div className="py-10 text-center text-sm text-mute">Chưa có công nhân được xếp trong ngày này / 当天暂无工人排班</div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Day vs night vs total */}
            <div>
              <div className="mb-2 text-sm font-bold text-ink">So sánh ca / 班次对比</div>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={totals} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E9EDF7" />
                    <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<VenusTooltip />} cursor={{ fill: "rgba(67,24,255,0.06)", radius: 8 }} />
                    <Bar dataKey="value" name="Số khuôn / 模具数" radius={[10, 10, 0, 0]} maxBarSize={56} animationDuration={500} animationEasing="ease-out">
                      {totals.map((t) => <Cell key={t.key} fill={COLORS[t.key]} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 13, fontWeight: 700, fill: "#1B2559" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* per mold: stacked day + night, segment values in the middle, total on top */}
            <div className="lg:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-ink">Theo từng khuôn / 按模具</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-mute">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.day }} />Ca ngày / 白班</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS.night }} />Ca đêm / 夜班</span>
                  <span>Số trên đầu cột = Tổng cộng / 柱顶数字 = 合计</span>
                </div>
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={byMold} margin={{ top: 26, right: 8, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E9EDF7" />
                    <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-25} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} width={32} domain={[0, "dataMax + 1"]} />
                    <Tooltip content={<StackTip />} cursor={{ fill: "rgba(67,24,255,0.06)", radius: 8 }} />
                    <Bar dataKey="day" name="Ca ngày / 白班" stackId="molds" fill={COLORS.day} stroke="#fff" strokeWidth={2} radius={[6, 6, 6, 6]} maxBarSize={34} animationDuration={500}>
                      <LabelList dataKey="day" position="center" formatter={hideZero} style={{ fontSize: 12, fontWeight: 700, fill: "#1B2559" }} />
                    </Bar>
                    <Bar dataKey="night" name="Ca đêm / 夜班" stackId="molds" fill={COLORS.night} stroke="#fff" strokeWidth={2} radius={[6, 6, 6, 6]} maxBarSize={34} animationDuration={500}>
                      <LabelList dataKey="night" position="center" formatter={hideZero} style={{ fontSize: 12, fontWeight: 700, fill: "#1B2559" }} />
                      <LabelList dataKey="total" position="top" style={{ fontSize: 13, fontWeight: 700, fill: "#4318FF" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* data table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="pe-thead">
                <tr>
                  <th className="px-3 py-2.5 text-left">Khuôn / 模具</th>
                  <th className="px-3 py-2.5 text-center">Ca ngày / 白班</th>
                  <th className="px-3 py-2.5 text-center">Ca đêm / 夜班</th>
                  <th className="px-3 py-2.5 text-center">Tổng cộng / 合计</th>
                </tr>
              </thead>
              <tbody>
                {stats.rows.map((r) => (
                  <tr key={r.key} className="border-t border-line hover:bg-canvas">
                    <td className="px-3 py-2.5 font-bold text-ink">{r.moldName || "— Chưa gán khuôn / 未分配模具"}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-body">{r.day}</td>
                    <td className="px-3 py-2.5 text-center font-medium text-body">{r.night}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-ink">{r.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-brand-tint font-bold">
                  <td className="px-3 py-3 text-brand">Tổng cộng / 合计</td>
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
