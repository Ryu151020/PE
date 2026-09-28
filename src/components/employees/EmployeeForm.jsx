import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Modal } from "../ui/Overlays";
import { useApp } from "../../context/AppContext";
import { EMP_STATUS, EMP_STATUS_DEFS, POSITION_LIST, RESIGN_REASONS } from "../../lib/constants";
import { getPositionLabel, getResignReasonLabel, getStatusLabel, t } from "../../lib/i18n";
import { suggestChineseName } from "../../lib/seed";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/styles";

export function EmployeeForm({ open, onClose, onSave, initial, existingCodes }) {
  const { lang = "vi" } = useApp() || {};
  const [form, setForm] = useState(() => initial || { employeeCode: "", vietnameseName: "", chineseName: "", birthYear: undefined, phone: "", address: "", joinDate: "", resignDate: "", resignReason: "", position: POSITION_LIST[0], status: EMP_STATUS.OFFICIAL, notes: "" });
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const set = (p) => setForm((f) => ({ ...f, ...p }));

  const submit = () => {
    if (!form.employeeCode.trim() || !form.vietnameseName.trim()) {
      setError(lang === "zh" ? "请填写工号和越南语姓名" : lang === "en" ? "Please fill Employee ID and VN Name" : "Vui lòng nhập đầy đủ Mã nhân viên và Tên tiếng Việt");
      return;
    }
    if (!initial && existingCodes.includes(form.employeeCode.trim())) {
      setError(lang === "zh" ? "工号已存在" : lang === "en" ? "Employee ID already exists" : "Mã nhân viên đã tồn tại");
      return;
    }
    if (form.status === EMP_STATUS.RESIGNED && !form.resignDate) {
      setError(lang === "zh" ? "请选择离职日期" : lang === "en" ? "Please select resign date" : "Vui lòng chọn Ngày rời đi");
      return;
    }
    if (form.status === EMP_STATUS.RESIGNED && !form.resignReason) {
      setError(lang === "zh" ? "请选择离职原因" : lang === "en" ? "Please select resign reason" : "Vui lòng chọn Lý do nghỉ việc");
      return;
    }
    setError("");
    onSave(form);
  };

  const modalTitle = initial
    ? (lang === "zh" ? "编辑员工资料" : lang === "en" ? "Edit Employee" : "Sửa hồ sơ nhân sự")
    : (lang === "zh" ? "新增员工" : lang === "en" ? "Add Employee" : "Thêm nhân sự mới");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      wide
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>{t("cancel", lang)}</button>
          <button className={btnPrimary} onClick={submit}>{t("save", lang)}</button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="rad-14 bg-bad-tint px-3 py-2 text-xs text-bad">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-mute font-medium">{t("empCode", lang)}</label>
            <input className={inputCls} value={form.employeeCode} onChange={(e) => set({ employeeCode: e.target.value })} disabled={!!initial} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mute font-medium">{t("vnName", lang)}</label>
            <input className={inputCls} value={form.vietnameseName} onChange={(e) => set({ vietnameseName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-mute font-medium">{t("cnName", lang)}</label>
          <div className="flex gap-2">
            <input className={inputCls} value={form.chineseName} onChange={(e) => set({ chineseName: e.target.value })} placeholder="Chưa cập nhật" />
            <button type="button" className={`${btnSecondary} shrink-0`} onClick={() => setSuggestion(suggestChineseName(form.vietnameseName))}>
              <Wand2 size={14} /> {lang === "zh" ? "推荐" : lang === "en" ? "Suggest" : "Gợi ý"}
            </button>
          </div>
          {suggestion && (
            <div className="mt-1.5 flex items-center justify-between rad-14 bg-brand-tint px-2.5 py-1.5 text-xs text-brand">
              <span>{lang === "zh" ? "建议" : lang === "en" ? "Suggestion" : "Gợi ý"}: {suggestion}</span>
              <button className="font-semibold underline" onClick={() => { set({ chineseName: suggestion }); setSuggestion(""); }}>
                {lang === "zh" ? "确认" : lang === "en" ? "Accept" : "Xác nhận"}
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs text-mute font-medium">{t("birthYear", lang)}</label>
            <input type="number" className={inputCls} value={form.birthYear || ""} onChange={(e) => set({ birthYear: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mute font-medium">{t("phone", lang)}</label>
            <input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mute font-medium">{t("joinDate", lang)}</label>
            <input type="date" className={inputCls} value={form.joinDate} onChange={(e) => set({ joinDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-mute font-medium">{t("address", lang)}</label>
          <input className={inputCls} value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-mute font-medium">{t("position", lang)}</label>
            <select className={inputCls} value={form.position} onChange={(e) => set({ position: e.target.value })}>
              {POSITION_LIST.map((p) => (
                <option key={p} value={p}>{getPositionLabel(p, lang)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-mute font-medium">{t("status", lang)}</label>
            <select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value })}>
              {EMP_STATUS_DEFS.map((s) => (
                <option key={s.vi} value={s.vi}>{getStatusLabel(s.vi, lang)}</option>
              ))}
            </select>
          </div>
        </div>
        {form.status === EMP_STATUS.RESIGNED && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-mute font-medium">{t("resignDate", lang)}</label>
              <input type="date" className={inputCls} value={form.resignDate || ""} onChange={(e) => set({ resignDate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-mute font-medium">{lang === "zh" ? "离职原因" : lang === "en" ? "Resign Reason" : "Lý do nghỉ việc"}</label>
              <select className={inputCls} value={form.resignReason || ""} onChange={(e) => set({ resignReason: e.target.value })}>
                <option value="">{t("selectPlaceholder", lang)}</option>
                {RESIGN_REASONS.map((r) => (
                  <option key={r.vi} value={r.vi}>{getResignReasonLabel(r.vi, lang)}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
