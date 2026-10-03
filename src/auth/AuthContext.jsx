import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authenticateSupabaseUser, isSupabaseConfigured } from "../lib/supabase";
import { storage } from "../sync/storage";

const AUTH_KEY = "pe_auth_v1";
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = storage.get(AUTH_KEY);
    return s && s.user ? s.user : null;
  });

  const login = useCallback(async (username, password) => {
    const u = String(username).trim();
    const p = String(password);
    if (!u || !p) {
      return { ok: false, error: "Vui lòng nhập tài khoản và mật khẩu / 请输入账号和密码" };
    }

    if (!isSupabaseConfigured) {
      return {
        ok: false,
        error: "Chưa cấu hình Supabase! Vui lòng điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env",
      };
    }

    const res = await authenticateSupabaseUser(u, p);
    if (res.ok && res.user) {
      try {
        sessionStorage.removeItem("pe_active_schedule_date");
      } catch {}
      storage.set(AUTH_KEY, { user: res.user, at: Date.now() });
      setUser(res.user);
      return { ok: true, user: res.user };
    }

    return { ok: false, error: res.error || "Sai tài khoản hoặc mật khẩu / 账号或密码错误" };
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem("pe_active_schedule_date");
    } catch {}
    storage.remove(AUTH_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isAuthed: !!user, login, logout }), [user, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
