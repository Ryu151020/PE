/* Safe localStorage wrapper (never throws — private mode / quota errors are ignored). */
export const storage = {
  get(key) {
    try { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
