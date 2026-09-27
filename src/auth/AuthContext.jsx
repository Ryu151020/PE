import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { VALID_PASSWORD, VALID_USERNAME } from "./credentials";
import { ROLES } from "../lib/constants";
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

    if (u.toLowerCase() === VALID_USERNAME.toLowerCase() && p === VALID_PASSWORD) {
      const profile = { username: u, name: u, role: ROLES.ADMIN };
      storage.set(AUTH_KEY, { user: profile, at: Date.now() });
      setUser(profile);
      return { ok: true, user: profile };
    }

    return { ok: false, error: "Sai tài khoản hoặc mật khẩu / 账号或密码错误" };
  }, []);

  const logout = useCallback(() => { storage.remove(AUTH_KEY); setUser(null); }, []);
  const value = useMemo(() => ({ user, isAuthed: !!user, login, logout }), [user, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
