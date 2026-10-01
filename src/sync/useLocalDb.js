import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteFromSupabase,
  employeeToDb,
  fetchFullDatabase,
  isSupabaseConfigured,
  machineToDb,
  moldToDb,
  orderToDb,
  scheduleToDb,
  syncTableToSupabase,
} from "../lib/supabase";
import { createBlankDb } from "../lib/seed";
import { storage } from "./storage";

const LOCAL_DB_KEY = "pe_local_db_v2";
const DELETED_ORDERS_KEY = "pe_deleted_order_ids";
const DELETED_EMPLOYEES_KEY = "pe_deleted_employee_ids";
const DELETED_MOLDS_KEY = "pe_deleted_mold_ids";

const cleanOrder = (o) => {
  if (!o || !o.orderCode) return o;
  let code = String(o.orderCode).trim();
  if (code.includes("##")) code = code.split("##")[0];
  if (code.includes("__")) code = code.split("__")[0];
  const match = code.match(/^(.*?)\s*\((.*?)\)$/);
  if (match && (!o.size || match[2].toLowerCase() === String(o.size).toLowerCase())) {
    code = match[1].trim();
  }
  return { ...o, orderCode: code };
};

export function useLocalDb() {
  const [db, setDbState] = useState(() => {
    const saved = storage.get(LOCAL_DB_KEY);
    if (saved && saved.machines && saved.machines.length > 0) {
      if (saved.orders) saved.orders = saved.orders.map(cleanOrder);
      return saved;
    }
    const initial = createBlankDb();
    storage.set(LOCAL_DB_KEY, initial);
    return initial;
  });

  const [syncStatus, setSyncStatus] = useState(() =>
    isSupabaseConfigured ? "connecting" : "local"
  );
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const prevDbRef = useRef(db);

  // Fetch full data from Supabase on mount if configured
  const reloadFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSyncStatus("local");
      return;
    }

    try {
      setSyncStatus("syncing");
      const remoteData = await fetchFullDatabase();
      if (remoteData) {
        const localCached = storage.get(LOCAL_DB_KEY);

        // 1. Intelligently merge schedules so locally saved/cached schedules are never wiped out
        const mergedSchedules = { ...(remoteData.schedules || {}) };
        if (localCached?.schedules) {
          Object.entries(localCached.schedules).forEach(([d, locSched]) => {
            if (!locSched) return;
            const remSched = remoteData.schedules?.[d];
            if (!remSched) {
              mergedSchedules[d] = locSched;
            } else if (locSched.updatedAt && remSched.updatedAt) {
              if (new Date(locSched.updatedAt) > new Date(remSched.updatedAt)) {
                mergedSchedules[d] = locSched;
              }
            }
          });
        }

        // 2. Orders merge: Remote + Local (excluding deleted items in tombstone)
        const deletedOrderIds = new Set(storage.get(DELETED_ORDERS_KEY) || []);
        const remoteOrderMap = new Map();
        (remoteData.orders || []).forEach((o) => {
          if (deletedOrderIds.has(o.id)) {
            deleteFromSupabase("orders", o.id);
          } else {
            remoteOrderMap.set(o.id, cleanOrder(o));
          }
        });

        const pendingOrders = [];
        if (localCached?.orders) {
          localCached.orders.forEach((loc) => {
            if (deletedOrderIds.has(loc.id)) return;
            if (!remoteOrderMap.has(loc.id)) {
              const cleaned = cleanOrder(loc);
              remoteOrderMap.set(loc.id, cleaned);
              pendingOrders.push(cleaned);
            }
          });
        }
        const mergedOrders = Array.from(remoteOrderMap.values()).map(cleanOrder);

        // 3. Employees merge
        const deletedEmpIds = new Set(storage.get(DELETED_EMPLOYEES_KEY) || []);
        const remoteEmpMap = new Map();
        (remoteData.employees || []).forEach((e) => {
          if (deletedEmpIds.has(e.id)) {
            deleteFromSupabase("employees", e.id);
          } else {
            remoteEmpMap.set(e.id, e);
          }
        });
        const pendingEmployees = [];
        if (localCached?.employees) {
          localCached.employees.forEach((loc) => {
            if (deletedEmpIds.has(loc.id)) return;
            if (!remoteEmpMap.has(loc.id)) {
              remoteEmpMap.set(loc.id, loc);
              pendingEmployees.push(loc);
            }
          });
        }
        const mergedEmployees = Array.from(remoteEmpMap.values());

        // 4. Molds merge
        const deletedMoldIds = new Set(storage.get(DELETED_MOLDS_KEY) || []);
        const remoteMoldMap = new Map();
        (remoteData.molds || []).forEach((m) => {
          if (deletedMoldIds.has(m.id)) {
            deleteFromSupabase("molds", m.id);
          } else {
            remoteMoldMap.set(m.id, m);
          }
        });
        const pendingMolds = [];
        if (localCached?.molds) {
          localCached.molds.forEach((loc) => {
            if (deletedMoldIds.has(loc.id)) return;
            if (!remoteMoldMap.has(loc.id)) {
              remoteMoldMap.set(loc.id, loc);
              pendingMolds.push(loc);
            }
          });
        }
        const mergedMolds = Array.from(remoteMoldMap.values());

        const mergedData = {
          ...remoteData,
          orders: mergedOrders,
          employees: mergedEmployees,
          molds: mergedMolds,
          machines: remoteData.machines || [],
          schedules: mergedSchedules,
        };

        setDbState(mergedData);
        prevDbRef.current = mergedData;
        storage.set(LOCAL_DB_KEY, mergedData);

        setSyncStatus("connected");
        setLastSyncedAt(Date.now());

        // Background sync: push any locally pending rows up to Supabase
        if (pendingOrders.length > 0) {
          syncTableToSupabase("orders", pendingOrders.map(orderToDb));
        }
        if (pendingEmployees.length > 0) {
          syncTableToSupabase("employees", pendingEmployees.map(employeeToDb));
        }
        if (pendingMolds.length > 0) {
          syncTableToSupabase("molds", pendingMolds.map(moldToDb));
        }

        // Background sync: push any locally cached schedules that are newer in local
        if (localCached?.schedules) {
          for (const [k, s] of Object.entries(localCached.schedules)) {
            if (!s) continue;
            const remSched = remoteData.schedules?.[k];
            if (!remSched || (s.updatedAt && (!remSched.updatedAt || new Date(s.updatedAt) > new Date(remSched.updatedAt)))) {
              const row = scheduleToDb(k, s);
              syncTableToSupabase("schedules", [row], "date");
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase initial fetch failed, using local cache:", err);
      setSyncStatus("offline");
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    reloadFromSupabase();

    const handleFocus = () => {
      reloadFromSupabase();
    };

    window.addEventListener("focus", handleFocus);
    const interval = setInterval(reloadFromSupabase, 60000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [reloadFromSupabase]);

  // Sync delta changes to Supabase
  const syncChangesToSupabase = useCallback(async (prev, next) => {
    if (!isSupabaseConfigured) return;

    try {
      setSyncStatus("syncing");

      // 1. Employees changed
      if (prev.employees !== next.employees) {
        if (next.employees.length > 0) {
          const rows = next.employees.map(employeeToDb);
          await syncTableToSupabase("employees", rows);
        }
        // Handle deletions
        const nextIds = new Set(next.employees.map((e) => e.id));
        const removed = prev.employees.filter((e) => !nextIds.has(e.id));
        for (const r of removed) {
          const delIds = storage.get(DELETED_EMPLOYEES_KEY) || [];
          if (!delIds.includes(r.id)) {
            storage.set(DELETED_EMPLOYEES_KEY, [...delIds, r.id]);
          }
          const res = await deleteFromSupabase("employees", r.id);
          if (res.ok) {
            const cur = (storage.get(DELETED_EMPLOYEES_KEY) || []).filter((id) => id !== r.id);
            storage.set(DELETED_EMPLOYEES_KEY, cur);
          }
        }
      }

      // 2. Molds changed
      if (prev.molds !== next.molds) {
        if (next.molds.length > 0) {
          const rows = next.molds.map(moldToDb);
          await syncTableToSupabase("molds", rows);
        }
        const nextIds = new Set(next.molds.map((m) => m.id));
        const removed = prev.molds.filter((m) => !nextIds.has(m.id));
        for (const r of removed) {
          const delIds = storage.get(DELETED_MOLDS_KEY) || [];
          if (!delIds.includes(r.id)) {
            storage.set(DELETED_MOLDS_KEY, [...delIds, r.id]);
          }
          const res = await deleteFromSupabase("molds", r.id);
          if (res.ok) {
            const cur = (storage.get(DELETED_MOLDS_KEY) || []).filter((id) => id !== r.id);
            storage.set(DELETED_MOLDS_KEY, cur);
          }
        }
      }

      // 3. Machines changed
      if (prev.machines !== next.machines) {
        if (next.machines.length > 0) {
          const rows = next.machines.map(machineToDb);
          await syncTableToSupabase("machines", rows);
        }
      }

      // 4. Orders changed
      if (prev.orders !== next.orders) {
        if (next.orders.length > 0) {
          const rows = next.orders.map(orderToDb);
          await syncTableToSupabase("orders", rows);
        }
        const nextIds = new Set(next.orders.map((o) => o.id));
        const removed = prev.orders.filter((o) => !nextIds.has(o.id));
        for (const r of removed) {
          const delIds = storage.get(DELETED_ORDERS_KEY) || [];
          if (!delIds.includes(r.id)) {
            storage.set(DELETED_ORDERS_KEY, [...delIds, r.id]);
          }
          const res = await deleteFromSupabase("orders", r.id);
          if (res.ok) {
            const cur = (storage.get(DELETED_ORDERS_KEY) || []).filter((id) => id !== r.id);
            storage.set(DELETED_ORDERS_KEY, cur);
          }
        }
      }

      // 5. Schedules changed
      if (prev.schedules !== next.schedules) {
        const nextKeys = Object.keys(next.schedules || {});
        for (const key of nextKeys) {
          if (next.schedules[key] !== prev.schedules?.[key]) {
            const row = scheduleToDb(key, next.schedules[key]);
            const res = await syncTableToSupabase("schedules", [row], "date");
            if (!res.ok) console.error("Failed to sync schedule:", res.error);
          }
        }
        // Handle schedule deletions
        const prevKeys = Object.keys(prev.schedules || {});
        const nextKeysSet = new Set(nextKeys);
        const removedKeys = prevKeys.filter((k) => !nextKeysSet.has(k) || !next.schedules[k]);
        for (const k of removedKeys) {
          await deleteFromSupabase("schedules", k);
        }
      }

      setSyncStatus("connected");
      setLastSyncedAt(Date.now());
    } catch (err) {
      console.error("Failed to sync delta to Supabase:", err);
      setSyncStatus("error");
    }
  }, []);

  const setDb = useCallback(
    (updater) => {
      setDbState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        storage.set(LOCAL_DB_KEY, next);
        const previous = prevDbRef.current || prev;
        prevDbRef.current = next;
        // Start sync immediately
        syncChangesToSupabase(previous, next);
        return next;
      });
    },
    [syncChangesToSupabase]
  );

  const sync = {
    status: syncStatus,
    lastSyncedAt,
    isSupabase: isSupabaseConfigured,
    reload: reloadFromSupabase,
    retryBoot: reloadFromSupabase,
  };

  return { db, setDb, sync };
}
