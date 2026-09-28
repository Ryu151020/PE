import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LANGUAGES, t } from "../../lib/i18n";
import { NAV_ITEMS } from "../../lib/nav";
import { btnSecondary } from "../../lib/styles";

export function Header({ page, setPage }) {
  const { db, role, user, logout, sync, lang = "vi", setLang, searchQuery = "", setSearchQuery } = useApp();
  const searchRef = useRef(null);
  const nav = NAV_ITEMS.find((n) => n.key === page) || NAV_ITEMS[0];

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

  const searchPlaceholder = useMemo(() => {
    if (page === "orders") return t("searchOrderPlaceholder", lang);
    if (page === "machines") return t("searchMoldPlaceholder", lang);
    if (page === "employees") return t("searchEmpPlaceholder", lang);
    if (page === "schedule") return lang === "zh" ? "搜索员工、机器、订单..." : lang === "en" ? "Search staff, machine, order..." : "Tìm nhân viên, máy, đơn hàng...";
    return t("search", lang);
  }, [page, lang]);

  return (
    <header className="relative z-30 flex items-center justify-between gap-x-4 gap-y-3 pt-5 px-6 pb-4 flex-wrap lg:flex-nowrap">
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

      <div className="min-w-0 shrink-0">
        <div className="text-sm font-bold text-[#707EAE]">
          {greeting}, {(user && (user.name || user.username)) || user || role}
        </div>
        <h1 className="text-[28px] lg:text-[32px] leading-[36px] lg:leading-[40px] font-bold text-[#2B3674] tracking-tight">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0 overflow-x-auto">
        {/* Language Switcher */}
        <div className="flex h-10 items-center bg-white p-1 rounded-xl border border-line shadow-sm shrink-0">
          {LANGUAGES.map((l) => {
            const isActive = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang && setLang(l.code)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="absolute right-3 text-mute hover:text-ink text-xs font-bold"
                onClick={() => setSearchQuery && setSearchQuery("")}
              >
                ✕
              </button>
            ) : (
              <span className="v-kbd">/</span>
            )}
          </label>
        </div>

        <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-bold shadow-sm shrink-0">
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

        <div className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm shadow-sm shrink-0">
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
