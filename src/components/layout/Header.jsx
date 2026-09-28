import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LANGUAGES, t } from "../../lib/i18n";
import { NAV_ITEMS } from "../../lib/nav";
import { btnSecondary } from "../../lib/styles";

export function Header({ page, setPage }) {
  const { db, role, user, logout, sync, lang = "vi", setLang } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);
  const nav = NAV_ITEMS.find((n) => n.key === page) || NAV_ITEMS[0];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const empType = t("position", lang, "Nhân sự");
    const moldType = t("mold", lang, "Khuôn");
    const ordType = t("order", lang, "Đơn hàng");
    const emp = db.employees
      .filter((e) => e.vietnameseName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q))
      .slice(0, 4)
      .map((e) => ({ type: empType, label: `${e.vietnameseName} (${e.employeeCode})`, page: "employees" }));
    const mold = db.molds
      .filter((m) => m.moldName.toLowerCase().includes(q))
      .slice(0, 4)
      .map((m) => ({ type: moldType, label: m.moldName, page: "machines" }));
    const ord = db.orders
      .filter((o) => o.orderCode.toLowerCase().includes(q))
      .slice(0, 4)
      .map((o) => ({ type: ordType, label: o.orderCode, page: "orders" }));
    return [...emp, ...mold, ...ord].slice(0, 10);
  }, [query, db, lang]);

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

  const pageTitle = nav[lang] || nav.vi;
  const greeting = t("greeting", lang);
  const roleLabel = t("role", lang);
  const logoutLabel = t("logout", lang);
  const searchPlaceholder = t("searchHeaderPlaceholder", lang);

  return (
    <header className="relative z-30 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-[30px] px-[30px] pb-6">
      <div className="flex w-full items-center gap-1.5 md:hidden">
        {NAV_ITEMS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`rounded-xs p-2 ${page === key ? "bg-brand text-white" : "bg-white text-mute"}`}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      <div className="min-w-0">
        <div className="text-sm font-bold text-[#707EAE]">
          {greeting}, {(user && (user.name || user.username)) || user || role}
        </div>
        <h1 className="text-[32px] leading-[40px] font-bold text-[#2B3674] tracking-tight">
          {pageTitle}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Language Switcher */}
        <div className="flex h-11 items-center bg-white p-1 rounded-xl border border-line shadow-sm">
          {LANGUAGES.map((l) => {
            const isActive = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang && setLang(l.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#4318FF] text-white shadow-sm"
                    : "text-body hover:text-ink hover:bg-canvas"
                }`}
                title={l.label}
              >
                <span>{l.flag}</span>
                <span>{l.short}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <label className="v-search">
            <Search size={14} />
            <input
              ref={searchRef}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            <span className="v-kbd">/</span>
          </label>
          {open && results.length > 0 && (
            <div className="v-menu v-menu--left w-full min-w-[280px]">
              {results.map((r, i) => (
                <button
                  key={i}
                  className="v-menu-item"
                  onMouseDown={() => {
                    setPage(r.page);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span className="font-bold text-ink">{r.label}</span>
                  <span className="text-sm">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex h-11 items-center gap-2 rounded-xs border border-line bg-white px-3.5 text-xs font-bold shadow-sm">
          {sync?.status === "connected" && (
            <span className="flex items-center gap-1.5 text-ok" title="Đã kết nối cơ sở dữ liệu Supabase">
              <span className="h-2 w-2 rounded-full bg-ok" /> Supabase
            </span>
          )}
          {sync?.status === "syncing" && (
            <span className="flex items-center gap-1.5 text-brand" title="Đang đồng bộ dữ liệu...">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse" /> Đang lưu…
            </span>
          )}
          {sync?.status === "local" && (
            <span className="flex items-center gap-1.5 text-mute" title="Đang lưu trên trình duyệt (Chưa cấu hình Supabase)">
              <span className="h-2 w-2 rounded-full bg-mute" /> Cục bộ
            </span>
          )}
          {(sync?.status === "offline" || sync?.status === "error") && (
            <button
              onClick={() => sync?.reload?.()}
              className="flex items-center gap-1.5 text-bad hover:underline"
              title="Lỗi kết nối Supabase - Bấm để thử lại"
            >
              <span className="h-2 w-2 rounded-full bg-bad animate-ping" /> Lỗi DB (Thử lại)
            </button>
          )}
        </div>

        <div className="flex h-11 items-center gap-1.5 rounded-xs border border-line bg-white px-3.5 text-sm shadow-sm">
          <span className="text-mute font-normal">{roleLabel}:</span>
          <span className="text-brand font-bold">{role}</span>
        </div>

        <div className="v-avatar-head" title={(user && (user.name || user.username)) || user}>
          {((user && (user.name || user.username)) || user || "U").charAt(0).toUpperCase()}
        </div>

        <button
          className={`${btnSecondary} v-btn--icon`}
          title={logoutLabel}
          aria-label={logoutLabel}
          onClick={logout}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
