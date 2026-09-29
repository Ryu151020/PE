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

export function useLocalDb() {
  const [db, setDbState] = useState(() => {
    const saved = storage.get(LOCAL_DB_KEY);
    if (saved && saved.machines && saved.machines.length > 0) return saved;
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

        // 2. Intelligently merge orders so newly added/cached orders are never wiped out
        const deletedOrderIds = new Set(storage.get(DELETED_ORDERS_KEY) || []);
        const remoteOrders = (remoteData.orders || []).filter((o) => !deletedOrderIds.has(o.id));
        const remoteOrderIds = new Set(remoteOrders.map((o) => o.id));
        const mergedOrders = [...remoteOrders];
        const unsyncedOrders = [];

        if (localCached?.orders && Array.isArray(localCached.orders)) {
          localCached.orders.forEach((locOrd) => {
            if (!locOrd || !locOrd.id || deletedOrderIds.has(locOrd.id)) return;
            if (!remoteOrderIds.has(locOrd.id)) {
              mergedOrders.push(locOrd);
              unsyncedOrders.push(locOrd);
            }
          });
        }

        // 3. Intelligently merge employees
        const deletedEmpIds = new Set(storage.get(DELETED_EMPLOYEES_KEY) || []);
        const remoteEmployees = (remoteData.employees || []).filter((e) => !deletedEmpIds.has(e.id));
        const remoteEmpIds = new Set(remoteEmployees.map((e) => e.id));
        const mergedEmployees = [...remoteEmployees];
        const unsyncedEmployees = [];

        if (localCached?.employees && Array.isArray(localCached.employees)) {
          localCached.employees.forEach((locEmp) => {
            if (!locEmp || !locEmp.id || deletedEmpIds.has(locEmp.id)) return;
            if (!remoteEmpIds.has(locEmp.id)) {
              mergedEmployees.push(locEmp);
              unsyncedEmployees.push(locEmp);
            }
          });
        }

        // 4. Intelligently merge molds
        const deletedMoldIds = new Set(storage.get(DELETED_MOLDS_KEY) || []);
        const remoteMolds = (remoteData.molds || []).filter((m) => !deletedMoldIds.has(m.id));
        const remoteMoldIds = new Set(remoteMolds.map((m) => m.id));
        const mergedMolds = [...remoteMolds];
        const unsyncedMolds = [];

        if (localCached?.molds && Array.isArray(localCached.molds)) {
          localCached.molds.forEach((locMold) => {
            if (!locMold || !locMold.id || deletedMoldIds.has(locMold.id)) return;
            if (!remoteMoldIds.has(locMold.id)) {
              mergedMolds.push(locMold);
              unsyncedMolds.push(locMold);
            }
          });
        }

        const mergedData = {
          ...remoteData,
          orders: mergedOrders,
          employees: mergedEmployees,
          molds: mergedMolds,
          schedules: mergedSchedules,
        };

        setDbState(mergedData);
        prevDbRef.current = mergedData;
        storage.set(LOCAL_DB_KEY, mergedData);
        setSyncStatus("connected");
        setLastSyncedAt(Date.now());

        // Background sync: push any locally cached schedules that are missing or newer in Supabase
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

        // Background sync: push any locally cached orders missing in Supabase
        if (unsyncedOrders.length > 0) {
          const rows = unsyncedOrders.map(orderToDb);
          syncTableToSupabase("orders", rows);
        }

        // Background sync: push any locally cached employees missing in Supabase
        if (unsyncedEmployees.length > 0) {
          const rows = unsyncedEmployees.map(employeeToDb);
          syncTableToSupabase("employees", rows);
        }

        // Background sync: push any locally cached molds missing in Supabase
        if (unsyncedMolds.length > 0) {
          const rows = unsyncedMolds.map(moldToDb);
          syncTableToSupabase("molds", rows);
        }

        // Background cleanup: finalize deletion for any marked deleted items on Supabase
        for (const delId of deletedOrderIds) {
          deleteFromSupabase("orders", delId).then((res) => {
            if (res.ok) {
              const cur = (storage.get(DELETED_ORDERS_KEY) || []).filter((id) => id !== delId);
              storage.set(DELETED_ORDERS_KEY, cur);
            }
          });
        }
      }
    } catch (err) {
      console.warn("Supabase initial fetch failed, using local cache:", err);
      setSyncStatus("offline");
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      reloadFromSupabase();
    }
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
