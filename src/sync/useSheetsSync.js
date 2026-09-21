import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyOps, countChanges, dbFromChanges, diffDb, filterChanges, mergeChanges, opKeys } from "./diff";
import { apiChanges, apiSave, apiVersion, getConfig } from "./gasClient";
import { storage } from "./storage";

const CACHE_KEY = "pe_cache_v1";       // last known db (instant paint on reload / offline)
const PENDING_KEY = "pe_pending_v1";   // ops not yet delivered to Google Sheets (replayed after a reload)
const EMPTY_DB = () => ({ employees: [], molds: [], orders: [], machines: [], schedules: {} });

/**
 * Owns the app database with an OPTIMISTIC-UI sync layer:
 *   • setDb() updates React state immediately — the UI never waits for the network.
 *   • A debounced background flush sends only the entities that changed (diff by id) to Google Sheets.
 *   • A light poll asks for the sheet "version"; only when it moved are the changed rows downloaded and merged.
 *   • The last db + any undelivered ops are kept in localStorage, so a reload paints instantly and never loses edits.
 * Conflict rule: last write wins per record (a whole day for schedules); local unsent edits always beat incoming ones.
 *
 * phase:  booting | ready | needs-init (sheet is empty) | error (cannot load and nothing cached)
 * status: local | loading | saving | synced | error
 */
