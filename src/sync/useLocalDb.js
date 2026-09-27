import { useCallback, useEffect, useState } from "react";
import { createBlankDb, seedData } from "../lib/seed";
import { storage } from "./storage";

const LOCAL_DB_KEY = "pe_local_db_v2";
const LEGACY_CACHE_KEY = "pe_cache_v1";

export function useLocalDb() {
  const [db, setDbState] = useState(() => {
    const saved = storage.get(LOCAL_DB_KEY);
    if (saved && saved.machines && saved.machines.length > 0) return saved;
    const legacy = storage.get(LEGACY_CACHE_KEY);
    if (legacy && legacy.machines && legacy.machines.length > 0) {
      storage.set(LOCAL_DB_KEY, legacy);
      return legacy;
    }
    const initial = seedData();
    storage.set(LOCAL_DB_KEY, initial);
    return initial;
  });

  const setDb = useCallback((updater) => {
    setDbState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storage.set(LOCAL_DB_KEY, next);
      return next;
    });
  }, []);

  const sync = {
    status: "local",
    lastSyncedAt: Date.now(),
    phase: "ready",
    hasLocalCache: true,
    retryBoot: () => {},
    initialize: () => {},
  };

  return { db, setDb, sync };
}
