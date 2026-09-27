import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Modal } from "../ui/Overlays";
import { EMP_STATUS, EMP_STATUS_DEFS, POSITION_LIST, POSITION_ZH, RESIGN_REASONS } from "../../lib/constants";
import { suggestChineseName } from "../../lib/seed";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/styles";

export function EmployeeForm({ open, onClose, onSave, initial, existingCodes }) {
  const [form, setForm] = useState(() => initial || { employeeCode: "", vietnameseName: "", chineseName: "", birthYear: undefined, phone: "", address: "", joinDate: "", resignDate: "", resignReason: "", position: POSITION_LIST[0], status: EMP_STATUS.OFFICIAL, notes: "" });
  const [error, setError] = useState(""); const [suggestion, setSuggestion] = useState("");
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const submit = () => {
    if (!form.employeeCode.trim() || !form.vietnameseName.trim()) { setError("Vui lòng nhập đầy đủ Mã nhân viên và Tên tiếng Việt / 请填写完整"); return; }
    if (!initial && existingCodes.includes(form.employeeCode.trim())) { setError("Mã nhân viên đã tồn tại / 工号已存在"); return; }
    if (form.status === EMP_STATUS.RESIGNED && !form.resignDate) { setError("Vui lòng chọn Ngày rời đi / 请选择离职日期"); return; }
    if (form.status === EMP_STATUS.RESIGNED && !form.resignReason) { setError("Vui lòng chọn Lý do nghỉ việc / 请选择离职原因"); return; }
    setError(""); onSave(form);
  };
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Sửa hồ sơ nhân sự / 编辑员工资料" : "Thêm nhân sự mới / 新增员工"} wide footer={<><button className={btnSecondary} onClick={onClose}>Hủy</button><button className={btnPrimary} onClick={submit}>Lưu</button></>}>
      <div className="space-y-3">
        {error && <div className="rad-14 bg-bad-tint px-3 py-2 text-xs text-bad">{error}</div>}
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs text-mute">Mã nhân viên / 工号</label><input className={inputCls} value={form.employeeCode} onChange={(e) => set({ employeeCode: e.target.value })} disabled={!!initial} /></div><div><label className="mb-1 block text-xs text-mute">Tên tiếng Việt / 越南语姓名</label><input className={inputCls} value={form.vietnameseName} onChange={(e) => set({ vietnameseName: e.target.value })} /></div></div>
        <div><label className="mb-1 block text-xs text-mute">Tên tiếng Trung / 中文姓名 (dữ liệu chính thức)</label>
          <div className="flex gap-2"><input className={inputCls} value={form.chineseName} onChange={(e) => set({ chineseName: e.target.value })} placeholder="Chưa cập nhật" /><button type="button" className={`${btnSecondary} shrink-0`} onClick={() => setSuggestion(suggestChineseName(form.vietnameseName))}><Wand2 size={14} /> Gợi ý</button></div>
          {suggestion && (<div className="mt-1.5 flex items-center justify-between rad-14 bg-brand-tint px-2.5 py-1.5 text-xs text-brand"><span>Gợi ý: {suggestion}</span><button className="font-semibold underline" onClick={() => { set({ chineseName: suggestion }); setSuggestion(""); }}>Xác nhận</button></div>)}
        </div>
        <div className="grid grid-cols-3 gap-3"><div><label className="mb-1 block text-xs text-mute">Năm sinh / 出生年</label><input type="number" className={inputCls} value={form.birthYear} onChange={(e) => set({ birthYear: Number(e.target.value) })} /></div><div><label className="mb-1 block text-xs text-mute">SĐT / 电话</label><input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></div><div><label className="mb-1 block text-xs text-mute">Ngày vào làm / 入职日期</label><input type="date" className={inputCls} value={form.joinDate} onChange={(e) => set({ joinDate: e.target.value })} /></div></div>
        <div><label className="mb-1 block text-xs text-mute">Địa chỉ / 地址</label><input className={inputCls} value={form.address} onChange={(e) => set({ address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs text-mute">Vị trí / 职位</label><select className={inputCls} value={form.position} onChange={(e) => set({ position: e.target.value })}>{POSITION_LIST.map((p) => <option key={p} value={p}>{p} / {POSITION_ZH[p]}</option>)}</select></div>
          <div><label className="mb-1 block text-xs text-mute">Trạng thái / 状态</label><select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value })}>{EMP_STATUS_DEFS.map((s) => <option key={s.vi} value={s.vi}>{s.vi} / {s.zh}</option>)}</select></div>
        </div>
        {form.status === EMP_STATUS.RESIGNED && (<div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs text-mute">Ngày rời đi / 离职日期</label><input type="date" className={inputCls} value={form.resignDate || ""} onChange={(e) => set({ resignDate: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-mute">Lý do nghỉ / 离职原因</label><select className={inputCls} value={form.resignReason || ""} onChange={(e) => set({ resignReason: e.target.value })}><option value="">— Chọn lý do / 选择原因 —</option>{RESIGN_REASONS.map((r) => <option key={r.vi} value={r.vi}>{r.vi} / {r.zh}</option>)}</select></div>
        </div>)}
      </div>
    </Modal>
  );
}
