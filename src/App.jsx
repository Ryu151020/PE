import { useCallback, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppCtx } from "./context/AppContext";
import { ROLES } from "./lib/constants";
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

export default function App() {
  const { user, logout } = useAuth();
  const userProfile = typeof user === "object" && user ? user : { username: user || "Admin", role: ROLES.ADMIN };
  const [role, setRole] = useState(() => userProfile.role || ROLES.ADMIN);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Extract page key from pathname (e.g. /machines -> "machines", / -> "schedule")
  const path = location.pathname.replace(/^\//, "");
  const page = path === "" || path === "schedule" ? "schedule" : path;

  const setPage = useCallback(
    (newPage) => {
      if (newPage === "schedule") {
        navigate("/");
      } else {
        navigate(`/${newPage}`);
      }
    },
    [navigate]
  );

  const pushToast = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const { db, setDb, sync } = useLocalDb();

  const confirmAction = useCallback((message, onConfirm, opts) => {
    setConfirmState({ message, onConfirm, title: opts?.title, confirmLabel: opts?.confirmLabel, danger: opts?.danger });
  }, []);

  const [lang, setLangState] = useState(() => localStorage.getItem("pe_lang") || "vi");
  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    localStorage.setItem("pe_lang", newLang);
  }, []);

  const ctx = { db, setDb, role, setRole, toasts, pushToast, dismissToast, confirmAction, sync, user, logout, lang, setLang };

  return (
    <AppCtx.Provider value={ctx}>
      <div title="pe-app" className="pe-app h-screen w-full overflow-hidden bg-[#F4F7FE]">
        <div className="flex h-full w-full">
          <Sidebar page={page} setPage={setPage} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header page={page} setPage={setPage} />
            <main className="flex-1 overflow-y-auto px-7 pb-7">
              <div key={page} className="v-page">
                <Routes>
                  <Route path="/" element={<SchedulePage />} />
                  <Route path="/schedule" element={<Navigate to="/" replace />} />
                  <Route path="/machines" element={<MachinesPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/data" element={<DataPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
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
