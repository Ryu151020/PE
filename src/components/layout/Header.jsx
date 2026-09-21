import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Search } from "lucide-react";
import { SyncStatus } from "../sync/SyncStatus";
import { useApp } from "../../context/AppContext";
import { NAV_ITEMS } from "../../lib/nav";
import { btnSecondary } from "../../lib/styles";

export function Header({ page, setPage }) {
  const { db, role, user, logout } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);
  const nav = NAV_ITEMS.find((n) => n.key === page) || NAV_ITEMS[0];
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const emp = db.employees.filter((e) => e.vietnameseName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q)).slice(0, 4).map((e) => ({ type: "Nhân sự", label: `${e.vietnameseName} (${e.employeeCode})`, page: "employees" }));
    const mold = db.molds.filter((m) => m.moldName.toLowerCase().includes(q)).slice(0, 4).map((m) => ({ type: "Khuôn", label: m.moldName, page: "machines" }));
    const ord = db.orders.filter((o) => o.orderCode.toLowerCase().includes(q)).slice(0, 4).map((o) => ({ type: "Đơn hàng", label: o.orderCode, page: "orders" }));
    return [...emp, ...mold, ...ord].slice(0, 10);
  }, [query, db]);
  // "/" focuses the search field from anywhere (unless the user is already typing)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
      e.preventDefault();
      if (searchRef.current) searchRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="relative z-30 flex flex-wrap items-end justify-between gap-x-6 gap-y-4" style={{ padding: "30px 30px 24px" }}>
      <div className="flex w-full items-center gap-1.5 md:hidden">
        {NAV_ITEMS.map(({ key, icon: Icon }) => (<button key={key} onClick={() => setPage(key)} className={`rounded-full p-2 ${page === key ? "bg-brand text-white" : "bg-white text-mute"}`}><Icon size={16} /></button>))}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold" style={{ color: "#707EAE" }}>
          Xin chào / 你好, {(user && (user.name || user.username)) || user || role}
        </div>
        <h1 style={{ fontSize: 34, lineHeight: "42px", fontWeight: 700, color: "#2B3674" }}>
          {nav.vi}<span className="ml-3 text-base font-medium text-mute">{nav.zh}</span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <label className="v-search">
            <Search size={14} />
            <input ref={searchRef} placeholder="Tìm nhân viên, khuôn, đơn hàng..." value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
            <span className="v-kbd">/</span>
          </label>
          {open && results.length > 0 && (
            <div className="v-menu v-menu--left" style={{ width: "100%", minWidth: 280 }}>
              {results.map((r, i) => (<button key={i} className="v-menu-item" onMouseDown={() => { setPage(r.page); setQuery(""); setOpen(false); }}><span className="font-bold text-ink">{r.label}</span><span className="text-xs">{r.type}</span></button>))}
            </div>
          )}
        </div>
        <SyncStatus />
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs shadow-sm" style={{ height: 44 }}>
          <span className="text-mute font-normal">Vai trò / 角色:</span>
          <span className="text-brand font-bold">{role}</span>
        </div>
        <div className="v-avatar-head" title={(user && (user.name || user.username)) || user}>
          {((user && (user.name || user.username)) || user || "U").charAt(0).toUpperCase()}
        </div>
        <button className={`${btnSecondary} v-btn--icon`} title="Đăng xuất / 退出登录" aria-label="Đăng xuất" onClick={logout}><LogOut size={16} /></button>
      </div>
    </header>
  );
}
