import { createContext, useContext } from "react";

/* ============================================================
   CONTEXT
   ============================================================ */
export const AppCtx = createContext(null);

export const useApp = () => useContext(AppCtx);
