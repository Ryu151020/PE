import { useCallback, useEffect, useRef, useState } from "react";
import {
  bulkDeleteFromSupabase,
  deleteAllFromSupabase,
  deleteFromSupabase,
  employeeFromDb,
  employeeToDb,
  fetchFullDatabase,
  isSupabaseConfigured,
  machineFromDb,
  machineToDb,
  moldFromDb,
  moldToDb,
  orderFromDb,
  orderToDb,
  scheduleFromDb,
  scheduleToDb,
  supabase,
  syncTableToSupabase,
} from "../lib/supabase";
import { createBlankDb } from "../lib/seed";
import { inRange } from "../lib/dates";
import { storage } from "./storage";

export const LOCAL_DB_KEY = "pe_local_db_v4";
export const DELETED_ORDERS_KEY = "pe_deleted_order_ids";
export const DELETED_EMPLOYEES_KEY = "pe_deleted_employee_ids";
export const DELETED_MOLDS_KEY = "pe_deleted_mold_ids";
export const DELETED_SCHEDULES_KEY = "pe_deleted_schedule_dates";

// Clean up legacy storage versions and stale schedule tombstones
try {
  ["pe_local_db", "pe_local_db_v2", "pe_local_db_v3", DELETED_SCHEDULES_KEY].forEach((k) => storage.remove(k));
} catch {}

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
  const isDeletingRef = useRef(false);
  const broadcastRef = useRef(null);

  // Fetch full data from Supabase on mount if configured
  const reloadFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || isDeletingRef.current) {
      if (!isSupabaseConfigured) setSyncStatus("local");
      return;
    }

    try {
      setSyncStatus("syncing");
      const remoteData = await fetchFullDatabase();
      if (remoteData && !isDeletingRef.current) {
        const deletedOrderIds = new Set(storage.get(DELETED_ORDERS_KEY) || []);
        const deletedEmpIds = new Set(storage.get(DELETED_EMPLOYEES_KEY) || []);
        const deletedMoldIds = new Set(storage.get(DELETED_MOLDS_KEY) || []);
        const deletedSchedDates = new Set(storage.get(DELETED_SCHEDULES_KEY) || []);

        // Filter out any ghost rows that were deleted locally
        const validOrders = (remoteData.orders || []).filter((o) => {
          if (deletedOrderIds.has(o.id)) {
            deleteFromSupabase("orders", o.id);
            return false;
          }
          return true;
        });

        const validEmployees = (remoteData.employees || []).filter((e) => {
          if (deletedEmpIds.has(e.id)) {
            deleteFromSupabase("employees", e.id);
            return false;
          }
          return true;
        });

        const validMolds = (remoteData.molds || []).filter((m) => {
          if (deletedMoldIds.has(m.id)) {
            deleteFromSupabase("molds", m.id);
            return false;
          }
          return true;
        });

        // Schedules from Supabase are authoritative and must never be deleted by tombstones
        const validSchedules = { ...(remoteData.schedules || {}) };

        const cleanedOrders = validOrders.map(cleanOrder);
        const freshData = {
          employees: validEmployees,
          molds: validMolds,
          orders: cleanedOrders,
          machines: remoteData.machines || [],
          schedules: validSchedules,
        };

        setDbState(freshData);
        prevDbRef.current = freshData;
        storage.set(LOCAL_DB_KEY, freshData);

        setSyncStatus("connected");
        setLastSyncedAt(Date.now());
      }
    } catch (err) {
      console.warn("Supabase fetch failed, keeping local state:", err);
      setSyncStatus("offline");
    }
  }, []);

  // Realtime Handlers for granular multi-user sync
  const handleRemoteOrder = useCallback((payload) => {
    if (isDeletingRef.current) return;
    const { eventType, new: newRow, old: oldRow } = payload;
    const deletedOrderIds = new Set(storage.get(DELETED_ORDERS_KEY) || []);

    if (eventType === "DELETE") {
      const deletedId = oldRow?.id;
      if (!deletedId) return;
      setDbState((prev) => {
        const nextOrders = (prev.orders || []).filter((o) => o.id !== deletedId);
        const nextMachines = (prev.machines || []).map((m) =>
          m.currentOrderId === deletedId ? { ...m, currentOrderId: null } : m
        );
        const nextState = { ...prev, orders: nextOrders, machines: nextMachines };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    } else if (eventType === "INSERT") {
      if (!newRow?.id || deletedOrderIds.has(newRow.id)) {
        if (newRow?.id && deletedOrderIds.has(newRow.id)) {
          deleteFromSupabase("orders", newRow.id);
        }
        return;
      }
      const incoming = cleanOrder(orderFromDb(newRow));
      setDbState((prev) => {
        if ((prev.orders || []).some((o) => o.id === incoming.id)) return prev;
        const nextOrders = [...(prev.orders || []), incoming];
        const nextState = { ...prev, orders: nextOrders };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    } else if (eventType === "UPDATE") {
      if (!newRow?.id || deletedOrderIds.has(newRow.id)) return;
      const incoming = cleanOrder(orderFromDb(newRow));
      setDbState((prev) => {
        const nextOrders = (prev.orders || []).map((o) => (o.id === incoming.id ? incoming : o));
        const nextState = { ...prev, orders: nextOrders };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    }
  }, []);

  const handleRemoteEmployee = useCallback((payload) => {
    if (isDeletingRef.current) return;
    const { eventType, new: newRow, old: oldRow } = payload;
    const deletedEmpIds = new Set(storage.get(DELETED_EMPLOYEES_KEY) || []);

    if (eventType === "DELETE") {
      const deletedId = oldRow?.id;
      if (!deletedId) return;
      setDbState((prev) => {
        const nextEmployees = (prev.employees || []).filter((e) => e.id !== deletedId);
        const nextState = { ...prev, employees: nextEmployees };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    } else if (eventType === "INSERT") {
      if (!newRow?.id || deletedEmpIds.has(newRow.id)) {
        if (newRow?.id && deletedEmpIds.has(newRow.id)) {
          deleteFromSupabase("employees", newRow.id);
        }
        return;
      }
      const incoming = employeeFromDb(newRow);
      setDbState((prev) => {
        if ((prev.employees || []).some((e) => e.id === incoming.id)) return prev;
        const nextEmployees = [...(prev.employees || []), incoming];
        const nextState = { ...prev, employees: nextEmployees };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    } else if (eventType === "UPDATE") {
      if (!newRow?.id || deletedEmpIds.has(newRow.id)) return;
      const incoming = employeeFromDb(newRow);
      setDbState((prev) => {
        const nextEmployees = (prev.employees || []).map((e) => (e.id === incoming.id ? incoming : e));
        const nextState = { ...prev, employees: nextEmployees };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    }
  }, []);

  const handleRemoteMold = useCallback((payload) => {
    if (isDeletingRef.current) return;
    const { eventType, new: newRow, old: oldRow } = payload;
    const deletedMoldIds = new Set(storage.get(DELETED_MOLDS_KEY) || []);

    if (eventType === "DELETE") {
      const deletedId = oldRow?.id;
      if (!deletedId) return;
      setDbState((prev) => {
        const nextMolds = (prev.molds || []).filter((m) => m.id !== deletedId);
        const nextMachines = (prev.machines || []).map((m) =>
          m.moldId === deletedId ? { ...m, moldId: null } : m
        );
        const nextState = { ...prev, molds: nextMolds, machines: nextMachines };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    } else if (eventType === "INSERT") {
      if (!newRow?.id || deletedMoldIds.has(newRow.id)) {
        if (newRow?.id && deletedMoldIds.has(newRow.id)) {
          deleteFromSupabase("molds", newRow.id);
        }
        return;
      }
      const incoming = moldFromDb(newRow);
      setDbState((prev) => {
        if ((prev.molds || []).some((m) => m.id === incoming.id)) return prev;
        const nextMolds = [...(prev.molds || []), incoming];
        const nextState = { ...prev, molds: nextMolds };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    } else if (eventType === "UPDATE") {
      if (!newRow?.id || deletedMoldIds.has(newRow.id)) return;
      const incoming = moldFromDb(newRow);
      setDbState((prev) => {
        const nextMolds = (prev.molds || []).map((m) => (m.id === incoming.id ? incoming : m));
        const nextState = { ...prev, molds: nextMolds };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    }
  }, []);

  const handleRemoteMachine = useCallback((payload) => {
    if (isDeletingRef.current) return;
    const { eventType, new: newRow } = payload;
    if (eventType === "UPDATE" || eventType === "INSERT") {
      if (!newRow?.id) return;
      const incoming = machineFromDb(newRow);
      setDbState((prev) => {
        const nextMachines = (prev.machines || []).map((m) => (m.id === incoming.id ? incoming : m));
        const nextState = { ...prev, machines: nextMachines };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    }
  }, []);

  const handleRemoteSchedule = useCallback((payload) => {
    if (isDeletingRef.current) return;
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === "DELETE") {
      const targetDate = oldRow?.date;
      if (!targetDate) return;
      setDbState((prev) => {
        const nextSchedules = { ...(prev.schedules || {}) };
        delete nextSchedules[targetDate];
        const nextState = { ...prev, schedules: nextSchedules };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    } else if (eventType === "INSERT" || eventType === "UPDATE") {
      if (!newRow?.date) return;
      const remoteSched = scheduleFromDb(newRow);
      const targetDate = remoteSched.date;

      setDbState((prev) => {
        const existing = prev.schedules?.[targetDate];
        if (!existing) {
          const nextState = {
            ...prev,
            schedules: { ...(prev.schedules || {}), [targetDate]: remoteSched },
          };
          prevDbRef.current = nextState;
          storage.set(LOCAL_DB_KEY, nextState);
          return nextState;
        }

        const parseTime = (t) => {
          if (!t) return 0;
          if (typeof t === "number") return t;
          const parsed = new Date(t).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };

        // Granular merge of entries per machine so simultaneous edits from colleagues don't wipe each other
        const mergedEntries = { ...(existing.entries || {}) };
        Object.entries(remoteSched.entries || {}).forEach(([mId, rEnt]) => {
          const lEnt = mergedEntries[mId];
          if (!lEnt) {
            mergedEntries[mId] = rEnt;
          } else {
            const lTime = parseTime(lEnt.updatedAt);
            const rTime = parseTime(rEnt.updatedAt);
            if (rTime >= lTime) {
              mergedEntries[mId] = rEnt;
            }
          }
        });

        const mergedSched = {
          ...existing,
          ...remoteSched,
          entries: mergedEntries,
        };

        const nextState = {
          ...prev,
          schedules: {
            ...(prev.schedules || {}),
            [targetDate]: mergedSched,
          },
        };
        prevDbRef.current = nextState;
        storage.set(LOCAL_DB_KEY, nextState);
        return nextState;
      });
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    reloadFromSupabase();

    const handleFocus = () => {
      reloadFromSupabase();
    };

    // Cross-tab broadcast channel on the same device
    let broadcast = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcast = new BroadcastChannel("pe_scheduler_bus");
        broadcastRef.current = broadcast;
        broadcast.onmessage = (e) => {
          if (e.data?.type === "LOCAL_DB_SYNC" && e.data?.data) {
            const data = e.data.data;
            setDbState(data);
            prevDbRef.current = data;
          }
        };
      }
    } catch {}

    const handleStorage = (e) => {
      if (e.key === LOCAL_DB_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDbState(parsed);
          prevDbRef.current = parsed;
        } catch {}
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(reloadFromSupabase, 60000);

    // Multi-user Realtime WebSocket channel setup
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel("pe_multiuser_room")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => handleRemoteOrder(payload)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "employees" },
          (payload) => handleRemoteEmployee(payload)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "molds" },
          (payload) => handleRemoteMold(payload)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "machines" },
          (payload) => handleRemoteMachine(payload)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "schedules" },
          (payload) => handleRemoteSchedule(payload)
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setSyncStatus("connected");
          }
        });
    }

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (broadcast) {
        broadcast.close();
        broadcastRef.current = null;
      }
    };
  }, [
    reloadFromSupabase,
    handleRemoteOrder,
    handleRemoteEmployee,
    handleRemoteMold,
    handleRemoteMachine,
    handleRemoteSchedule,
  ]);

  // Sync delta changes to Supabase
  const syncChangesToSupabase = useCallback(async (prev, next) => {
    if (!isSupabaseConfigured || isDeletingRef.current) return;

    try {
      setSyncStatus("syncing");

      // 1. Employees changed
      if (prev.employees !== next.employees) {
        const deletedEmpIds = new Set(storage.get(DELETED_EMPLOYEES_KEY) || []);
        const prevMap = new Map((prev.employees || []).map((e) => [e.id, e]));
        const changed = (next.employees || []).filter((e) => {
          if (deletedEmpIds.has(e.id)) return false;
          const p = prevMap.get(e.id);
          return p && JSON.stringify(p) !== JSON.stringify(e);
        });
        if (changed.length > 0) {
          await syncTableToSupabase("employees", changed.map(employeeToDb));
        }
        // Handle deletions
        const nextIds = new Set((next.employees || []).map((e) => e.id));
        const removed = (prev.employees || []).filter((e) => !nextIds.has(e.id));
        if (removed.length > 0) {
          const removedIds = removed.map((r) => r.id);
          const curDel = new Set(storage.get(DELETED_EMPLOYEES_KEY) || []);
          removedIds.forEach((id) => curDel.add(id));
          storage.set(DELETED_EMPLOYEES_KEY, Array.from(curDel));
          await bulkDeleteFromSupabase("employees", removedIds);
        }
      }

      // 2. Molds changed
      if (prev.molds !== next.molds) {
        const deletedMoldIds = new Set(storage.get(DELETED_MOLDS_KEY) || []);
        const prevMap = new Map((prev.molds || []).map((m) => [m.id, m]));
        const changed = (next.molds || []).filter((m) => {
          if (deletedMoldIds.has(m.id)) return false;
          const p = prevMap.get(m.id);
          return p && JSON.stringify(p) !== JSON.stringify(m);
        });
        if (changed.length > 0) {
          await syncTableToSupabase("molds", changed.map(moldToDb));
        }
        const nextIds = new Set((next.molds || []).map((m) => m.id));
        const removed = (prev.molds || []).filter((m) => !nextIds.has(m.id));
        if (removed.length > 0) {
          const removedIds = removed.map((r) => r.id);
          const curDel = new Set(storage.get(DELETED_MOLDS_KEY) || []);
          removedIds.forEach((id) => curDel.add(id));
          storage.set(DELETED_MOLDS_KEY, Array.from(curDel));
          await bulkDeleteFromSupabase("molds", removedIds);
        }
      }

      // 3. Machines changed
      if (prev.machines !== next.machines) {
        if (next.machines && next.machines.length > 0) {
          const rows = next.machines.map(machineToDb);
          await syncTableToSupabase("machines", rows);
        }
      }

      // 4. Orders changed
      if (prev.orders !== next.orders) {
        const deletedOrderIds = new Set(storage.get(DELETED_ORDERS_KEY) || []);
        const prevMap = new Map((prev.orders || []).map((o) => [o.id, o]));
        const changed = (next.orders || []).filter((o) => {
          if (deletedOrderIds.has(o.id)) return false;
          const p = prevMap.get(o.id);
          return p && JSON.stringify(p) !== JSON.stringify(o);
        });
        if (changed.length > 0) {
          await syncTableToSupabase("orders", changed.map(orderToDb));
        }
        const nextIds = new Set((next.orders || []).map((o) => o.id));
        const removed = (prev.orders || []).filter((o) => !nextIds.has(o.id));
        if (removed.length > 0) {
          const removedIds = removed.map((r) => r.id);
          const curDel = new Set(storage.get(DELETED_ORDERS_KEY) || []);
          removedIds.forEach((id) => curDel.add(id));
          storage.set(DELETED_ORDERS_KEY, Array.from(curDel));
          await bulkDeleteFromSupabase("orders", removedIds);
        }
      }

      // 5. Schedules changed
      if (prev.schedules !== next.schedules) {
        const nextKeys = Object.keys(next.schedules || {});
        for (const key of nextKeys) {
          if (next.schedules[key] && next.schedules[key] !== prev.schedules?.[key]) {
            const row = scheduleToDb(key, next.schedules[key]);
            const res = await syncTableToSupabase("schedules", [row], "date");
            if (!res.ok) console.error("Failed to sync schedule:", res.error);
          }
        }
        // Handle schedule deletions
        const prevKeys = Object.keys(prev.schedules || {});
        const nextKeysSet = new Set(nextKeys);
        const removedKeys = prevKeys.filter((k) => !nextKeysSet.has(k) || !next.schedules[k]);
        if (removedKeys.length > 0) {
          await bulkDeleteFromSupabase("schedules", removedKeys);
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
        prevDbRef.current = next;

        // Broadcast to other tabs on the same machine
        try {
          if (broadcastRef.current) {
            broadcastRef.current.postMessage({ type: "LOCAL_DB_SYNC", data: next });
          }
        } catch {}

        // Always sync local user changes to Supabase immediately
        syncChangesToSupabase(prev, next);
        return next;
      });
    },
    [syncChangesToSupabase]
  );

  const deleteData = useCallback(
    async ({ mode, range, includeLocked = true }) => {
      isDeletingRef.current = true;
      setSyncStatus("syncing");

      try {
        if (mode === "everything") {
          // 1. Clear Supabase tables
          if (isSupabaseConfigured) {
            await syncTableToSupabase(
              "machines",
              (db.machines || []).map((m) => machineToDb({ ...m, moldId: null, currentOrderId: null }))
            );
            const r1 = await deleteAllFromSupabase("schedules");
            const r2 = await deleteAllFromSupabase("orders");
            const r3 = await deleteAllFromSupabase("molds");
            const r4 = await deleteAllFromSupabase("employees");
            if (!r1.ok || !r2.ok || !r3.ok || !r4.ok) {
              const err = r1.error || r2.error || r3.error || r4.error;
              console.error("Supabase deleteAll failed:", err);
              throw new Error("Lỗi xóa dữ liệu trên máy chủ: " + err);
            }
          }

          // 2. Record deleted entity IDs into tombstones
          const oldOrderIds = (db.orders || []).map((o) => o.id);
          const oldEmpIds = (db.employees || []).map((e) => e.id);
          const oldMoldIds = (db.molds || []).map((m) => m.id);
          storage.set(DELETED_ORDERS_KEY, [...new Set([...(storage.get(DELETED_ORDERS_KEY) || []), ...oldOrderIds])]);
          storage.set(DELETED_EMPLOYEES_KEY, [...new Set([...(storage.get(DELETED_EMPLOYEES_KEY) || []), ...oldEmpIds])]);
          storage.set(DELETED_MOLDS_KEY, [...new Set([...(storage.get(DELETED_MOLDS_KEY) || []), ...oldMoldIds])]);

          // Clear legacy caches
          ["pe_local_db", "pe_local_db_v2", "pe_local_db_v3"].forEach((k) => storage.remove(k));

          // 3. Update local DB
          const blankDb = {
            ...db,
            employees: [],
            molds: [],
            orders: [],
            schedules: {},
            machines: (db.machines || []).map((m) => ({ ...m, moldId: null, currentOrderId: null })),
          };
          storage.set(LOCAL_DB_KEY, blankDb);
          setDbState(blankDb);
          prevDbRef.current = blankDb;
        } else if (mode === "allPlans") {
          // Delete ALL schedules
          if (isSupabaseConfigured) {
            const res = await deleteAllFromSupabase("schedules");
            if (!res.ok) throw new Error("Lỗi xóa kế hoạch trên máy chủ: " + res.error);
          }

          const nextDb = { ...db, schedules: {} };
          storage.set(LOCAL_DB_KEY, nextDb);
          setDbState(nextDb);
          prevDbRef.current = nextDb;
        } else if (mode === "orders") {
          // Delete ALL orders - Schedules remain intact as planned!
          if (isSupabaseConfigured) {
            const res = await deleteAllFromSupabase("orders");
            if (!res.ok) throw new Error("Lỗi xóa đơn hàng trên máy chủ: " + res.error);

            // Null out currentOrderId on machines
            const updatedMachines = (db.machines || []).map((m) => ({ ...m, currentOrderId: null }));
            await syncTableToSupabase("machines", updatedMachines.map(machineToDb));
          }

          // Retain deleted order IDs in tombstone so stale background tabs don't re-upload them
          const oldOrderIds = (db.orders || []).map((o) => o.id);
          const curDel = new Set(storage.get(DELETED_ORDERS_KEY) || []);
          oldOrderIds.forEach((id) => curDel.add(id));
          storage.set(DELETED_ORDERS_KEY, Array.from(curDel));

          // Purge legacy caches
          ["pe_local_db", "pe_local_db_v2", "pe_local_db_v3"].forEach((k) => storage.remove(k));

          const nextDb = {
            ...db,
            orders: [],
            machines: (db.machines || []).map((m) => ({ ...m, currentOrderId: null })),
          };
          storage.set(LOCAL_DB_KEY, nextDb);
          setDbState(nextDb);
          prevDbRef.current = nextDb;
        } else if (mode === "employees") {
          // Delete ALL employees
          if (isSupabaseConfigured) {
            const res = await deleteAllFromSupabase("employees");
            if (!res.ok) throw new Error("Lỗi xóa nhân sự trên máy chủ: " + res.error);
          }
          const oldEmpIds = (db.employees || []).map((e) => e.id);
          const curDel = new Set(storage.get(DELETED_EMPLOYEES_KEY) || []);
          oldEmpIds.forEach((id) => curDel.add(id));
          storage.set(DELETED_EMPLOYEES_KEY, Array.from(curDel));

          ["pe_local_db", "pe_local_db_v2", "pe_local_db_v3"].forEach((k) => storage.remove(k));

          const nextDb = { ...db, employees: [] };
          storage.set(LOCAL_DB_KEY, nextDb);
          setDbState(nextDb);
          prevDbRef.current = nextDb;
        } else if (mode === "molds") {
          // Delete ALL molds
          if (isSupabaseConfigured) {
            await syncTableToSupabase(
              "machines",
              (db.machines || []).map((m) => machineToDb({ ...m, moldId: null }))
            );
            const res = await deleteAllFromSupabase("molds");
            if (!res.ok) throw new Error("Lỗi xóa khuôn trên máy chủ: " + res.error);
          }
          const oldMoldIds = (db.molds || []).map((m) => m.id);
          const curDel = new Set(storage.get(DELETED_MOLDS_KEY) || []);
          oldMoldIds.forEach((id) => curDel.add(id));
          storage.set(DELETED_MOLDS_KEY, Array.from(curDel));

          ["pe_local_db", "pe_local_db_v2", "pe_local_db_v3"].forEach((k) => storage.remove(k));

          const nextDb = {
            ...db,
            molds: [],
            machines: (db.machines || []).map((m) => ({ ...m, moldId: null })),
          };
          storage.set(LOCAL_DB_KEY, nextDb);
          setDbState(nextDb);
          prevDbRef.current = nextDb;
        } else {
          // Mode "range"
          const targetDates = Object.entries(db.schedules || {})
            .filter(([d, s]) => {
              if (!s) return false;
              if (!includeLocked && s.status === "LOCKED") return false;
              if (range && !inRange(d, range.from, range.to)) return false;
              return true;
            })
            .map(([d]) => d);

          if (targetDates.length > 0) {
            if (isSupabaseConfigured) {
              const res = await bulkDeleteFromSupabase("schedules", targetDates);
              if (!res.ok) throw new Error("Lỗi xóa lịch trên máy chủ: " + res.error);
            }

            const targetSet = new Set(targetDates);
            const nextSchedules = {};
            Object.entries(db.schedules || {}).forEach(([d, s]) => {
              if (!targetSet.has(d)) nextSchedules[d] = s;
            });

            const nextDb = { ...db, schedules: nextSchedules };
            storage.set(LOCAL_DB_KEY, nextDb);
            setDbState(nextDb);
            prevDbRef.current = nextDb;
          }
        }

        setSyncStatus("connected");
        setLastSyncedAt(Date.now());
      } finally {
        setTimeout(() => {
          isDeletingRef.current = false;
        }, 3000);
      }
    },
    [db]
  );

  const sync = {
    status: syncStatus,
    lastSyncedAt,
    isSupabase: isSupabaseConfigured,
    reload: reloadFromSupabase,
    retryBoot: reloadFromSupabase,
  };

  return { db, setDb, sync, deleteData };
}
