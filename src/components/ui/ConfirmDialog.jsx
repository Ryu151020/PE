import { btnDanger, btnPrimary, btnSecondary } from "../../lib/styles";
import { Modal } from "./Overlays";

/* In-app confirmation dialog — used instead of window.confirm(), which sandboxed/embedded environments may silently block.
   state = { title, message, confirmLabel, danger, onConfirm } | null */
export function ConfirmDialog({ state, onClose }) {
  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={state?.title || "Xác nhận / 确认"}
      footer={<>
        <button className={btnSecondary} onClick={onClose}>Hủy / 取消</button>
        <button
          className={state?.danger ? btnDanger : btnPrimary}
          onClick={() => { const fn = state?.onConfirm; onClose(); if (fn) fn(); }}
        >{state?.confirmLabel || "Xác nhận / 确认"}</button>
      </>}
    >
      <p className="whitespace-pre-line text-sm text-body">{state?.message}</p>
    </Modal>
  );
}
