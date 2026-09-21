import { useState } from "react";
import { Modal } from "../ui/Overlays";
import { MOLD_STATUS, MOLD_STATUS_DEFS } from "../../lib/constants";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/styles";

/* ============================================================
   MOLDS PAGE (machine management removed per spec)
   ============================================================ */
export function MoldForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(() => initial || { moldName: "", status: MOLD_STATUS.SẴN_SÀNG, notes: "" });
  const [error, setError] = useState("");
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const submit = () => { if (!form.moldName.trim()) { setError("Vui lòng nhập Tên khuôn / 请输入模具名称"); return; } setError(""); onSave(form); };
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Sửa khuôn / 编辑模具" : "Thêm khuôn mới / 新增模具"} footer={<><button className={btnSecondary} onClick={onClose}>Hủy</button><button className={btnPrimary} onClick={submit}>Lưu</button></>}>
      <div className="space-y-3">
        {error && <div className="rad-14 bg-bad-tint px-3 py-2 text-xs text-bad">{error}</div>}
        <div><label className="mb-1 block text-xs text-mute">Tên khuôn / 模具名称</label><input className={inputCls} value={form.moldName} onChange={(e) => set({ moldName: e.target.value })} /></div>
        <div><label className="mb-1 block text-xs text-mute">Trạng thái / 状态</label><select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value })}>{MOLD_STATUS_DEFS.map((s) => <option key={s.vi} value={s.vi}>{s.vi} / {s.zh}</option>)}</select></div>
        <div><label className="mb-1 block text-xs text-mute">Ghi chú / 备注</label><textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
