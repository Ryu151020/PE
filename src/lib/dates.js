/* ============================================================
   DATE HELPERS (no date-fns — plain JS)
   ============================================================ */
export const pad2 = (n) => String(n).padStart(2, "0");

export const toKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

export const addDaysKey = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };

export const toDisplay = (k) => { const [y, m, d] = k.split("-"); return `${d}/${m}/${y}`; };

export const monthsBetween = (a, b) => {
  const [ay, am, ad] = a.split("-").map(Number), [by, bm, bd] = b.split("-").map(Number);
  let m = (by - ay) * 12 + (bm - am); if (bd < ad) m--; return m;
};

export const TODAY_KEY = toKey(new Date());

 // always the person's real "today" — seed data anchors to this
export const formatSeniority = (join, end, lang = "vi") => {
  if (!join) return "—";
  const months = monthsBetween(join, end || TODAY_KEY);
  const y = Math.floor(months / 12), r = months % 12;
  if (y <= 0 && r <= 0) {
    return lang === "zh" ? "< 1个月" : lang === "en" ? "< 1 month" : "< 1 tháng";
  }
  if (lang === "zh") {
    return [y > 0 ? `${y}年` : null, r > 0 ? `${r}个月` : null].filter(Boolean).join("");
  }
  if (lang === "en") {
    return [
      y > 0 ? `${y} ${y > 1 ? "years" : "year"}` : null,
      r > 0 ? `${r} ${r > 1 ? "months" : "month"}` : null,
    ].filter(Boolean).join(" ");
  }
  return [y > 0 ? `${y} năm` : null, r > 0 ? `${r} tháng` : null].filter(Boolean).join(" ");
};

export const inRange = (k, from, to) => k >= from && k <= to;

export const startOfWeek = (key) => { const d = fromKey(key); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; d.setDate(d.getDate() + diff); return toKey(d); };

export const startOfMonth = (key) => { const [y, m] = key.split("-"); return `${y}-${m}-01`; };

export const startOfLastMonth = (key) => { const [y, m] = key.split("-").map(Number); return toKey(new Date(y, m - 2, 1)); };

export const endOfLastMonth = (key) => { const [y, m] = key.split("-").map(Number); return toKey(new Date(y, m - 1, 0)); };

export const startOfYear = (key) => `${key.split("-")[0]}-01-01`;

/* ============================================================
   REPORTS PAGE
   ============================================================ */
export function computePreset(key) {
  switch (key) {
    case "yesterday": return { from: addDaysKey(TODAY_KEY, -1), to: addDaysKey(TODAY_KEY, -1) };
    case "today": return { from: TODAY_KEY, to: TODAY_KEY };
    case "thisWeek": return { from: startOfWeek(TODAY_KEY), to: TODAY_KEY };
    case "lastWeek": { const lastWeekStart = addDaysKey(startOfWeek(TODAY_KEY), -7); return { from: lastWeekStart, to: addDaysKey(lastWeekStart, 6) }; }
    case "thisMonth": return { from: startOfMonth(TODAY_KEY), to: TODAY_KEY };
    case "lastMonth": return { from: startOfLastMonth(TODAY_KEY), to: endOfLastMonth(TODAY_KEY) };
    case "thisYear": return { from: startOfYear(TODAY_KEY), to: TODAY_KEY };
    default: return null;
  }
}
