import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";

/* ============================================================
   COMMON UI
   ============================================================ */
export function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && onClose) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="v-scrim fixed inset-0 z-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" className={`v-modal flex w-full flex-col ${wide ? "max-w-2xl" : "max-w-lg"}`} style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between gap-4 px-7 pb-2 pt-6">
          <h3 className="text-lg font-bold leading-snug text-ink">{title}</h3>
          <button className="v-close" onClick={onClose} aria-label="Đóng / 关闭"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-7 pb-6 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, wide }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="v-scrim fixed inset-0 z-50 flex justify-end">
      <div role="dialog" aria-modal="true" className={`v-drawer flex h-full w-full flex-col ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="flex items-center justify-between gap-4 px-7 pb-2 pt-6">
          <h3 className="text-lg font-bold leading-snug text-ink">{title}</h3>
          <button className="v-close" onClick={onClose} aria-label="Đóng / 关闭"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  const ICONS = { success: <CheckCircle2 size={18} className="text-ok" />, warning: <AlertTriangle size={18} className="text-warn" />, error: <XCircle size={18} className="text-bad" />, info: <Info size={18} className="text-brand" /> };
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="v-toast flex items-center gap-3 px-4 py-3" style={{ minWidth: 280, maxWidth: 420 }}>
          {ICONS[t.type]}
          <span className="flex-1 text-sm font-medium text-ink">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-mute hover:text-ink" aria-label="Đóng / 关闭"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
