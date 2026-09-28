import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DeleteDataCard } from "../components/data/DeleteDataCard";
import { Bi } from "../components/ui/Bi";
import { DateFieldVN } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../context/AppContext";
import { TODAY_KEY } from "../lib/dates";
import { exportWorkbook } from "../lib/excel";
import { t } from "../lib/i18n";
import { btnPrimary, card } from "../lib/styles";

export function DataPage() {
  const { db, setDb, pushToast, role, confirmAction, lang = "vi" } = useApp();
  const scheduleDates = useMemo(() => Object.keys(db.schedules).filter((k) => db.schedules[k]).sort(), [db.schedules]);
  const [range, setRange] = useState(() => ({ from: scheduleDates[0] || TODAY_KEY, to: scheduleDates[scheduleDates.length - 1] || TODAY_KEY }));

  const handleExport = () => {
    try {
      exportWorkbook(db, range.from, range.to);
      pushToast(lang === "zh" ? "已下载 Excel 文件" : lang === "en" ? "Excel file downloaded" : "Đã tải xuống file Excel", "success");
    } catch (err) {
      pushToast(lang === "zh" ? "无法生成 Excel 文件" : lang === "en" ? "Cannot generate Excel file" : "Không thể tạo file Excel", "error");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader vi="Dữ liệu" zh="数据管理" />
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* Card bên trái: Xuất dữ liệu ra Excel */}
        <div className={`${card} v-rise v-hover-lift p-6 flex flex-col justify-between h-full`} style={{ "--i": 1 }}>
          <div>
            <div className="mb-4 flex items-center gap-4">
              <div className="v-stat-icon bg-canvas text-brand">
                <Download size={24} />
              </div>
              <Bi vi="Xuất dữ liệu ra Excel" zh="导出数据为 Excel" en="Export Data to Excel" viClass="text-lg font-bold text-ink" />
            </div>
            <p className="mb-4 text-sm text-body">
              {lang === "zh"
                ? "Excel 文件包含 4 个工作表：模具数据、订单数据、人员管理、排单计划。"
                : lang === "en"
                ? "Excel workbook includes 4 sheets: Molds, Orders, Personnel, Schedule."
                : "File Excel gồm 4 sheet: Khuôn máy, Đơn hàng, Nhân sự, Kế hoạch."}
            </p>
            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs text-mute font-semibold">{t("from", lang)}</span>
              <DateFieldVN value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
              <span className="text-xs text-mute font-semibold">{t("to", lang)}</span>
              <DateFieldVN value={range.to} onChange={(v) => setRange({ ...range, to: v })} />
            </div>
          </div>
          <div>
            <button className={btnPrimary} onClick={handleExport}>
              <Download size={14} /> {t("downloadExcel", lang)}
            </button>
          </div>
        </div>

        {/* Card bên phải: Xóa dữ liệu */}
        <DeleteDataCard db={db} setDb={setDb} role={role} pushToast={pushToast} confirmAction={confirmAction} scheduleDates={scheduleDates} />
      </div>
    </div>
  );
}
