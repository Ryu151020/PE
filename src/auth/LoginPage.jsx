import { useState } from "react";
import { BarChart3, CalendarClock, Cloud, Eye, EyeOff, Lock, User } from "lucide-react";
import { APPLE_FONT, LOGO_FONT } from "../lib/styles";
import { useAuth } from "./AuthContext";

const FEATURES = [
  { icon: CalendarClock, vi: "Sắp ca 41 máy × 2 ca", zh: "41台机器 × 2班次排班" },
  { icon: BarChart3, vi: "Báo cáo & tỉ lệ mở máy", zh: "报表与开机率" },
  { icon: Cloud, vi: "Lưu trữ dữ liệu an toàn", zh: "安全数据存储" },
];

/* Landing + login (Venus): gradient hero on the left, white login card on the right. */
export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);

  // NOTE: no <form> element — sandboxed iframes (e.g. Claude artifacts) block form submission, so submit never fires.
  const submit = async () => {
    if (busy || !username || !password) return;
    setBusy(true); setError("");
    const res = await login(username, password);
    if (!res.ok) { setError(res.error); setShake((n) => n + 1); setBusy(false); }
  };

  return (
    <div className="pe-app flex min-h-screen w-full" style={{ background: "#F4F7FE", fontFamily: APPLE_FONT }}>
      {/* ---------- hero ---------- */}
      <section className="v-login-hero hidden flex-1 lg:flex">
        <div className="v-login-blob v-login-blob--a" /><div className="v-login-blob v-login-blob--b" />
        <div className="relative z-10 flex h-full w-full flex-col justify-between" style={{ padding: "48px 56px" }}>
          <div className="flex items-center gap-3" style={{ fontFamily: LOGO_FONT }}>
            <div className="v-logo-mark" style={{ background: "#fff", color: "#4318FF" }}>P</div>
            <div className="leading-tight">
              <div className="text-white" style={{ fontSize: 22, fontWeight: 700 }}>PE SCHEDULER</div>
              <div className="text-white/70" style={{ fontSize: 11, letterSpacing: "0.08em" }}>手套车间生产排班系统</div>
            </div>
          </div>

          <div className="v-rise" style={{ "--i": 1 }}>
            <h1 className="text-white" style={{ fontSize: 46, lineHeight: "56px", fontWeight: 700 }}>
              Sắp ca sản xuất<br />nhanh, chính xác,<br />đồng bộ mọi nơi.
            </h1>
            <p className="mt-4 text-white/80" style={{ fontSize: 18, fontWeight: 500 }}>智能排班，数据实时同步</p>
            <div className="mt-8 flex flex-col gap-3">
              {FEATURES.map(({ icon: Icon, vi, zh }, i) => (
                <div key={vi} className="v-login-feature v-rise" style={{ "--i": 2 + i }}>
                  <span className="v-login-feature-icon"><Icon size={18} /></span>
                  <span className="flex flex-col leading-tight"><span className="font-bold">{vi}</span><span className="text-xs text-white/70">{zh}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* decorative KPI preview */}
          <div className="v-login-preview v-rise" style={{ "--i": 6 }}>
            <div className="flex items-center justify-between text-sm font-medium text-white/80"><span>Máy đang mở / 开机数量</span><span className="font-bold text-white">71%</span></div>
            <div className="mt-1 text-white" style={{ fontSize: 28, fontWeight: 700 }}>58 <span className="text-base font-medium text-white/70">/ 82</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: "71%" }} /></div>
          </div>
        </div>
      </section>

      {/* ---------- login card ---------- */}
      <section className="flex flex-1 items-center justify-center" style={{ padding: 24 }}>
        <div className="w-full" style={{ maxWidth: 440 }}>
          <div className="mb-6 flex items-center gap-3 lg:hidden" style={{ fontFamily: LOGO_FONT }}>
            <div className="v-logo-mark">P</div>
            <div className="font-bold text-brand" style={{ fontSize: 22 }}>PE SCHEDULER</div>
          </div>
          <div key={shake} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} className={`v-card v-rise ${shake ? "v-shake" : ""}`} style={{ padding: 40, "--i": 1 }}>
            <h2 style={{ fontSize: 32, lineHeight: "40px", fontWeight: 700, color: "#2B3674" }}>Đăng nhập</h2>
            <p className="mt-1 text-sm font-medium text-mute">登录以进入管理系统 · Vui lòng đăng nhập để tiếp tục</p>

            <label className="mt-7 block text-sm font-bold text-ink" htmlFor="pe-user">Tài khoản / 账号</label>
            <div className="v-field mt-2">
              <User size={18} />
              <input id="pe-user" autoFocus autoComplete="username" placeholder="Nhập tài khoản" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <label className="mt-5 block text-sm font-bold text-ink" htmlFor="pe-pass">Mật khẩu / 密码</label>
            <div className="v-field mt-2">
              <Lock size={18} />
              <input id="pe-pass" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="v-field-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>

            <div className="mt-4" style={{ minHeight: 44 }}>
              {error && <div role="alert" className="v-rise rad-12 bg-bad-tint px-4 py-3 text-sm font-bold text-bad">{error}</div>}
            </div>

            <button type="button" onClick={submit} className="v-btn v-btn--primary mt-2 w-full" style={{ height: 50, fontSize: 16, fontWeight: 700 }} disabled={busy || !username || !password}>
              {busy ? <span className="v-spin" aria-hidden="true" /> : null}
              {busy ? "Đang đăng nhập… / 登录中…" : "Đăng nhập / 登录"}
            </button>
            <p className="mt-5 text-center text-xs font-medium text-mute">Trạng thái đăng nhập được lưu trên trình duyệt này · 登录状态保存在本浏览器</p>
          </div>
          <p className="mt-6 text-center text-xs font-medium text-mute">© Intco · PE Scheduler</p>
        </div>
      </section>
    </div>
  );
}
