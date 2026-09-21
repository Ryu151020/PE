import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { DeleteDataCard } from "../components/data/DeleteDataCard";
import { Bi } from "../components/ui/Bi";
import { DateFieldVN } from "../components/ui/Fields";
import { Modal } from "../components/ui/Overlays";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../context/AppContext";
import { TODAY_KEY } from "../lib/dates";
import { buildSchedulesFromRows, exportWorkbook, parseWorkbook } from "../lib/excel";
import { btnPrimary, btnSecondary, card } from "../lib/styles";

export function DataPage() {
  const { db, setDb, pushToast, role, confirmAction } = useApp();
  const scheduleDates = useMemo(() => Object.keys(db.schedules).filter((k) => db.schedules[k]).sort(), [db.schedules]);
  const [range, setRange] = useState(() => ({ from: scheduleDates[0] || TODAY_KEY, to: scheduleDates[scheduleDates.length - 1] || TODAY_KEY }));
  const [importPreview, setImportPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = () => {
    try {
      exportWorkbook(db, range.from, range.to);
      pushToast("Đã tải xuống file Excel / 已下载 Excel 文件", "success");
    } catch (err) {
      pushToast("Không thể tạo file Excel / 无法生成 Excel 文件", "error");
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const parsed = parseWorkbook(wb);
      const scheduleDays = parsed.scheduleRows ? buildSchedulesFromRows(parsed.scheduleRows, db.machines, parsed.employees || db.employees, parsed.molds || db.molds, parsed.orders || db.orders) : null;
      setImportPreview({ ...parsed, scheduleDays, fileName: file.name });
    } catch (err) {
      pushToast("Không đọc được file — vui lòng kiểm tra định dạng Excel / 无法读取文件", "error");
    }
    e.target.value = "";
  };

  const applyImport = () => {
    if (!importPreview) return;
    setDb((p) => ({
      ...p,
      molds: importPreview.molds || p.molds,
      orders: importPreview.orders || p.orders,
      employees: importPreview.employees || p.employees,
      schedules: importPreview.scheduleDays ? { ...p.schedules, ...importPreview.scheduleDays } : p.schedules,
    }));
    pushToast("Đã nạp dữ liệu từ Excel vào hệ thống / 已导入数据", "success");
    setImportPreview(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader vi="Dữ liệu" zh="数据管理" />
      <div className="grid gap-5 grid-cols-2">
        <div className={`${card} v-rise v-hover-lift p-6`} style={{ "--i": 0 }}>
          <div className="mb-3 flex items-center gap-4"><div className="v-stat-icon bg-canvas text-brand"><Download size={24} /></div><Bi vi="Xuất dữ liệu ra Excel" zh="导出数据为 Excel" viClass="text-lg font-bold text-ink" zhClass="text-sm font-medium text-mute" /></div>
          <p className="mb-3 text-xs text-mute">File Excel gồm 4 sheet: <strong>Khuôn máy, Đơn hàng, Nhân sự, Kế hoạch</strong> (sheet Kế hoạch theo khoảng ngày chọn bên dưới). Dùng file này làm mẫu — chỉnh sửa rồi tải lên lại ở khung bên phải.</p>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs text-mute">Từ / 从</span><DateFieldVN value={range.from} onChange={(v) => setRange({ ...range, from: v })} />
            <span className="text-xs text-mute">Đến / 到</span><DateFieldVN value={range.to} onChange={(v) => setRange({ ...range, to: v })} />
          </div>
          <button className={btnPrimary} onClick={handleExport}><Download size={14} /> Tải xuống Excel / 下载 Excel</button>
        </div>
        <div className={`${card} v-rise v-hover-lift p-6`} style={{ "--i": 1 }}>
          <div className="mb-3 flex items-center gap-4"><div className="v-stat-icon bg-canvas text-brand"><Upload size={24} /></div><Bi vi="Nhập dữ liệu từ Excel" zh="从 Excel 导入数据" viClass="text-lg font-bold text-ink" zhClass="text-sm font-medium text-mute" /></div>
          <p className="mb-3 text-xs text-mute">Tải lên file Excel theo đúng cấu trúc mẫu (tải xuống ở khung bên trái nếu chưa có). Hệ thống sẽ nạp dữ liệu vào các sheet tương ứng và các ngày kế hoạch tương ứng.</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          <button className={btnSecondary} onClick={() => fileInputRef.current?.click()}><FileSpreadsheet size={14} /> Chọn file Excel / 选择文件</button>
        </div>
      </div>
      <DeleteDataCard db={db} setDb={setDb} role={role} pushToast={pushToast} confirmAction={confirmAction} scheduleDates={scheduleDates} />
      {importPreview && (
        <Modal open onClose={() => setImportPreview(null)} title={`Xem trước dữ liệu nhập: ${importPreview.fileName}`} wide
          footer={<><button className={btnSecondary} onClick={() => setImportPreview(null)}>Hủy</button><button className={btnPrimary} onClick={applyImport}>Nạp vào hệ thống / 导入</button></>}>
          <div className="space-y-2 text-sm">
            {importPreview.molds && <div>Khuôn máy / 模具: <strong>{importPreview.molds.length}</strong> dòng</div>}
            {importPreview.orders && <div>Đơn hàng / 订单: <strong>{importPreview.orders.length}</strong> dòng</div>}
            {importPreview.employees && <div>Nhân sự / 人员: <strong>{importPreview.employees.length}</strong> dòng</div>}
            {importPreview.scheduleDays && <div>Kế hoạch / 排班: <strong>{Object.keys(importPreview.scheduleDays).length}</strong> ngày</div>}
            {!importPreview.molds && !importPreview.orders && !importPreview.employees && !importPreview.scheduleDays && <div className="text-mute">Không tìm thấy sheet nào phù hợp trong file này.</div>}
            <p className="mt-2 text-xs text-warn">Lưu ý: dữ liệu sẽ được ghi đè/gộp vào hệ thống hiện tại và không thể hoàn tác.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
