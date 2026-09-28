import { useState } from "react";
import { Modal } from "../ui/Overlays";
import { MOLD_STATUS, MOLD_STATUS_DEFS } from "../../lib/constants";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/styles";
import { useApp } from "../../context/AppContext";
import { getMoldStatusLabel, t } from "../../lib/i18n";

/* ============================================================
   MOLDS PAGE (machine management removed per spec)
   ============================================================ */
export function MoldForm({ open, onClose, onSave, initial }) {
  const { lang = "vi" } = useApp() || {};
  const [form, setForm] = useState(() => initial || { moldName: "", status: MOLD_STATUS.SẴN_SÀNG, notes: "" });
  const [error, setError] = useState("");
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const submit = () => {
    if (!form.moldName.trim()) {
      setError(lang === "zh" ? "请输入模具名称" : lang === "en" ? "Please enter mold name" : "Vui lòng nhập Tên khuôn");
      return;
    }
    setError("");
    onSave(form);
  };

  const title = initial
    ? (lang === "zh" ? "编辑模具" : lang === "en" ? "Edit Mold" : "Sửa khuôn")
    : (lang === "zh" ? "新增模具" : lang === "en" ? "Add Mold" : "Thêm khuôn mới");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose}>{t("cancel", lang)}</button>
          <button className={btnPrimary} onClick={submit}>{t("save", lang)}</button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="rad-14 bg-bad-tint px-3 py-2 text-xs text-bad">{error}</div>}
        <div>
          <label className="mb-1 block text-xs text-mute">{lang === "zh" ? "模具名称" : lang === "en" ? "Mold Name" : "Tên khuôn"}</label>
          <input className={inputCls} value={form.moldName} onChange={(e) => set({ moldName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mute">{t("status", lang)}</label>
          <select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value })}>
            {MOLD_STATUS_DEFS.map((s) => (
              <option key={s.vi} value={s.vi}>
                {getMoldStatusLabel(s.vi, lang)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-mute">{lang === "zh" ? "备注" : lang === "en" ? "Notes" : "Ghi chú"}</label>
          <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
