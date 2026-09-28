import { useLayoutEffect, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";
import { NAV_ITEMS } from "../../lib/nav";
import { LOGO_FONT, btnSecondary } from "../../lib/styles";

export function Sidebar({ page, setPage, collapsed, setCollapsed }) {
  const { lang = "vi" } = useApp() || {};
  const itemRefs = useRef({});
  const [ind, setInd] = useState(null);
  const [hov, setHov] = useState({ top: 0, height: 0, on: false, snap: true });

  useLayoutEffect(() => {
    const measure = () => {
      const el = itemRefs.current[page];
      if (el) setInd({ top: el.offsetTop, height: el.offsetHeight });
    };
    measure();
    const tId = setTimeout(measure, 320);
    return () => clearTimeout(tId);
  }, [page, collapsed]);

  const hoverTo = (key) => {
    const el = itemRefs.current[key];
    if (el) setHov((p) => ({ top: el.offsetTop, height: el.offsetHeight, on: true, snap: !p.on }));
  };
  const hoverOff = () => setHov((p) => ({ ...p, on: false, snap: false }));

  const workshopTitle = t("workshopTitle", lang);
  const workshopSubtitle = t("workshopSubtitle", lang);
  const versionLabel = t("versionLabel", lang);
  const collapseLabel = t("collapseMenu", lang);
  const expandLabel = t("expandMenu", lang);

  return (
    <aside className="v-sidebar hidden shrink-0 flex-col md:flex" style={{ width: collapsed ? 84 : 290 }}>
      <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : "px-8"}`} style={{ height: 104 }}>
        <div className="v-logo-mark">P</div>
        {!collapsed && (
          <div className="leading-tight" style={{ fontFamily: LOGO_FONT }}>
            <div className="font-bold text-brand" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>PE SCHEDULER</div>
            <div className="font-medium text-mute" style={{ fontSize: 11, letterSpacing: "0.04em" }}>{workshopSubtitle}</div>
          </div>
        )}
      </div>

      <div className="mx-6 h-px bg-canvas" />

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <nav className="v-nav" onMouseLeave={hoverOff}>
          {ind && <span className="v-nav-indicator" style={{ transform: `translateY(${ind.top}px)`, height: ind.height }} />}
          <span className={`v-nav-hover ${hov.on ? "is-on" : ""}`} style={{ transform: `translateY(${hov.top}px)`, height: hov.height, transition: hov.snap ? "opacity 150ms" : undefined }} />
          {NAV_ITEMS.map((item) => {
            const { key, icon: Icon } = item;
            const itemLabel = item[lang] || item.vi;
            return (
              <button
                key={key}
                ref={(el) => { itemRefs.current[key] = el; }}
                title={collapsed ? itemLabel : undefined}
                aria-current={page === key ? "page" : undefined}
                className={`v-nav-item ${collapsed ? "is-rail" : ""}`}
                onClick={() => setPage(key)}
                onMouseEnter={() => hoverTo(key)}
                onFocus={() => hoverTo(key)}
                onBlur={hoverOff}
              >
                <Icon size={20} />
                {!collapsed && (
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold">{itemLabel}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {!collapsed && (
        <div className="v-promo v-sheen">
          <div className="text-sm font-bold leading-snug">{workshopTitle}</div>
          <div className="mt-1 text-xs font-medium text-white/70">{versionLabel}</div>
        </div>
      )}

      <button
        className={`${btnSecondary} ${collapsed ? "" : "mx-5"} mb-5`}
        style={collapsed ? { width: 44, padding: 0, alignSelf: "center" } : undefined}
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? expandLabel : collapseLabel}
      >
        {collapsed ? (
          <PanelLeftOpen size={18} />
        ) : (
          <>
            <PanelLeftClose size={16} /> <span>{collapseLabel}</span>
          </>
        )}
      </button>
    </aside>
  );
}
