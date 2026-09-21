import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Undo2 } from "lucide-react";
import { OrderForm } from "../components/orders/OrderForm";
import { SearchBox } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { Segmented } from "../components/ui/Segmented";
import { useApp } from "../context/AppContext";
import { btnIcon, btnPrimary, btnSecondary, card, inputCls } from "../lib/styles";

export function OrdersPage() {
  const { db, setDb, pushToast, confirmAction } = useApp();
  const [tab, setTab] = useState("open");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState(null); // { rowId, colKey }
  const clipRef = useRef(null);
  const search = (list) => list.filter((o) => !query || o.orderCode.toLowerCase().includes(query.toLowerCase()));
  const openOrders = useMemo(() => search(db.orders.filter((o) => !o.completed)), [db.orders, query]);
  const doneOrders = useMemo(() => search(db.orders.filter((o) => o.completed)), [db.orders, query]);

  const updateOrder = (orderId, patch) => {
    setDb((p) => ({ ...p, orders: p.orders.map((o) => (o.id === orderId ? { ...o, ...patch } : o)) }));
  };
  const isSel = (rowId, colKey) => selected && selected.rowId === rowId && selected.colKey === colKey;
  const selCls = (rowId, colKey) => `${isSel(rowId, colKey) ? "ring-2 ring-inset ring-brand bg-brand-tint" : ""}`;
  const getCell = (rowId, colKey) => { const o = db.orders.find((x) => x.id === rowId); if (!o) return ""; if (colKey === "moldId") return o.moldId || ""; if (colKey === "completed") return o.completed; return o[colKey] || ""; };
  const setCell = (rowId, colKey, value) => {
    if (colKey === "moldId" && value && !db.molds.some((m) => m.id === value)) return;
    if (colKey === "completed") { updateOrder(rowId, { completed: !!value }); return; }
    updateOrder(rowId, { [colKey]: value });
  };
  useEffect(() => {
    const onKey = (e) => {
      if (!selected) return;
      const meta = e.ctrlKey || e.metaKey;
      const tag = (e.target && e.target.tagName) || "";
      const inField = ["INPUT", "SELECT", "TEXTAREA"].includes(tag);
      if (meta && (e.key === "c" || e.key === "C")) { clipRef.current = getCell(selected.rowId, selected.colKey); pushToast("Đã copy ô / 已复制", "info"); }
      else if (meta && (e.key === "v" || e.key === "V")) { if (clipRef.current !== null && clipRef.current !== undefined) { setCell(selected.rowId, selected.colKey, clipRef.current); pushToast("Đã dán ô / 已粘贴", "success"); } }
      else if (!inField && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); if (selected.colKey !== "completed") setCell(selected.rowId, selected.colKey, selected.colKey === "moldId" ? null : ""); pushToast("Đã xóa dữ liệu ô / 已清空", "info"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, db.orders]);
  const handleStatusChange = (order, completed) => {
    updateOrder(order.id, { completed });
    pushToast(completed ? `Đã chuyển ${order.orderCode} sang Đã hoàn thiện / 已移至已完成` : `Đã khôi phục ${order.orderCode} về đang sản xuất / 已恢复处理中`, "success");
  };
  const addOrder = (data) => {
    setDb((p) => ({ ...p, orders: [...p.orders, { id: data.orderCode, ...data }] }));
    pushToast("Đã thêm đơn hàng / 已新增", "success");
    setAddOpen(false);
  };
  const deleteOrder = (o) => confirmAction(`Xóa đơn hàng ${o.orderCode}? / 删除订单 ${o.orderCode}？`, () => { setDb((p) => ({ ...p, orders: p.orders.filter((x) => x.id !== o.id) })); pushToast("Đã xóa đơn hàng / 已删除", "info"); }, { danger: true, confirmLabel: "Xóa / 删除" });
  const list = tab === "open" ? openOrders : doneOrders;

  return (
    <div className="space-y-5">
      <PageHeader vi="Dữ liệu đơn hàng" zh="订单数据" actions={<>
        <SearchBox value={query} onChange={setQuery} placeholder="Tìm mã đơn... / 搜索订单..." />
        <button className={btnPrimary} onClick={() => setAddOpen(true)}><Plus size={14} /> Thêm đơn hàng / 新增</button>
      </>} />
      <Segmented value={tab} onChange={setTab} items={[{ key: "open", label: `Đang sản xuất / 生产中 (${db.orders.filter((o) => !o.completed).length})` }, { key: "done", label: `Đã hoàn thiện / 已完成 (${db.orders.filter((o) => o.completed).length})` }]} />
      <p className="text-xs text-body">Bấm trực tiếp vào từng ô để chỉnh sửa. Chọn ô rồi Ctrl+C / Ctrl+V để copy-dán, Delete/Backspace để xóa nhanh. Đổi Trạng thái sẽ tự động chuyển đơn hàng sang tab tương ứng. / 直接点击单元格编辑，选中后 Ctrl+C/V 复制粘贴，Delete/Backspace 快速清空，更改状态会自动切换分类</p>
      <div className={`${card} overflow-hidden bg-white`}><div className="overflow-x-auto"><table className="w-full table-fixed text-sm">
        <colgroup><col style={{ width: "15%" }} /><col style={{ width: "15%" }} /><col style={{ width: "10%" }} /><col style={{ width: "20%" }} /><col style={{ width: "30%" }} /><col style={{ width: "10%" }} /></colgroup>
        <thead className="pe-thead text-xs"><tr>
          <th className="px-3 py-2 text-left">Mã đơn hàng / 订单编号</th><th className="px-3 py-2 text-left">Khuôn / 模具</th><th className="px-3 py-2 text-left">Size</th><th className="px-3 py-2 text-left">Tên cuộn màng / 卷膜名称</th><th className="px-3 py-2 text-left">Trạng thái / 状态</th><th className="px-3 py-2 text-right">Thao tác / 操作</th>
        </tr></thead>
        <tbody>{list.map((o) => (
          <tr key={o.id} className="border-t border-line hover:bg-canvas">
            <td className={`px-3 py-2 ${selCls(o.id, "orderCode")}`} onClick={() => setSelected({ rowId: o.id, colKey: "orderCode" })}>
              <input className={`${inputCls} v-input--sm v-input--ghost font-bold`} value={o.orderCode} onChange={(e) => updateOrder(o.id, { orderCode: e.target.value })} />
            </td>
            <td className={`px-3 py-2 ${selCls(o.id, "moldId")}`} onClick={() => setSelected({ rowId: o.id, colKey: "moldId" })}>
              <select className={`${inputCls} v-input--sm`} value={o.moldId || ""} onChange={(e) => updateOrder(o.id, { moldId: e.target.value || null })}>
                <option value="">— Chưa gán —</option>
                {db.molds.map((m) => <option key={m.id} value={m.id}>{m.moldName}</option>)}
              </select>
            </td>
            <td className={`px-3 py-2 ${selCls(o.id, "size")}`} onClick={() => setSelected({ rowId: o.id, colKey: "size" })}><input className={`${inputCls} v-input--sm`} style={{ width: 70 }} value={o.size || ""} onChange={(e) => updateOrder(o.id, { size: e.target.value })} /></td>
            <td className={`px-3 py-2 ${selCls(o.id, "filmRollName")}`} onClick={() => setSelected({ rowId: o.id, colKey: "filmRollName" })}><input className={`${inputCls} v-input--sm`} value={o.filmRollName || ""} onChange={(e) => updateOrder(o.id, { filmRollName: e.target.value })} /></td>
            <td className={`px-3 py-2 ${selCls(o.id, "completed")}`} onClick={() => setSelected({ rowId: o.id, colKey: "completed" })}>
              <select
                className={`rad-14 border border-transparent px-2.5 py-1.5 text-xs font-bold cursor-pointer ${o.completed ? "border-ok-soft bg-ok-tint text-ok" : "border-brand-soft bg-brand-tint text-brand"}`}
                value={o.completed ? "done" : "open"}
                onChange={(e) => handleStatusChange(o, e.target.value === "done")}
              >
                <option value="open">Đang trong quá trình sản xuất / 生产中</option>
                <option value="done">Đã hoàn thiện / 已完成</option>
              </select>
            </td>
            <td className="px-3 py-2">
              <div className="flex justify-end gap-1">
                {o.completed && <button className={btnSecondary} onClick={() => handleStatusChange(o, false)}><Undo2 size={13} /> Khôi phục</button>}
                <button className={`${btnIcon} text-bad`} onClick={() => deleteOrder(o)}><Trash2 size={14} /></button>
              </div>
            </td>
          </tr>))}
          {list.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-mute">Không có đơn hàng phù hợp</td></tr>}
        </tbody>
      </table></div></div>
      {addOpen && <OrderForm open onClose={() => setAddOpen(false)} onSave={addOrder} initial={null} molds={db.molds} existingCodes={db.orders.map((o) => o.orderCode)} />}
    </div>
  );
}
