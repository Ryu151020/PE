import { useEffect, useMemo, useRef, useState } from "react";
import { Redo2, Trash2, Undo2 } from "lucide-react";
import { OrderForm } from "../components/orders/OrderForm";
import { AddActionButton } from "../components/ui/AddActionButton";
import { ExcelImportModal } from "../components/ui/ExcelImportModal";
import { SearchBox } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { Segmented } from "../components/ui/Segmented";
import { SortableTh } from "../components/ui/SortableTh";
import { useApp } from "../context/AppContext";
import { downloadOrderTemplate, parseAndDedupOrders } from "../lib/excel";
import { btnIcon, btnSecondary, card, inputCls } from "../lib/styles";
import { useTableHistory } from "../lib/useTableHistory";
import { getOrderStatusLabel, t } from "../lib/i18n";

export function OrdersPage() {
  const { db, setDb, pushToast, confirmAction, lang = "vi", searchQuery = "" } = useApp();
  const query = searchQuery;
  const [tab, setTab] = useState("open");
  const [addOpen, setAddOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({});
  const clipRef = useRef(null);

  const {
    data: orders,
    updateData: setOrdersWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTableHistory(db.orders, (nextOrders) => {
    setDb((p) => ({ ...p, orders: nextOrders }));
  });

  const handleSort = (key, forcedDirection) => {
    setSortConfig((prev) => {
      if (forcedDirection) return { key, direction: forcedDirection };
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  };

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const moldsById = useMemo(() => {
    const map = {};
    (db.molds || []).forEach((m) => {
      map[m.id] = m.moldName;
    });
    return map;
  }, [db.molds]);

  const updateOrder = (orderId, patch) => {
    setOrdersWithHistory((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o))
    );
  };

  const isSel = (rowId, colKey) => selected && selected.rowId === rowId && selected.colKey === colKey;
  const selCls = (rowId, colKey) => `${isSel(rowId, colKey) ? "ring-2 ring-inset ring-brand bg-brand-tint" : ""}`;
  const getCell = (rowId, colKey) => {
    const o = orders.find((x) => x.id === rowId);
    if (!o) return "";
    if (colKey === "moldId") return o.moldId || "";
    if (colKey === "completed") return o.completed;
    return o[colKey] || "";
  };

  const setCell = (rowId, colKey, value) => {
    if (colKey === "moldId" && value && !db.molds.some((m) => m.id === value)) return;
    if (colKey === "completed") {
      updateOrder(rowId, { completed: !!value });
      return;
    }
    updateOrder(rowId, { [colKey]: value });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!selected) return;
      const meta = e.ctrlKey || e.metaKey;
      const tag = (e.target && e.target.tagName) || "";
      const inField = ["INPUT", "SELECT", "TEXTAREA"].includes(tag);
      if (meta && (e.key === "c" || e.key === "C")) {
        clipRef.current = getCell(selected.rowId, selected.colKey);
        pushToast("Đã copy ô / 已复制", "info");
      } else if (meta && (e.key === "v" || e.key === "V")) {
        if (clipRef.current !== null && clipRef.current !== undefined) {
          setCell(selected.rowId, selected.colKey, clipRef.current);
          pushToast("Đã dán ô / 已粘贴", "success");
        }
      } else if (!inField && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        if (selected.colKey !== "completed") {
          setCell(selected.rowId, selected.colKey, selected.colKey === "moldId" ? null : "");
        }
        pushToast("Đã xóa dữ liệu ô / 已清空", "info");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, orders, db.molds]);

  const handleStatusChange = (order, completed) => {
    updateOrder(order.id, { completed });
    pushToast(
      completed
        ? `${order.orderCode}: ${lang === "zh" ? "已移至已完成" : lang === "en" ? "Moved to Completed" : "Đã chuyển sang Đã hoàn thiện"}`
        : `${order.orderCode}: ${lang === "zh" ? "已恢复生产中" : lang === "en" ? "Restored to In Production" : "Đã khôi phục về đang sản xuất"}`,
      "success"
    );
  };

  const addOrder = (data) => {
    setOrdersWithHistory((prev) => [...prev, { id: data.orderCode, ...data }]);
    pushToast("Đã thêm đơn hàng / 已新增", "success");
    setAddOpen(false);
  };

  const deleteOrder = (o) => {
    confirmAction(
      `Cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng "${o.orderCode}" không? / 警告：确定要删除订单 "${o.orderCode}" 吗？`,
      () => {
        setOrdersWithHistory((prev) => prev.filter((x) => x.id !== o.id));
        pushToast("Đã xóa đơn hàng / 已删除", "info");
      },
      {
        title: "Xác nhận xóa đơn hàng / 确认删除",
        danger: true,
        confirmLabel: "Xóa vĩnh viễn / 永久删除",
      }
    );
  };

  const handleExcelImport = (newOrders) => {
    setOrdersWithHistory((prev) => [...prev, ...newOrders]);
    pushToast(`Đã thêm mới ${newOrders.length} đơn hàng từ Excel / 已新增`, "success");
  };

  const tabOrders = useMemo(
    () => orders.filter((o) => (tab === "open" ? !o.completed : o.completed)),
    [orders, tab]
  );

  const filteredAndSortedList = useMemo(() => {
    let result = tabOrders;

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderCode.toLowerCase().includes(q) ||
          (o.size || "").toLowerCase().includes(q) ||
          (o.filmRollName || "").toLowerCase().includes(q)
      );
    }

    Object.entries(filters).forEach(([colKey, filterVal]) => {
      if (!filterVal) return;
      if (Array.isArray(filterVal)) {
        const allowed = new Set(filterVal);
        result = result.filter((o) => {
          let raw = colKey === "moldId" ? (moldsById[o.moldId] || o.moldId || "") : o[colKey];
          raw = String(raw ?? "").trim();
          const val = raw === "" ? "(Chỗ trống)" : raw;
          return allowed.has(val);
        });
      } else if (typeof filterVal === "string" && filterVal.trim()) {
        const val = filterVal.toLowerCase().trim();
        result = result.filter((o) => {
          const raw = colKey === "moldId" ? (moldsById[o.moldId] || o.moldId || "") : o[colKey];
          return String(raw ?? "").toLowerCase().includes(val);
        });
      }
    });

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === "moldId") {
          valA = moldsById[a.moldId] || a.moldId || "";
          valB = moldsById[b.moldId] || b.moldId || "";
        }
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && String(valA).trim() !== "" && String(valB).trim() !== "") {
          return sortConfig.direction === "asc" ? numA - numB : numB - numA;
        }
        const cmp = String(valA).localeCompare(String(valB), "vi", { numeric: true, sensitivity: "base" });
        return sortConfig.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [tabOrders, query, filters, sortConfig, moldsById]);

  const moldFilterOptions = useMemo(
    () => db.molds.map((m) => ({ value: m.id, label: m.moldName })),
    [db.molds]
  );

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 bg-[#F4F7FE] pb-2 space-y-3">
        <PageHeader
          vi="Dữ liệu đơn hàng"
          zh="订单数据"
          actions={
            <>
              <div className="flex h-10 items-center gap-1 border border-line bg-white px-2.5 rounded-xl shadow-xs">
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-body hover:text-brand hover:bg-canvas transition-colors disabled:opacity-40 disabled:hover:text-inherit disabled:hover:bg-transparent"
                  disabled={!canUndo}
                  onClick={undo}
                  title={t("undo", lang)}
                >
                  <Undo2 size={16} />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-body hover:text-brand hover:bg-canvas transition-colors disabled:opacity-40 disabled:hover:text-inherit disabled:hover:bg-transparent"
                  disabled={!canRedo}
                  onClick={redo}
                  title={t("redo", lang)}
                >
                  <Redo2 size={16} />
                </button>
              </div>
              <AddActionButton
                labelVi="Thêm đơn hàng"
                labelZh="新增订单"
                labelEn="Add Order"
                onManualAdd={() => setAddOpen(true)}
                onExcelAdd={() => setExcelOpen(true)}
              />
            </>
          }
        />

        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { key: "open", label: `${lang === "zh" ? "生产中" : lang === "en" ? "In Production" : "Đang sản xuất"} (${orders.filter((o) => !o.completed).length})` },
            { key: "done", label: `${lang === "zh" ? "已完成" : lang === "en" ? "Completed" : "Đã hoàn thiện"} (${orders.filter((o) => o.completed).length})` },
          ]}
        />
      </div>

      <div className={`${card} overflow-hidden bg-white`}>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)]">
          <table className="w-full min-w-[1080px] table-fixed text-sm border-separate border-spacing-0">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[23%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="pe-thead text-sm sticky top-0 z-10 bg-[#F8FAFC] shadow-xs">
              <tr className="h-10">
                <th className="px-3 py-2 text-center align-middle font-semibold text-ink text-sm whitespace-nowrap bg-[#F8FAFC]">
                  {t("stt", lang)}
                </th>
                <SortableTh
                  labelVi="Mã đơn hàng"
                  labelZh="订单编号"
                  labelEn="Order Code"
                  colKey="orderCode"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.orderCode}
                  onFilterChange={handleFilterChange}
                  data={tabOrders}
                />
                <SortableTh
                  labelVi="Khuôn"
                  labelZh="模具"
                  labelEn="Mold"
                  colKey="moldId"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.moldId}
                  onFilterChange={handleFilterChange}
                  data={tabOrders}
                  getDisplayValue={(o) => moldsById[o.moldId] || o.moldId || ""}
                />
                <SortableTh
                  labelVi="Size"
                  labelZh="尺寸"
                  labelEn="Size"
                  colKey="size"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.size}
                  onFilterChange={handleFilterChange}
                  data={tabOrders}
                />
                <SortableTh
                  labelVi="Tên cuộn màng"
                  labelZh="卷膜名称"
                  labelEn="Film Roll"
                  colKey="filmRollName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.filmRollName}
                  onFilterChange={handleFilterChange}
                  data={tabOrders}
                />
                <th className="px-3 py-2 text-left align-middle font-semibold text-ink text-sm whitespace-nowrap bg-[#F8FAFC]">
                  {t("status", lang)}
                </th>
                <th className="px-3 py-2 text-right align-middle font-semibold text-ink text-sm whitespace-nowrap bg-[#F8FAFC]">
                  {t("actions", lang)}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedList.map((o, idx) => (
                <tr key={o.id} className="border-t border-line hover:bg-canvas">
                  <td className="px-3 py-2 text-mute text-sm font-medium">
                    {idx + 1}
                  </td>
                  <td className={`px-3 py-2 ${selCls(o.id, "orderCode")}`} onClick={() => setSelected({ rowId: o.id, colKey: "orderCode" })}>
                    <input
                      className={`${inputCls} v-input--sm v-input--ghost font-bold text-sm`}
                      value={o.orderCode}
                      onChange={(e) => updateOrder(o.id, { orderCode: e.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 ${selCls(o.id, "moldId")}`} onClick={() => setSelected({ rowId: o.id, colKey: "moldId" })}>
                    <select
                      className={`${inputCls} v-input--sm text-sm`}
                      value={o.moldId || ""}
                      onChange={(e) => updateOrder(o.id, { moldId: e.target.value || null })}
                    >
                      <option value="">— Chưa gán —</option>
                      {db.molds.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.moldName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`px-3 py-2 ${selCls(o.id, "size")}`} onClick={() => setSelected({ rowId: o.id, colKey: "size" })}>
                    <input
                      className={`${inputCls} v-input--sm w-20 text-sm`}
                      value={o.size || ""}
                      onChange={(e) => updateOrder(o.id, { size: e.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 ${selCls(o.id, "filmRollName")}`} onClick={() => setSelected({ rowId: o.id, colKey: "filmRollName" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm`}
                      value={o.filmRollName || ""}
                      onChange={(e) => updateOrder(o.id, { filmRollName: e.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 ${selCls(o.id, "completed")}`} onClick={() => setSelected({ rowId: o.id, colKey: "completed" })}>
                    <select
                      className={`w-full max-w-full truncate border border-transparent px-2.5 py-1.5 text-sm font-bold cursor-pointer rounded-xs ${
                        o.completed ? "border-ok-soft bg-ok-tint text-ok" : "border-brand-soft bg-brand-tint text-brand"
                      }`}
                      value={o.completed ? "done" : "open"}
                      onChange={(e) => handleStatusChange(o, e.target.value === "done")}
                    >
                      <option value="open">{getOrderStatusLabel("open", lang)}</option>
                      <option value="done">{getOrderStatusLabel("done", lang)}</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {o.completed && (
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => handleStatusChange(o, false)}
                        >
                          <Undo2 size={13} /> {lang === "zh" ? "恢复" : lang === "en" ? "Restore" : "Khôi phục"}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${btnIcon} text-bad rounded-xs`}
                        onClick={() => deleteOrder(o)}
                        title={lang === "zh" ? "删除订单" : lang === "en" ? "Delete order" : "Xóa đơn hàng"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-mute text-sm">
                    Không có đơn hàng phù hợp / 没有符合的订单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <OrderForm
          open
          onClose={() => setAddOpen(false)}
          onSave={addOrder}
          initial={null}
          molds={db.molds}
          existingCodes={orders.map((o) => o.orderCode)}
        />
      )}

      {excelOpen && (
        <ExcelImportModal
          open
          onClose={() => setExcelOpen(false)}
          titleVi="Nhập đơn hàng từ Excel"
          titleZh="从 Excel 导入订单"
          onDownloadTemplate={downloadOrderTemplate}
          onParseFile={(buf) => parseAndDedupOrders(buf, orders, db.molds)}
          onConfirmImport={handleExcelImport}
        />
      )}
    </div>
  );
}
