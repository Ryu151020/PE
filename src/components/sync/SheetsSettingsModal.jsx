import { useState } from "react";
import { btnDanger, btnPrimary, btnSecondary, inputCls } from "../../lib/styles";
import { apiPing, clearConfig, getConfig, saveConfig } from "../../sync/gasClient";
import { Modal } from "../ui/Overlays";

/* Paste the Apps Script Web App URL (…/exec) and optional token; test; save (page reloads to reconnect). */
export function SheetsSettingsModal({ open, onClose }) {
  const initial = getConfig();
  const [url, setUrl] = useState(initial.url);
  const [token, setToken] = useState(initial.token);
  const [result, setResult] = useState(null);   // { ok, text }
  const [busy, setBusy] = useState(false);

  const test = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await apiPing({ url: url.trim(), token: token.trim() });
      setResult({ ok: true, text: `Kết nối thành công · ${r.spreadsheet} · version ${r.version} / 连接成功` });
    } catch (e) { setResult({ ok: false, text: e.message || String(e) }); } finally { setBusy(false); }
  };
  const save = () => { saveConfig({ url: url.trim(), token: token.trim() }); window.location.reload(); };
  const disconnect = () => { clearConfig(); window.location.reload(); };

  return (
    <Modal
      open={open} onClose={onClose} wide title="Kết nối Google Sheets / 连接 Google Sheets"
      footer={<>
        {initial.url && <button className={btnDanger} onClick={disconnect}>Ngắt kết nối / 断开</button>}
        <button className={btnSecondary} onClick={onClose}>Đóng / 关闭</button>
        <button className={btnPrimary} onClick={save} disabled={!url.trim()}>Lưu & tải lại / 保存并重新加载</button>
      </>}
    >
      <p className="text-sm text-body">Dán <b>Web App URL</b> của Google Apps Script (kết thúc bằng <code>/exec</code>). Mọi người dùng chung URL này sẽ thấy cùng một dữ liệu. / 粘贴 Apps Script 网页应用链接，使用同一链接的人共享同一份数据。</p>
      <label className="mt-4 block text-xs font-bold text-ink">Web App URL</label>
      <input className={`${inputCls} mt-1`} placeholder="https://script.google.com/macros/s/AKfy…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />
      <label className="mt-3 block text-xs font-bold text-ink">Token (tuỳ chọn / 可选)</label>
      <input className={`${inputCls} mt-1`} placeholder="Giống hằng số API_TOKEN trong code.gs" value={token} onChange={(e) => setToken(e.target.value)} />
      <div className="mt-4 flex items-center gap-3">
        <button className={btnSecondary} onClick={test} disabled={busy || !url.trim()}>{busy ? <span className="v-spin v-spin--brand" /> : null} Kiểm tra kết nối / 测试连接</button>
        {result && <span className={`text-sm font-bold ${result.ok ? "text-ok" : "text-bad"}`}>{result.text}</span>}
      </div>
    </Modal>
  );
}
