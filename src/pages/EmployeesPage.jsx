import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardPaste, Eye, Plus, Trash2, Undo2 } from "lucide-react";
import { DateRangeFilter } from "../components/employees/DateRangeFilter";
import { EmployeeDetailDrawer } from "../components/employees/EmployeeDetailDrawer";
import { EmployeeForm } from "../components/employees/EmployeeForm";
import { PasteImportModal } from "../components/employees/PasteImportModal";
import { ResignReasonCell } from "../components/employees/ResignReasonCell";
import { SearchBox } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { Segmented } from "../components/ui/Segmented";
import { useApp } from "../context/AppContext";
import { EMP_STATUS, EMP_STATUS_COLOR, EMP_STATUS_DEFS, POSITION_LIST, POSITION_ZH, isActive } from "../lib/constants";
import { TODAY_KEY, formatSeniority, inRange } from "../lib/dates";
import { byId } from "../lib/schedule";
import { btnIcon, btnPrimary, btnSecondary, card, inputCls } from "../lib/styles";

export function EmployeesPage() {
  const { db, setDb, pushToast, confirmAction } = useApp();
  const [selected, setSelected] = useState(null); // { rowId, colKey }
  const clipRef = useRef(null);
  const machinesById = useMemo(() => byId(db.machines), [db.machines]);
  const ordersById = useMemo(() => byId(db.orders), [db.orders]);
  const moldsById = useMemo(() => byId(db.molds), [db.molds]);
  const [tab, setTab] = useState("active");
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [joinRange, setJoinRange] = useState(null);
  const [resignRange, setResignRange] = useState(null);
  const [form, setForm] = useState(null);
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);

  const search = (list) => { const q = query.toLowerCase().trim(); return q ? list.filter((e) => e.vietnameseName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q)) : list; };
  const activeList = useMemo(() => {
    let l = search(db.employees.filter((e) => isActive(e)));
    if (positionFilter) l = l.filter((e) => e.position === positionFilter);
    if (joinRange) l = l.filter((e) => inRange(e.joinDate, joinRange.from, joinRange.to));
    return l;
  }, [db.employees, query, positionFilter, joinRange]);
  const resignedList = useMemo(() => {
    let l = search(db.employees.filter((e) => !isActive(e)));
    if (positionFilter) l = l.filter((e) => e.position === positionFilter);
    if (joinRange) l = l.filter((e) => inRange(e.joinDate, joinRange.from, joinRange.to));
    if (resignRange) l = l.filter((e) => e.resignDate && inRange(e.resignDate, resignRange.from, resignRange.to));
    return l;
  }, [db.employees, query, positionFilter, joinRange, resignRange]);

  const saveEmployee = (data) => {
    if (form && form.id) {
      setDb((p) => ({ ...p, employees: p.employees.map((e) => (e.id === form.id ? { ...e, ...data } : e)) }));
      pushToast(data.status === EMP_STATUS.RESIGNED ? "Đã chuyển nhân sự sang danh sách Nghỉ việc / 已转移至离职名单" : "Đã cập nhật hồ sơ nhân sự / 已更新", "success");
    } else { setDb((p) => ({ ...p, employees: [...p.employees, { id: data.employeeCode, ...data }] })); pushToast("Đã thêm nhân sự mới / 已新增", "success"); }
    setForm(null);
  };
  const updateEmployee = (id, patch) => setDb((p) => ({ ...p, employees: p.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const handleStatusChange = (e, newStatus) => {
    if (newStatus === EMP_STATUS.RESIGNED) {
      updateEmployee(e.id, { status: newStatus, resignDate: TODAY_KEY });
      pushToast(`Đã chuyển ${e.vietnameseName} sang danh sách Nghỉ việc / 已转移至离职名单`, "success");
    } else {
      updateEmployee(e.id, { status: newStatus });
      pushToast(`Đã cập nhật trạng thái ${e.vietnameseName} / 已更新状态`, "success");
    }
  };
  const deleteEmployee = () => pushToast('Không thể xóa nhân sự — hãy chuyển Trạng thái sang "Đã nghỉ việc" để giữ lịch sử.', "warning");
  const restoreEmployee = (e) => {
    confirmAction(
      `Khôi phục ${e.vietnameseName} về trạng thái "Chính thức" và đưa lại vào danh sách đang làm việc? / 将 ${e.vietnameseName} 恢复为"正式工"并放回在职名单？`,
      () => {
        setDb((p) => ({ ...p, employees: p.employees.map((x) => (x.id === e.id ? { ...x, status: EMP_STATUS.OFFICIAL, resignDate: null, resignReason: "" } : x)) }));
        setDetailEmployee(null);
        pushToast(`Đã khôi phục ${e.vietnameseName} về danh sách đang làm việc / 已恢复在职`, "success");
      },
      { title: "Khôi phục nhân sự / 恢复员工", confirmLabel: "Khôi phục / 恢复" }
    );
  };
  const handlePasteImport = (rows) => { setDb((p) => ({ ...p, employees: [...p.employees, ...rows] })); pushToast(`Đã thêm ${rows.length} nhân sự từ dữ liệu dán / 已新增`, "success"); };

  const isSel = (rowId, colKey) => selected && selected.rowId === rowId && selected.colKey === colKey;
  const selCls = (rowId, colKey) => `${isSel(rowId, colKey) ? "ring-2 ring-inset ring-brand bg-brand-tint" : ""}`;
  const EMP_CELL_KEYS = ["employeeCode", "vietnameseName", "chineseName", "joinDate", "position", "status", "resignDate", "resignReason"];
  const getCell = (rowId, colKey) => { const e = db.employees.find((x) => x.id === rowId); return e ? (e[colKey] ?? "") : ""; };
  const setCell = (rowId, colKey, value) => {
    if (colKey === "position" && value && !POSITION_LIST.includes(value)) return;
    if (colKey === "status" && value && !EMP_STATUS_DEFS.some((s) => s.vi === value)) return;
    updateEmployee(rowId, { [colKey]: value });
  };
  useEffect(() => {
    const onKey = (e) => {
      if (!selected || !EMP_CELL_KEYS.includes(selected.colKey)) return;
      const meta = e.ctrlKey || e.metaKey;
      const tag = (e.target && e.target.tagName) || "";
      const inField = ["INPUT", "SELECT", "TEXTAREA"].includes(tag);
      if (meta && (e.key === "c" || e.key === "C")) { clipRef.current = getCell(selected.rowId, selected.colKey); pushToast("Đã copy ô / 已复制", "info"); }
      else if (meta && (e.key === "v" || e.key === "V")) { if (clipRef.current !== null && clipRef.current !== undefined) { setCell(selected.rowId, selected.colKey, clipRef.current); pushToast("Đã dán ô / 已粘贴", "success"); } }
      else if (!inField && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); setCell(selected.rowId, selected.colKey, ""); pushToast("Đã xóa dữ liệu ô / 已清空", "info"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, db.employees]);

  return (
    <div className="space-y-5">
      <PageHeader vi="Nhân sự" zh="人员管理" actions={<>
        <SearchBox value={query} onChange={setQuery} placeholder="Tìm tên, mã NV... / 搜索姓名、工号..." />
        <select className={`${inputCls} v-input--w40`} value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}><option value="">Tất cả vị trí / 全部职位</option>{POSITION_LIST.map((p) => <option key={p} value={p}>{p} / {POSITION_ZH[p]}</option>)}</select>
        <DateRangeFilter label="Ngày vào làm / 入职日期" value={joinRange} onChange={setJoinRange} />
        {tab === "resigned" && <DateRangeFilter label="Ngày rời đi / 离职日期" value={resignRange} onChange={setResignRange} />}
        <button className={btnSecondary} onClick={() => setPasteOpen(true)}><ClipboardPaste size={14} /> Dán từ Excel / 从Excel粘贴</button>
        <button className={btnPrimary} onClick={() => setForm({})}><Plus size={14} /> Thêm nhân sự / 新增员工</button>
      </>} />
      <Segmented value={tab} onChange={setTab} items={[{ key: "active", label: `Đang làm việc / 在职 (${db.employees.filter((e) => isActive(e)).length})` }, { key: "resigned", label: `Nghỉ việc / 离职 (${db.employees.filter((e) => !isActive(e)).length})` }]} />
      <p className="text-xs text-body">Bấm trực tiếp vào từng ô để chỉnh sửa. Chọn ô rồi Ctrl+C / Ctrl+V để copy-dán, Delete/Backspace để xóa nhanh. Bấm biểu tượng <Eye size={11} className="inline" /> để xem chi tiết. / 直接点击单元格编辑，选中后 Ctrl+C/V 复制粘贴，Delete/Backspace 快速清空，点击 <Eye size={11} className="inline" /> 图标查看详情</p>
      <div>
      {tab === "active" ? (
        <div className={`${card} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full table-fixed text-sm">
          <colgroup><col style={{ width: "8%" }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} /><col style={{ width: "11%" }} /><col style={{ width: "11%" }} /><col style={{ width: "9%" }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} /><col style={{ width: "9%" }} /></colgroup>
          <thead className="pe-thead text-xs"><tr><th className="px-3 py-2 text-left">Mã NV / 工号</th><th className="px-3 py-2 text-left">Tên VN / 越南语姓名</th><th className="px-3 py-2 text-left">Tên Trung / 中文姓名</th><th className="px-3 py-2 text-left">Ngày vào làm / 入职</th><th className="px-3 py-2 text-left">Ngày rời đi / 离职</th><th className="px-3 py-2 text-left">Thâm niên / 工龄</th><th className="px-3 py-2 text-left">Vị trí / 职位</th><th className="px-3 py-2 text-left">Trạng thái / 状态</th><th className="px-3 py-2 text-right">Thao tác / 操作</th></tr></thead>
          <tbody>{activeList.map((e) => (
            <tr key={e.id} className="border-t border-line hover:bg-canvas">
              <td className={`px-3 py-2 ${selCls(e.id, "employeeCode")}`} onClick={() => setSelected({ rowId: e.id, colKey: "employeeCode" })}><input className={`${inputCls} v-input--sm v-input--ghost font-bold`} value={e.employeeCode} onChange={(ev) => updateEmployee(e.id, { employeeCode: ev.target.value })} /></td>
              <td className={`px-3 py-2 ${selCls(e.id, "vietnameseName")}`} onClick={() => setSelected({ rowId: e.id, colKey: "vietnameseName" })}><input className={`${inputCls} v-input--sm`} value={e.vietnameseName} onChange={(ev) => updateEmployee(e.id, { vietnameseName: ev.target.value })} /></td>
              <td className={`px-3 py-2 ${selCls(e.id, "chineseName")}`} onClick={() => setSelected({ rowId: e.id, colKey: "chineseName" })}><input className={`${inputCls} v-input--sm`} placeholder="Chưa cập nhật / 未更新" value={e.chineseName || ""} onChange={(ev) => updateEmployee(e.id, { chineseName: ev.target.value })} /></td>
              <td className={`px-3 py-2 ${selCls(e.id, "joinDate")}`} onClick={() => setSelected({ rowId: e.id, colKey: "joinDate" })}><input type="date" className={`${inputCls} v-input--sm`} value={e.joinDate} onChange={(ev) => updateEmployee(e.id, { joinDate: ev.target.value })} /></td>
              <td className="px-3 py-2 text-faint">—</td>
              <td className="px-3 py-2">{formatSeniority(e.joinDate)}</td>
              <td className={`px-3 py-2 ${selCls(e.id, "position")}`} onClick={() => setSelected({ rowId: e.id, colKey: "position" })}><select className={`${inputCls} v-input--sm`} value={e.position} onChange={(ev) => updateEmployee(e.id, { position: ev.target.value })}>{POSITION_LIST.map((p) => <option key={p} value={p}>{p} / {POSITION_ZH[p]}</option>)}</select></td>
              <td className={`px-3 py-2 ${selCls(e.id, "status")}`} onClick={() => setSelected({ rowId: e.id, colKey: "status" })}>
                <select className={`rad-14 border border-transparent px-2.5 py-1.5 text-xs font-bold cursor-pointer ${EMP_STATUS_COLOR[e.status]}`} value={e.status} onChange={(ev) => handleStatusChange(e, ev.target.value)}>
                  {EMP_STATUS_DEFS.map((s) => <option key={s.vi} value={s.vi}>{s.vi} / {s.zh}</option>)}
                </select>
              </td>
              <td className="px-3 py-2"><div className="flex justify-end gap-1"><button className={`${btnIcon}`} title="Xem chi tiết / 查看详情" onClick={() => setDetailEmployee(e)}><Eye size={14} /></button><button className={`${btnIcon} text-bad`} onClick={deleteEmployee}><Trash2 size={14} /></button></div></td>
            </tr>))}
            {activeList.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-mute">Không có nhân sự phù hợp / 没有符合条件的员工</td></tr>}
          </tbody>
        </table></div></div>
      ) : (
        <div className={`${card} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full table-fixed text-sm">
          <colgroup><col style={{ width: "9%" }} /><col style={{ width: "13%" }} /><col style={{ width: "12%" }} /><col style={{ width: "11%" }} /><col style={{ width: "11%" }} /><col style={{ width: "9%" }} /><col style={{ width: "25%" }} /><col style={{ width: "10%" }} /></colgroup>
          <thead className="pe-thead text-xs"><tr><th className="px-3 py-2 text-left">Mã NV / 工号</th><th className="px-3 py-2 text-left">Tên / 姓名</th><th className="px-3 py-2 text-left">Vị trí / 职位</th><th className="px-3 py-2 text-left">Ngày vào làm / 入职</th><th className="px-3 py-2 text-left">Ngày rời đi / 离职</th><th className="px-3 py-2 text-left">Thâm niên / 工龄</th><th className="px-3 py-2 text-left">Lý do nghỉ / 离职原因</th><th className="px-3 py-2 text-right">Thao tác / 操作</th></tr></thead>
          <tbody>{resignedList.map((e) => (
            <tr key={e.id} className="border-t border-line hover:bg-canvas">
              <td className={`px-3 py-2 font-medium text-ink ${selCls(e.id, "employeeCode")}`} onClick={() => setSelected({ rowId: e.id, colKey: "employeeCode" })}><input className={`${inputCls} v-input--sm v-input--ghost font-bold`} value={e.employeeCode} onChange={(ev) => updateEmployee(e.id, { employeeCode: ev.target.value })} /></td>
              <td className="px-3 py-2 cursor-pointer" onClick={() => setDetailEmployee(e)}>{e.vietnameseName}</td>
              <td className="px-3 py-2">{e.position} / {POSITION_ZH[e.position]}</td>
              <td className="px-3 py-2">{e.joinDate}</td>
              <td className={`px-3 py-2 ${selCls(e.id, "resignDate")}`} onClick={() => setSelected({ rowId: e.id, colKey: "resignDate" })}><input type="date" className={`${inputCls} v-input--sm`} value={e.resignDate || ""} onChange={(ev) => updateEmployee(e.id, { resignDate: ev.target.value })} /></td>
              <td className="px-3 py-2">{formatSeniority(e.joinDate, e.resignDate)}</td>
              <td className={`px-3 py-2 ${selCls(e.id, "resignReason")}`} onClick={() => setSelected({ rowId: e.id, colKey: "resignReason" })}>
                <ResignReasonCell value={e.resignReason || ""} onChange={(v) => updateEmployee(e.id, { resignReason: v })} />
              </td>
              <td className="px-3 py-2"><div className="flex justify-end gap-1"><button className={`${btnIcon}`} title="Xem chi tiết / 查看详情" onClick={() => setDetailEmployee(e)}><Eye size={14} /></button><button className={btnSecondary} onClick={() => restoreEmployee(e)} title="Khôi phục về danh sách đang làm / 恢复到在职名单"><Undo2 size={13} /> Khôi phục / 恢复</button></div></td>
            </tr>))}
            {resignedList.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-mute">Không có nhân sự nghỉ việc phù hợp / 没有符合条件的离职员工</td></tr>}
          </tbody>
        </table></div></div>
      )}
      </div>
      {form !== null && <EmployeeForm open onClose={() => setForm(null)} onSave={saveEmployee} initial={null} existingCodes={db.employees.map((e) => e.employeeCode)} />}
      <EmployeeDetailDrawer employee={detailEmployee} onClose={() => setDetailEmployee(null)} machinesById={machinesById} ordersById={ordersById} moldsById={moldsById} schedules={db.schedules} onRestore={restoreEmployee} />
      <PasteImportModal open={pasteOpen} onClose={() => setPasteOpen(false)} onImport={handlePasteImport} existingCodes={db.employees.map((e) => e.employeeCode)} />
    </div>
  );
}
