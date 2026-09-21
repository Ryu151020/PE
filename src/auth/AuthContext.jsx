import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiLogin, isConfigured } from "../sync/gasClient";
import { storage } from "../sync/storage";

const AUTH_KEY = "pe_auth_v1";
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  // restored synchronously from localStorage → a reload never flashes the login screen
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

    if (!isConfigured()) {
      return {
        ok: false,
        error: "Chưa cấu hình Google Sheets. Vui lòng bấm Cài đặt kết nối ở góc trên để liên kết / 请先配置 Google Sheets 连接",
      };
    }

    try {
      const res = await apiLogin(u, p);
      if (res && res.ok && res.user) {
        const profile = res.user;
        storage.set(AUTH_KEY, { user: profile, at: Date.now() });
        setUser(profile);
        return { ok: true, user: profile };
      }
      return { ok: false, error: (res && res.error) || "Sai tài khoản hoặc mật khẩu / 账号或密码错误" };
    } catch (err) {
      return { ok: false, error: err.message || "Không thể kết nối đến Google Sheets / 无法连接到 Google Sheets" };
    }
  }, []);

  const logout = useCallback(() => { storage.remove(AUTH_KEY); setUser(null); }, []);
  const value = useMemo(() => ({ user, isAuthed: !!user, login, logout }), [user, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
