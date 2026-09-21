import { useState } from "react";
import { AlertTriangle, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getConfig } from "../../sync/gasClient";

const VIEW = {
  local: { cls: "text-body", vi: "Chế độ cục bộ", zh: "本地模式", Icon: CloudOff },
  loading: { cls: "text-brand", vi: "Đang tải…", zh: "加载中", Icon: null, pulse: true },
  saving: { cls: "text-warn", vi: "Đang lưu…", zh: "保存中", Icon: null, pulse: true },
  synced: { cls: "text-ok", vi: "Đã đồng bộ", zh: "已同步", Icon: Cloud },
  error: { cls: "text-bad", vi: "Lỗi đồng bộ", zh: "同步失败", Icon: AlertTriangle },
};

const fmtTime = (t) => (t ? new Date(t).toLocaleTimeString("vi-VN") : "—");

/* Header chip that shows the Google Sheets sync state (optimistic UI: saving happens in the background). */
export function SyncStatus() {
  const { sync } = useApp();
  const [open, setOpen] = useState(false);
  const v = VIEW[sync.status] || VIEW.local;
  const host = (() => { try { return new URL(getConfig().url).host; } catch { return ""; } })();
  return (
    <div className="relative">
      <button className={`v-sync ${v.cls}`} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title="Trạng thái đồng bộ Google Sheets / Google Sheets 同步状态">
        {v.Icon ? <v.Icon size={16} /> : <span className={`v-sync-dot ${v.pulse ? "v-sync-dot--pulse" : ""}`} />}
        <span className="whitespace-nowrap">{v.vi} / {v.zh}</span>
      </button>
      {open && (<>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div className="v-menu" style={{ width: 300, padding: 14 }}>
          <div className="text-sm font-bold text-ink">Google Sheets</div>
          <div className="mt-1 text-xs font-medium text-mute">{sync.connected ? `Đã kết nối · ${host || "web app"}` : "Chưa kết nối — dữ liệu chỉ lưu trên trình duyệt này / 未连接，数据仅保存在本浏览器"}</div>
          {sync.connected && <div className="mt-2 text-xs font-medium text-body">Đồng bộ lần cuối / 上次同步: <span className="font-bold text-ink">{fmtTime(sync.lastSyncedAt)}</span></div>}
          {sync.status === "error" && <div className="mt-2 rad-10 bg-bad-tint px-3 py-2 text-xs font-bold text-bad">{sync.error}</div>}
          {sync.connected && (
            <div className="mt-3 flex flex-col gap-1">
              <button className="v-menu-item" onClick={() => { setOpen(false); sync.syncNow(); }}><span>Đồng bộ ngay / 立即同步</span><RefreshCw size={14} /></button>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}
