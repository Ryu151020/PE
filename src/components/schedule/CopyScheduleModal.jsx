import { useState } from "react";
import { Modal } from "../ui/Overlays";
import { TODAY_KEY, toDisplay } from "../../lib/dates";
import { btnDanger, btnPrimary, btnSecondary, inputCls } from "../../lib/styles";

export function CopyScheduleModal({ open, onClose, targetDateKey, availableDates, buildPreview, onApply }) {
  const SCOPE = [
    { key: "all", label: "Toàn bộ kế hoạch / 全部" }, { key: "dayOnly", label: "Chỉ ca ngày / 仅白班" }, { key: "nightOnly", label: "Chỉ ca đêm / 仅夜班" },
    { key: "workersOnly", label: "Chỉ nhân sự / 仅人员" }, { key: "machinesOnly", label: "Chỉ máy / khuôn / 仅设备模具" }, { key: "ordersOnly", label: "Chỉ đơn hàng / 仅订单" },
    { key: "techOnly", label: "Chỉ kỹ thuật viên / 仅技术员" }, { key: "leadersOnly", label: "Chỉ ca trưởng / tổ trưởng / 仅班组长" },
  ];
  const scopeToOptions = (s) => ({
    all: { copyWorkers: true, copyTechnicians: true, copyOtherWorkers: true, copyMachines: true, copyOrders: true, copyLeaders: true },
    dayOnly: { copyWorkers: true, copyTechnicians: true, copyOtherWorkers: true, copyMachines: true, copyOrders: true, copyLeaders: false },
    nightOnly: { copyWorkers: true, copyTechnicians: true, copyOtherWorkers: true, copyMachines: true, copyOrders: true, copyLeaders: false },
    workersOnly: { copyWorkers: true, copyTechnicians: false, copyOtherWorkers: false, copyMachines: false, copyOrders: false, copyLeaders: false },
    machinesOnly: { copyWorkers: false, copyTechnicians: false, copyOtherWorkers: false, copyMachines: true, copyOrders: false, copyLeaders: false },
    ordersOnly: { copyWorkers: false, copyTechnicians: false, copyOtherWorkers: false, copyMachines: false, copyOrders: true, copyLeaders: false },
    techOnly: { copyWorkers: false, copyTechnicians: true, copyOtherWorkers: false, copyMachines: false, copyOrders: false, copyLeaders: false },
    leadersOnly: { copyWorkers: false, copyTechnicians: false, copyOtherWorkers: false, copyMachines: false, copyOrders: false, copyLeaders: true },
  }[s]);
  const [sourceDate, setSourceDate] = useState(() => availableDates.find((d) => d !== targetDateKey) || TODAY_KEY);
  const [scope, setScope] = useState("all");
  const [step, setStep] = useState("select");
  const [previewDay, setPreviewDay] = useState(null);
  if (!open) return null;
  return (
    <Modal open={open} onClose={() => { setStep("select"); onClose(); }} title="Lấy kế hoạch từ ngày khác / 从其他日期获取数据" wide
      footer={step === "select" ? (<><button className={btnSecondary} onClick={onClose}>Hủy</button><button className={btnPrimary} onClick={() => { const preview = buildPreview(sourceDate, scopeToOptions(scope)); setPreviewDay(preview); setStep("preview"); }}>Xem trước</button></>)
        : step === "preview" ? (<><button className={btnSecondary} onClick={() => setStep("select")}>Quay lại</button><button className={btnPrimary} onClick={() => setStep("confirm")}>Áp dụng</button></>)
        : (<><button className={btnSecondary} onClick={() => setStep("preview")}>Hủy</button><button className={btnDanger} onClick={() => { onApply(previewDay); setStep("select"); setPreviewDay(null); onClose(); }}>Xác nhận ghi đè</button></>)}>
      {step === "select" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-mute">Ngày nguồn / 来源日期</label><select className={inputCls} value={sourceDate} onChange={(e) => setSourceDate(e.target.value)}>{availableDates.map((d) => <option key={d} value={d}>{toDisplay(d)}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-mute">Ngày đích / 目标日期</label><input className={`${inputCls}`} value={toDisplay(targetDateKey)} disabled /></div>
          </div>
          <div><label className="mb-1.5 block text-xs font-medium text-mute">Phạm vi dữ liệu / 数据范围</label>
            <div className="space-y-1.5">{SCOPE.map((opt) => (<label key={opt.key} className="flex items-center gap-2 text-sm text-ink cursor-pointer"><input type="radio" name="scope" checked={scope === opt.key} onChange={() => setScope(opt.key)} />{opt.label}</label>))}</div>
          </div>
        </div>
      )}
      {step === "preview" && previewDay && (
        <div className="space-y-3">
          <div className="rad-14 bg-canvas p-3 text-sm">Xem trước dữ liệu sẽ được ghi vào <strong>{toDisplay(targetDateKey)}</strong> từ <strong>{toDisplay(sourceDate)}</strong>.</div>
          <p className="text-xs text-body">Lưu ý: nhân viên đã nghỉ việc trước ngày {toDisplay(targetDateKey)} sẽ tự động được loại khỏi bản sao / 已离职员工将被自动排除。</p>
        </div>
      )}
      {step === "confirm" && (<div className="rad-14 border border-warn-soft bg-warn-tint p-4 text-sm text-warn">Bạn có chắc muốn lấy dữ liệu từ ngày <strong>{toDisplay(sourceDate)}</strong> sang ngày <strong>{toDisplay(targetDateKey)}</strong>? Dữ liệu hiện tại của ngày đích sẽ bị ghi đè.</div>)}
    </Modal>
  );
}
