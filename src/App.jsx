import { useCallback, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { AppCtx } from "./context/AppContext";
import { ROLES } from "./lib/constants";
import { createBlankDb } from "./lib/seed";
import { APPLE_FONT } from "./lib/styles";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { ChipHoverPopover } from "./components/schedule/EmployeeChip";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { ToastHost } from "./components/ui/Overlays";
import { DataPage } from "./pages/DataPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { MachinesPage } from "./pages/MachinesPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { useLocalDb } from "./sync/useLocalDb";

/* Root (rendered only after login): the database lives in useSheetsSync (optimistic UI + Google Sheets),
   this component adds role, toasts, confirm dialog and page switching. */
export default function App() {
  const { user, logout } = useAuth();
  const userProfile = typeof user === "object" && user ? user : { username: user || "Intco", role: ROLES.ADMIN };
  const [role, setRole] = useState(() => userProfile.role || ROLES.ADMIN);
  const [page, setPage] = useState("schedule");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // { title, message, confirmLabel, danger, onConfirm }

  const pushToast = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const username = userProfile.username || String(user || "");
  const { db, setDb, sync } = useLocalDb();

  // In-app confirmation dialog — used instead of window.confirm(), which sandboxed/embedded environments may block.
  const confirmAction = useCallback((message, onConfirm, opts) => {
    setConfirmState({ message, onConfirm, title: opts?.title, confirmLabel: opts?.confirmLabel, danger: opts?.danger });
  }, []);

  const ctx = { db, setDb, role, setRole, toasts, pushToast, dismissToast, confirmAction, sync, user, logout };

  let Page = SchedulePage;
  if (page === "machines") Page = MachinesPage;
  else if (page === "orders") Page = OrdersPage;
  else if (page === "employees") Page = EmployeesPage;
  else if (page === "reports") Page = ReportsPage;
  else if (page === "data") Page = DataPage;

  return (
    <AppCtx.Provider value={ctx}>
      <div title="pe-app" className="pe-app h-screen w-full overflow-hidden bg-[#F4F7FE]">
        <div className="flex h-full w-full">
          <Sidebar page={page} setPage={setPage} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header page={page} setPage={setPage} />
            <main className="flex-1 overflow-y-auto px-7 pb-7">
              <div key={page} className="v-page"><Page /></div>
            </main>
          </div>
        </div>
        <ToastHost />
        <ChipHoverPopover />
        <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
      </div>
    </AppCtx.Provider>
  );
}
