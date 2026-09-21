import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { MoldForm } from "../components/molds/MoldForm";
import { SearchBox } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../context/AppContext";
import { MOLD_STATUS_COLOR, MOLD_STATUS_DEFS } from "../lib/constants";
import { btnIcon, btnPrimary, card, inputCls } from "../lib/styles";

export function MachinesPage() {
  const { db, setDb, pushToast, confirmAction } = useApp();
  const [query, setQuery] = useState("");
  const [moldForm, setMoldForm] = useState(null);
  const [selected, setSelected] = useState(null); // { rowId, colKey }
  const clipRef = useRef(null);
  const filteredMolds = db.molds.filter((m) => !query || m.moldName.toLowerCase().includes(query.toLowerCase()));

  const saveMold = (form) => {
    if (moldForm && moldForm.id) { setDb((p) => ({ ...p, molds: p.molds.map((m) => (m.id === moldForm.id ? { ...m, ...form } : m)) })); pushToast("Đã cập nhật khuôn / 已更新", "success"); }
    else { setDb((p) => ({ ...p, molds: [...p.molds, { id: `MOLD-${Date.now()}`, ...form }] })); pushToast("Đã thêm khuôn mới / 已新增", "success"); }
    setMoldForm(null);
  };
  const deleteMold = (m) => confirmAction(`Xóa khuôn ${m.moldName}? / 删除模具 ${m.moldName}？`, () => { setDb((p) => ({ ...p, molds: p.molds.filter((x) => x.id !== m.id) })); pushToast("Đã xóa khuôn / 已删除", "info"); }, { danger: true, confirmLabel: "Xóa / 删除" });
  const updateMold = (id, patch) => setDb((p) => ({ ...p, molds: p.molds.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));

  const cellField = (colKey) => (colKey === "moldName" ? "moldName" : colKey === "status" ? "status" : "notes");
  const getCell = (rowId, colKey) => { const m = db.molds.find((x) => x.id === rowId); return m ? m[cellField(colKey)] : ""; };
  const setCell = (rowId, colKey, value) => {
    if (colKey === "status" && !MOLD_STATUS_DEFS.some((s) => s.vi === value)) return; // ignore invalid pasted status
    updateMold(rowId, { [cellField(colKey)]: value });
  };
  const isSel = (rowId, colKey) => selected && selected.rowId === rowId && selected.colKey === colKey;
  const selCls = (rowId, colKey) => `${isSel(rowId, colKey) ? "ring-2 ring-inset ring-brand bg-brand-tint" : ""}`;

  useEffect(() => {
    const onKey = (e) => {
      if (!selected) return;
      const meta = e.ctrlKey || e.metaKey;
      const tag = (e.target && e.target.tagName) || "";
      const inField = ["INPUT", "SELECT", "TEXTAREA"].includes(tag);
      if (meta && (e.key === "c" || e.key === "C")) { clipRef.current = getCell(selected.rowId, selected.colKey); pushToast("Đã copy ô / 已复制", "info"); }
      else if (meta && (e.key === "v" || e.key === "V")) { if (clipRef.current !== null) { setCell(selected.rowId, selected.colKey, clipRef.current); pushToast("Đã dán ô / 已粘贴", "success"); } }
      else if (!inField && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); setCell(selected.rowId, selected.colKey, ""); pushToast("Đã xóa dữ liệu ô / 已清空", "info"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, db.molds]);

  return (
    <div className="space-y-5">
      <PageHeader vi="Dữ liệu khuôn máy" zh="模具数据" actions={<>
        <SearchBox value={query} onChange={setQuery} placeholder="Tìm khuôn... / 搜索模具..." />
        <button className={btnPrimary} onClick={() => setMoldForm({})}><Plus size={14} /> Thêm khuôn / 新增</button>
      </>} />
      <p className="text-xs text-body">Bấm trực tiếp vào ô để sửa. Chọn ô rồi Ctrl+C / Ctrl+V để copy-dán, Delete/Backspace để xóa nhanh. / 直接点击单元格编辑，选中后 Ctrl+C/V 复制粘贴，Delete/Backspace 快速清空</p>
      <div className={`${card} overflow-hidden bg-white`}><div className="overflow-x-auto"><table className="w-full table-fixed text-sm">
        <colgroup><col style={{ width: "8%" }} /><col style={{ width: "24%" }} /><col style={{ width: "24%" }} /><col style={{ width: "24%" }} /><col style={{ width: "20%" }} /></colgroup>
        <thead className="pe-thead text-xs"><tr>
          <th className="px-3 py-2 text-left">STT / 序号</th><th className="px-3 py-2 text-left">Tên khuôn / 模具名称</th><th className="px-3 py-2 text-left">Trạng thái / 状态</th><th className="px-3 py-2 text-left">Ghi chú / 备注</th><th className="px-3 py-2 text-right">Thao tác / 操作</th>
        </tr></thead>
        <tbody>{filteredMolds.map((m, i) => (
          <tr key={m.id} className="border-t border-line hover:bg-canvas">
            <td className="px-3 py-2 text-mute">{i + 1}</td>
            <td className={`px-3 py-2 ${selCls(m.id, "moldName")}`} onClick={() => setSelected({ rowId: m.id, colKey: "moldName" })}>
              <input className={`${inputCls} v-input--sm v-input--ghost font-bold`} value={m.moldName} onChange={(e) => updateMold(m.id, { moldName: e.target.value })} />
            </td>
            <td className={`px-3 py-2 ${selCls(m.id, "status")}`} onClick={() => setSelected({ rowId: m.id, colKey: "status" })}>
              <select className={`rad-14 border border-transparent px-2.5 py-1.5 text-xs font-bold cursor-pointer ${MOLD_STATUS_COLOR[m.status] || ""}`} value={m.status} onChange={(e) => updateMold(m.id, { status: e.target.value })}>
                {MOLD_STATUS_DEFS.map((s) => <option key={s.vi} value={s.vi}>{s.vi} / {s.zh}</option>)}
              </select>
            </td>
            <td className={`px-3 py-2 ${selCls(m.id, "notes")}`} onClick={() => setSelected({ rowId: m.id, colKey: "notes" })}>
              <input className={`${inputCls} v-input--sm v-input--ghost`} placeholder="—" value={m.notes || ""} onChange={(e) => updateMold(m.id, { notes: e.target.value })} />
            </td>
            <td className="px-3 py-2"><div className="flex justify-end gap-1"><button className={`${btnIcon}`} onClick={() => setMoldForm(m)}><Pencil size={14} /></button><button className={`${btnIcon} text-bad`} onClick={() => deleteMold(m)}><Trash2 size={14} /></button></div></td>
          </tr>))}
          {filteredMolds.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-mute">Không có khuôn phù hợp</td></tr>}
        </tbody>
      </table></div></div>
      {moldForm !== null && <MoldForm open onClose={() => setMoldForm(null)} onSave={saveMold} initial={moldForm.id ? moldForm : null} />}
    </div>
  );
}