export function useSheetsSync({ seed, user, pushToast }) {
  const cfg = useMemo(() => getConfig(), []);
  const connected = !!cfg.url;
  const [db, setDbState] = useState(null);
  const [phase, setPhase] = useState("booting");
  const [status, setStatus] = useState(connected ? "loading" : "local");
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const dbRef = useRef(null);            // latest db (always ahead of / equal to state)
  const syncedRef = useRef(null);        // what the server is known to contain
  const versionRef = useRef(0);          // last server version we have merged
  const flushingRef = useRef(false);
  const pollingRef = useRef(false);
  const flushTimer = useRef(null);
  const retryCount = useRef(0);
  const emptyInfo = useRef(null);        // { version, local } when the sheet was empty at boot
  const userRef = useRef(user); userRef.current = user;
  const toastRef = useRef(pushToast); toastRef.current = pushToast;

  const commit = useCallback((next) => { dbRef.current = next; setDbState(next); }, []);

  /* the setter the rest of the app uses (same signature as React's setState) */
  const setDb = useCallback((updater) => {
    setDbState((prev) => { const next = typeof updater === "function" ? updater(prev) : updater; dbRef.current = next; return next; });
  }, []);

  const flush = useCallback(async () => {
    if (!syncedRef.current) return;
    if (flushingRef.current) return;
    const snapshot = dbRef.current;
    const ops = diffDb(syncedRef.current, snapshot);
    if (!ops.length) { storage.remove(PENDING_KEY); setStatus("synced"); return; }
    flushingRef.current = true; setStatus("saving");
    try {
      const res = await apiSave(ops, { user: userRef.current });
      syncedRef.current = snapshot;
      if (res.prevVersion === versionRef.current && !res.interleaved) versionRef.current = res.version;   // else: someone else wrote in between → the poll will fetch it
      retryCount.current = 0; setError(""); setLastSyncedAt(Date.now());
      const rest = diffDb(snapshot, dbRef.current);
      if (rest.length) { storage.set(PENDING_KEY, rest); flushTimer.current = setTimeout(flush, 200); }
      else { storage.remove(PENDING_KEY); setStatus("synced"); }
    } catch (e) {
      setError(e.message || String(e)); setStatus("error");
      const wait = Math.min(30000, 2000 * 2 ** retryCount.current++);
      flushTimer.current = setTimeout(flush, wait);
    } finally { flushingRef.current = false; }
  }, []);

  const scheduleFlush = useCallback((ms) => { clearTimeout(flushTimer.current); flushTimer.current = setTimeout(flush, ms); }, [flush]);

  /* ---------------------------------------------------------------- boot */
  const boot = useCallback(async () => {
    const cache = storage.get(CACHE_KEY);
    if (!connected) {
      commit((cache && cache.db) || seed());
      setPhase("ready"); setStatus("local");
      return;
    }
    if (cache && cache.db && !dbRef.current) { commit(cache.db); setPhase("ready"); }   // stale-while-revalidate: paint from cache first
    setStatus("loading"); setError("");
    try {
      const res = await apiChanges(0);
      if (res.empty) {
        emptyInfo.current = { version: res.version, local: (cache && cache.db) || null };
        setPhase("needs-init"); setStatus("synced");
        return;
      }
      let next = dbFromChanges(res.changes);
      syncedRef.current = next; versionRef.current = res.version;
      const pending = storage.get(PENDING_KEY);
      if (pending && pending.length) next = applyOps(next, pending);
      commit(next); setPhase("ready"); setLastSyncedAt(Date.now());
      if (pending && pending.length) { setStatus("saving"); scheduleFlush(50); } else setStatus("synced");
    } catch (e) {
      setError(e.message || String(e)); setStatus("error");
      if (!dbRef.current) setPhase("error");
    }
  }, [connected, seed, commit, scheduleFlush]);

  useEffect(() => { boot(); }, [boot]);

  /* ---------------------------------------------------------------- persist + push on every change */
  useEffect(() => {
    if (!db) return undefined;
    const t = setTimeout(() => storage.set(CACHE_KEY, { db, version: versionRef.current, at: Date.now() }), 400);
    return () => clearTimeout(t);
  }, [db]);

  useEffect(() => {
    if (!db || !connected || !syncedRef.current) return;
    const ops = diffDb(syncedRef.current, db);
    if (ops.length) { storage.set(PENDING_KEY, ops); setStatus((s) => (s === "error" ? s : "saving")); scheduleFlush(600); }
  }, [db, connected, scheduleFlush]);

  /* ---------------------------------------------------------------- pull other people's changes */
  const pollOnce = useCallback(async () => {
    if (pollingRef.current || flushingRef.current || !syncedRef.current) return;
    pollingRef.current = true;
    try {
      const v = await apiVersion();
      if (v.version === versionRef.current) { setStatus((s) => (s === "error" ? "synced" : s)); setError(""); return; }
      const res = await apiChanges(versionRef.current);
      const pending = diffDb(syncedRef.current, dbRef.current);
      const incoming = filterChanges(res.changes, opKeys(pending));   // local unsent edits win
      syncedRef.current = mergeChanges(syncedRef.current, res.changes);
      if (countChanges(incoming) > 0) {
        commit(mergeChanges(dbRef.current, incoming));
        if (toastRef.current) toastRef.current("Đã cập nhật dữ liệu từ người khác / 已同步他人的更改", "info");
      }
      versionRef.current = res.version; setLastSyncedAt(Date.now());
      setStatus(pending.length ? "saving" : "synced"); setError("");
    } catch (e) { setError(e.message || String(e)); setStatus("error"); } finally { pollingRef.current = false; }
  }, [commit]);

  useEffect(() => {
    if (!connected) return undefined;
    const tick = () => { if (!document.hidden) pollOnce(); };
    const id = setInterval(tick, cfg.pollMs);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [connected, cfg.pollMs, pollOnce]);

  /* warn before leaving with undelivered edits */
  useEffect(() => {
    if (!connected) return undefined;
    const onBeforeUnload = (e) => {
      if (syncedRef.current && dbRef.current && diffDb(syncedRef.current, dbRef.current).length) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [connected]);

  /* ---------------------------------------------------------------- actions */
  /** First run on an empty sheet: mode = "seed" | "empty" | "local" (push what is cached in this browser). */
  const initialize = useCallback((mode) => {
    const info = emptyInfo.current || { version: 0, local: null };
    const base = seed();
    const start = mode === "local" && info.local ? info.local : mode === "empty" ? { ...EMPTY_DB(), machines: base.machines.map((m) => ({ ...m, moldId: null, currentOrderId: null, status: "STOPPED" })) } : base;
    syncedRef.current = EMPTY_DB(); versionRef.current = info.version || 0;
    commit(start); setPhase("ready"); setStatus("saving");
  }, [seed, commit]);

  const syncNow = useCallback(async () => { clearTimeout(flushTimer.current); await flush(); await pollOnce(); }, [flush, pollOnce]);
  const retryBoot = useCallback(() => { boot(); }, [boot]);

  return { db, setDb, phase, status, error, lastSyncedAt, connected, syncNow, retryBoot, initialize, hasLocalCache: !!(emptyInfo.current && emptyInfo.current.local) };
}
