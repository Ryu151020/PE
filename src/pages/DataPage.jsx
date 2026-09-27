import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DeleteDataCard } from "../components/data/DeleteDataCard";
import { Bi } from "../components/ui/Bi";
import { DateFieldVN } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../context/AppContext";
import { TODAY_KEY } from "../lib/dates";
import { exportWorkbook } from "../lib/excel";
import { btnPrimary, card } from "../lib/styles";

export function DataPage() {
  const { db, setDb, pushToast, role, confirmAction } = useApp();
  const scheduleDates = useMemo(() => Object.keys(db.schedules).filter((k) => db.schedules[k]).sort(), [db.schedules]);
  const [range, setRange] = useState(() => ({ from: scheduleDates[0] || TODAY_KEY, to: scheduleDates[scheduleDates.length - 1] || TODAY_KEY }));

  const handleExport = () => {
    try {
      exportWorkbook(db, range.from, range.to);
      pushToast("Đã tải xuống file Excel / 已下载 Excel 文件", "success");
    } catch (err) {
      pushToast("Không thể tạo file Excel / 无法生成 Excel 文件", "error");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader vi="Dữ liệu" zh="数据管理" />
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        <div className={`${card} v-rise v-hover-lift p-6`}>
          <div className="mb-3 flex items-center gap-4">
            <div className="v-stat-icon bg-canvas text-brand">
              <Download size={24} />
            </div>
            <Bi vi="Xuất dữ liệu ra Excel" zh="导出数据为 Excel" viClass="text-lg font-bold text-ink" zhClass="text-sm font-medium text-mute" />
          </div>
          <p className="mb-3 text-sm text-mute">File Excel gồm 4 sheet: <strong>Khuôn máy, Đơn hàng, Nhân sự, Kế hoạch</strong> (sheet Kế hoạch theo khoảng ngày chọn bên dưới).</p>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-sm text-mute">Từ / 从</span>
            <DateFieldVN value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
            <span className="text-sm text-mute">Đến / 到</span>
            <DateFieldVN value={range.to} onChange={(v) => setRange({ ...range, to: v })} />
          </div>
          <button className={btnPrimary} onClick={handleExport}>
            <Download size={14} /> Tải xuống Excel / 下载 Excel
          </button>
        </div>
      </div>
      <DeleteDataCard db={db} setDb={setDb} role={role} pushToast={pushToast} confirmAction={confirmAction} scheduleDates={scheduleDates} />
    </div>
  );
}
