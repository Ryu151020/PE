import { CloudUpload, Database, RefreshCw } from "lucide-react";
import { btnPrimary, btnSecondary } from "../../lib/styles";

function Shell({ children }) {
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ padding: 24, background: "#F4F7FE" }}>
      <div className="v-card v-rise w-full text-center" style={{ maxWidth: 560, padding: 40 }}>{children}</div>
    </div>
  );
}

export function BootScreen() {
  return (
    <Shell>
      <div className="v-logo-mark mx-auto" style={{ width: 56, height: 56, fontSize: 26 }}>P</div>
      <div className="mt-5 flex items-center justify-center gap-3 text-lg font-bold text-ink"><span className="v-spin v-spin--brand" /> Đang tải dữ liệu từ Google Sheets… / 正在加载数据…</div>
    </Shell>
  );
}

/* Sheet has no data yet → let the user decide how to start. */
export function SheetsInitScreen({ hasLocal, onInit }) {
  const Option = ({ icon: Icon, vi, zh, desc, mode, primary }) => (
    <button className={`${primary ? btnPrimary : btnSecondary} w-full`} style={{ height: "auto", padding: "14px 20px", justifyContent: "flex-start", textAlign: "left", borderRadius: 20 }} onClick={() => onInit(mode)}>
      <Icon size={22} style={{ flex: "none" }} />
      <span className="flex flex-col leading-snug" style={{ whiteSpace: "normal" }}><span className="font-bold">{vi} / {zh}</span><span className="text-xs font-medium" style={{ opacity: 0.75 }}>{desc}</span></span>
    </button>
  );
  return (
    <Shell>
      <div className="v-stat-icon bg-brand-tint text-brand mx-auto"><Database size={26} /></div>
      <h2 className="mt-4" style={{ fontSize: 26, fontWeight: 700, color: "#2B3674" }}>Google Sheets đang trống</h2>
      <p className="mt-1 text-sm font-medium text-mute">表格目前是空的 · Chọn cách bắt đầu:</p>
      <div className="mt-6 flex flex-col gap-3">
        <Option primary icon={Database} vi="Bắt đầu với dữ liệu mới" zh="从空数据开始" desc="Tạo danh sách 41 máy tiêu chuẩn; sẵn sàng nhập khuôn, đơn hàng, nhân sự" mode="empty" />
        {hasLocal && <Option icon={CloudUpload} vi="Đẩy dữ liệu đang có trên trình duyệt này lên" zh="上传本浏览器已有数据" desc="Giữ những gì bạn đã nhập trước khi kết nối Google Sheets" mode="local" />}
      </div>
    </Shell>
  );
}

export function SheetsErrorScreen({ error, onRetry }) {
  return (
    <Shell>
      <div className="v-stat-icon bg-bad-tint text-bad mx-auto"><RefreshCw size={26} /></div>
      <h2 className="mt-4" style={{ fontSize: 26, fontWeight: 700, color: "#2B3674" }}>Không kết nối được Google Sheets</h2>
      <p className="mt-1 text-sm font-medium text-mute">无法连接到 Google Sheets</p>
      <div className="rad-12 bg-bad-tint mt-5 px-4 py-3 text-sm font-bold text-bad">{error || "Lỗi không xác định"}</div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className={btnPrimary} onClick={onRetry}><RefreshCw size={16} /> Thử lại / 重试</button>
      </div>
    </Shell>
  );
}
