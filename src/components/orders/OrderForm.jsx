import { useState } from "react";
import { Modal } from "../ui/Overlays";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/styles";
import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";

/* ============================================================
   ORDERS PAGE (simplified: Mã đơn hàng / Khuôn & Size / Cuộn màng)
   ============================================================ */
export function OrderForm({ open, onClose, onSave, initial, molds, existingCodes }) {
  const { lang = "vi" } = useApp() || {};
  const [form, setForm] = useState(() => initial || { orderCode: "", moldId: "", size: "", filmRollName: "", completed: false });
  const [error, setError] = useState("");
  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const submit = () => {
    if (!form.orderCode.trim()) {
      setError(lang === "zh" ? "请输入订单编号" : lang === "en" ? "Please enter order code" : "Vui lòng nhập Mã đơn hàng");
      return;
    }
    if (!initial && existingCodes.includes(form.orderCode.trim())) {
      setError(lang === "zh" ? "订单编号已存在" : lang === "en" ? "Order code already exists" : "Mã đơn hàng đã tồn tại");
      return;
    }
    setError("");
    onSave(form);
  };

  const title = initial
    ? (lang === "zh" ? "编辑订单" : lang === "en" ? "Edit Order" : "Chỉnh sửa đơn hàng")
    : (lang === "zh" ? "新增订单" : lang === "en" ? "Add Order" : "Thêm đơn hàng mới");

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
          <label className="mb-1 block text-xs text-mute">{lang === "zh" ? "订单编号" : lang === "en" ? "Order Code" : "Mã đơn hàng"}</label>
          <input className={inputCls} value={form.orderCode} onChange={(e) => set({ orderCode: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-mute">{t("mold", lang)}</label>
            <select className={inputCls} value={form.moldId || ""} onChange={(e) => set({ moldId: e.target.value || null })}>
              <option value="">{t("unassigned", lang)}</option>
              {molds.map((m) => (
                <option key={m.id} value={m.id}>{m.moldName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-mute">Size</label>
            <input className={inputCls} value={form.size} onChange={(e) => set({ size: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-mute">{t("filmRoll", lang)}</label>
          <input className={inputCls} value={form.filmRollName} onChange={(e) => set({ filmRollName: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
