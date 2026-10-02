import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, Cpu, FileText, Package, PlayCircle, Trash2, Undo2 } from "lucide-react";
import { OrderForm } from "../components/orders/OrderForm";
import { AddActionButton } from "../components/ui/AddActionButton";
import { UndoRedoButtons } from "../components/ui/UndoRedoButtons";
import { StatCard } from "../components/ui/StatCard";
import { ExcelImportModal } from "../components/ui/ExcelImportModal";
import { SearchBox } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { Segmented } from "../components/ui/Segmented";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { SortableTh } from "../components/ui/SortableTh";
import { useApp } from "../context/AppContext";
import { downloadOrderTemplate, parseAndDedupOrders } from "../lib/excel";
import { isSupabaseConfigured, orderToDb, syncTableToSupabase, deleteFromSupabase } from "../lib/supabase";
import { storage } from "../sync/storage";
import { btnIcon, btnSecondary, card, inputCls } from "../lib/styles";
import { useTableHistory } from "../lib/useTableHistory";
import { getOrderStatusLabel, t } from "../lib/i18n";

export function OrdersPage() {
  const { db, setDb, deleteData, pushToast, confirmAction, lang = "vi", searchQuery = "" } = useApp();
  const query = searchQuery;
  const [tab, setTab] = useState(() => storage.get("pe_orders_tab") || "open");
  const [addOpen, setAddOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sortConfig, setSortConfig] = useState(() => storage.get("pe_orders_sort") || { key: null, direction: null });
  const [filters, setFilters] = useState(() => storage.get("pe_orders_filters") || {});
  const clipRef = useRef(null);

  useEffect(() => { storage.set("pe_orders_tab", tab); }, [tab]);
  useEffect(() => { storage.set("pe_orders_sort", sortConfig); }, [sortConfig]);
  useEffect(() => { storage.set("pe_orders_filters", filters); }, [filters]);

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

  const moldOptions = useMemo(
    () => (db.molds || []).map((m) => ({ value: m.id, label: m.moldName })),
    [db.molds]
  );

  const updateOrder = (orderId, patch) => {
    setOrdersWithHistory((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o))
    );
  };

  const isSel = (rowId, colKey) => selected && selected.rowId === rowId && selected.colKey === colKey;
  const selCls = (rowId, colKey) => `${isSel(rowId, colKey) ? "ring-2 ring-inset ring-brand bg-brand-tint" : ""}`;
  const tableRef = useRef(null);

  useEffect(() => {
    if (!selected) return;
    const handleOutside = (e) => {
      if (tableRef.current && !tableRef.current.contains(e.target)) {
        if (e.target && e.target.closest && (e.target.closest('[role="dialog"]') || e.target.closest('.fixed'))) return;
        setSelected(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [selected]);
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
    const code = String(data.orderCode || "").trim();
    const sz = String(data.size || "").trim();
    const uniqueId = `ORD-${code}${sz ? `-${sz}` : ""}-${Date.now()}`;
    const newOrder = { id: uniqueId, ...data, orderCode: code, size: sz };

    // Remove from tombstone if it was ever marked deleted
    const curDel = (storage.get("pe_deleted_order_ids") || []).filter((id) => id !== uniqueId);
    storage.set("pe_deleted_order_ids", curDel);

    setOrdersWithHistory((prev) => [...prev, newOrder]);
    pushToast("Đã thêm đơn hàng / 已新增", "success");
    setAddOpen(false);

    if (isSupabaseConfigured) {
      syncTableToSupabase("orders", [orderToDb(newOrder)]).then((res) => {
        if (!res.ok) {
          console.warn("Lỗi sync đơn hàng lên Supabase:", res.error);
        }
      });
    }
  };

  const deleteOrder = (o) => {
    confirmAction(
      `Cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng "${o.orderCode}" không? / 警告：确定要删除订单 "${o.orderCode}" 吗？`,
      async () => {
        try {
          // 1. Ghi nhận ngay vào tombstone để bất kỳ tab ngầm nào cũng không thể phục hồi
          const delIds = new Set(storage.get("pe_deleted_order_ids") || []);
          delIds.add(o.id);
          storage.set("pe_deleted_order_ids", Array.from(delIds));

          // 2. Xóa trên Cloud Supabase
          if (isSupabaseConfigured) {
            const res = await deleteFromSupabase("orders", o.id);
            if (!res.ok) {
              pushToast(`Lỗi xóa đơn hàng trên máy chủ: ${res.error || "Không thể xóa"}`, "error");
              return;
            }
          }

          // 3. Cập nhật state UI và DB
          setOrdersWithHistory((prev) => prev.filter((x) => x.id !== o.id));
          setDb((prev) => ({
            ...prev,
            orders: (prev.orders || []).filter((x) => x.id !== o.id),
            machines: (prev.machines || []).map((m) =>
              m.currentOrderId === o.id ? { ...m, currentOrderId: null } : m
            ),
          }));

          pushToast("Đã xóa vĩnh viễn đơn hàng / 已删除", "info");
        } catch (err) {
          console.error("Delete order error:", err);
          pushToast("Lỗi xóa đơn hàng: " + err.message, "error");
        }
      },
      {
        title: "Xác nhận xóa đơn hàng / 确认删除",
        danger: true,
        confirmLabel: "Xóa vĩnh viễn / 永久删除",
      }
    );
  };


  const handleExcelImport = async (newOrders) => {
    if (!newOrders || newOrders.length === 0) return;

    // Gỡ các ID mới khỏi tombstone nếu trước đó từng xóa
    const newIds = new Set(newOrders.map((o) => o.id));
    const curDel = (storage.get("pe_deleted_order_ids") || []).filter((id) => !newIds.has(id));
    storage.set("pe_deleted_order_ids", curDel);

    setOrdersWithHistory((prev) => [...prev, ...newOrders]);
    pushToast(`Đang đồng bộ ${newOrders.length} đơn hàng lên hệ thống...`, "info");

    if (isSupabaseConfigured) {
      const rows = newOrders.map(orderToDb);
      const res = await syncTableToSupabase("orders", rows);
      if (res.ok) {
        pushToast(`Đã thêm mới và lưu vĩnh viễn ${res.count || newOrders.length} đơn hàng từ Excel!`, "success");
      } else {
        console.error("Supabase import error:", res.error);
        pushToast(`Cảnh báo: Có lỗi khi lưu cloud: ${res.error || "kiểm tra kết nối"}`, "warn");
      }
    } else {
      pushToast(`Đã thêm mới ${newOrders.length} đơn hàng từ Excel / 已新增`, "success");
    }
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

  const totalOrders = orders.length;
  const openOrdersCount = useMemo(() => orders.filter((o) => !o.completed).length, [orders]);
  const doneOrdersCount = useMemo(() => orders.filter((o) => o.completed).length, [orders]);
  const assignedMoldOrdersCount = useMemo(() => orders.filter((o) => o.moldId).length, [orders]);

  return (
    <div className="space-y-4">
      {/* Venus Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Package}
          label={lang === "zh" ? "订单总数" : lang === "en" ? "Total Orders" : "Tổng đơn hàng"}
          value={totalOrders}
          iconBg="bg-[#F4F7FE]"
          iconColor="text-[#4318FF]"
        />
        <StatCard
          icon={PlayCircle}
          label={lang === "zh" ? "生产中" : lang === "en" ? "In Production" : "Đang sản xuất"}
          value={openOrdersCount}
          badgeText={totalOrders > 0 ? `${Math.round((openOrdersCount / totalOrders) * 100)}%` : "0%"}
          badgeType="info"
          iconBg="bg-[#F4F7FE]"
          iconColor="text-[#4318FF]"
        />
        <StatCard
          icon={CheckCheck}
          label={lang === "zh" ? "已完成" : lang === "en" ? "Completed" : "Đã hoàn thiện"}
          value={doneOrdersCount}
          badgeType="success"
          iconBg="bg-[#E6FAF5]"
          iconColor="text-[#05CD99]"
        />
        <StatCard
          icon={Cpu}
          label={lang === "zh" ? "已配模具" : lang === "en" ? "Mold Assigned" : "Đã ghép khuôn"}
          value={assignedMoldOrdersCount}
          badgeType="warning"
          iconBg="bg-[#FFF8E7]"
          iconColor="text-[#FFB547]"
        />
      </div>

      {/* Enclosed Card Container for Toolbar and Table */}
      <div className={`${card} overflow-hidden bg-white shadow-xs`}>
        {/* Action Toolbar */}
        <div className="p-5 pb-4 border-b border-line/60 flex items-center justify-between gap-3 flex-wrap bg-white">
          <Segmented
            value={tab}
            onChange={setTab}
            items={[
              { key: "open", label: `${lang === "zh" ? "生产中" : lang === "en" ? "In Production" : "Đang sản xuất"} (${openOrdersCount})` },
              { key: "done", label: `${lang === "zh" ? "已完成" : lang === "en" ? "Completed" : "Đã hoàn thiện"} (${doneOrdersCount})` },
            ]}
          />
          <div className="flex items-center gap-2.5 ml-auto">
            <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
            <AddActionButton
              labelVi="Thêm đơn hàng"
              labelZh="新增订单"
              labelEn="Add Order"
              onManualAdd={() => setAddOpen(true)}
              onExcelAdd={() => setExcelOpen(true)}
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-315px)]">
          <table ref={tableRef} className="w-full min-w-[1080px] table-fixed text-sm border-separate border-spacing-0">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[23%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="pe-thead text-sm sticky top-0 z-10 bg-[#F4F7FE] shadow-xs">
              <tr className="h-11">
                <th className="px-3 py-2.5 text-center align-middle font-bold text-[#1B2559] text-sm whitespace-nowrap bg-[#F4F7FE] border-l border-b border-r border-line">
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
                  center={true}
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
                  center={true}
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
                  center={true}
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
                  center={true}
                />
                <th className="px-3 py-2.5 text-center align-middle font-bold text-[#1B2559] text-sm whitespace-nowrap bg-[#F4F7FE] border-b border-r border-line">
                  {t("status", lang)}
                </th>
                <th className="px-3 py-2.5 text-center align-middle font-bold text-[#1B2559] text-sm whitespace-nowrap bg-[#F4F7FE] border-b border-r border-line">
                  {t("actions", lang)}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedList.map((o, idx) => (
                <tr key={o.id} className="hover:bg-canvas">
                  <td className="px-3 py-2 text-center align-middle text-black font-semibold text-sm border-l border-b border-r border-line">
                    {idx + 1}
                  </td>
                  <td className={`px-3 py-2 text-center align-middle border-b border-r border-line ${selCls(o.id, "orderCode")}`} onClick={() => setSelected({ rowId: o.id, colKey: "orderCode" })}>
                    <input
                      className={`${inputCls} v-input--sm v-input--ghost font-bold text-sm text-center`}
                      value={o.orderCode}
                      onChange={(e) => updateOrder(o.id, { orderCode: e.target.value })}
                    />
                  </td>
                  <td className={`px-2 py-1.5 text-center align-middle border-b border-r border-line ${selCls(o.id, "moldId")}`} onClick={() => setSelected({ rowId: o.id, colKey: "moldId" })}>
                    <div className="flex justify-center min-w-[110px] max-w-[160px] mx-auto">
                      <SearchableSelect
                        value={o.moldId || null}
                        onChange={(val) => updateOrder(o.id, { moldId: val || null })}
                        options={moldOptions}
                        isMold={true}
                        cellMode={false}
                        placeholder="—"
                        searchPlaceholder="Tìm khuôn... / 搜索..."
                      />
                    </div>
                  </td>
                  <td className={`px-3 py-2 text-center align-middle border-b border-r border-line ${selCls(o.id, "size")}`} onClick={() => setSelected({ rowId: o.id, colKey: "size" })}>
                    <input
                      className={`${inputCls} v-input--sm w-20 text-sm text-center mx-auto`}
                      value={o.size || ""}
                      onChange={(e) => updateOrder(o.id, { size: e.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 text-center align-middle border-b border-r border-line ${selCls(o.id, "filmRollName")}`} onClick={() => setSelected({ rowId: o.id, colKey: "filmRollName" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm text-center`}
                      value={o.filmRollName || ""}
                      onChange={(e) => updateOrder(o.id, { filmRollName: e.target.value })}
                    />
                  </td>
                  <td className={`px-3 py-2 text-center align-middle border-b border-r border-line ${selCls(o.id, "completed")}`} onClick={() => setSelected({ rowId: o.id, colKey: "completed" })}>
                    <div className="flex justify-center">
                      <select
                        className={`w-auto min-w-[120px] max-w-full truncate border border-transparent px-2.5 py-1.5 text-sm font-bold cursor-pointer rounded-xs text-center ${
                          o.completed ? "border-ok-soft bg-ok-tint text-ok" : "border-brand-soft bg-brand-tint text-brand"
                        }`}
                        value={o.completed ? "done" : "open"}
                        onChange={(e) => handleStatusChange(o, e.target.value === "done")}
                      >
                        <option value="open">{getOrderStatusLabel("open", lang)}</option>
                        <option value="done">{getOrderStatusLabel("done", lang)}</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center align-middle border-b border-r border-line">
                    <div className="flex items-center justify-center gap-1">
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
          existingOrders={orders}
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
