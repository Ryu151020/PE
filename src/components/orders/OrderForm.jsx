import { useState } from "react";
import { Modal } from "../ui/Overlays";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/styles";

/* ============================================================
   ORDERS PAGE (simplified: Mã đơn hàng / Khuôn & Size / Cuộn màng)
   ============================================================ */
export function OrderForm({ open, onClose, onSave, initial, molds, existingCodes }) {
  const [form, setForm] = useState(() => initial || { orderCode: "", moldId: "", size: "", filmRollName: "", completed: false });
  const [error, setError] = useState("");
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const submit = () => {
    if (!form.orderCode.trim()) { setError("Vui lòng nhập Mã đơn hàng / 请输入订单编号"); return; }
    if (!initial && existingCodes.includes(form.orderCode.trim())) { setError("Mã đơn hàng đã tồn tại / 订单编号已存在"); return; }
    setError(""); onSave(form);
  };
  return (
    <Modal open={open} onClose={onClose} title="Thêm đơn hàng mới / 新增订单" footer={<><button className={btnSecondary} onClick={onClose}>Hủy</button><button className={btnPrimary} onClick={submit}>Lưu</button></>}>
      <div className="space-y-3">
        {error && <div className="rad-14 bg-bad-tint px-3 py-2 text-xs text-bad">{error}</div>}
        <div><label className="mb-1 block text-xs text-mute">Mã đơn hàng / 订单编号</label><input className={inputCls} value={form.orderCode} onChange={(e) => set({ orderCode: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs text-mute">Khuôn / 模具</label><select className={inputCls} value={form.moldId || ""} onChange={(e) => set({ moldId: e.target.value || null })}><option value="">— Chưa gán —</option>{molds.map((m) => <option key={m.id} value={m.id}>{m.moldName}</option>)}</select></div>
          <div><label className="mb-1 block text-xs text-mute">Size</label><input className={inputCls} value={form.size} onChange={(e) => set({ size: e.target.value })} /></div>
        </div>
        <div><label className="mb-1 block text-xs text-mute">Tên cuộn màng / 卷膜名称</label><input className={inputCls} value={form.filmRollName} onChange={(e) => set({ filmRollName: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
