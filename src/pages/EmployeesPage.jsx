import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardPaste, Eye, Redo2, Trash2, Undo2 } from "lucide-react";
import { DateRangeFilter } from "../components/employees/DateRangeFilter";
import { EmployeeDetailDrawer } from "../components/employees/EmployeeDetailDrawer";
import { EmployeeForm } from "../components/employees/EmployeeForm";
import { PasteImportModal } from "../components/employees/PasteImportModal";
import { ResignReasonCell } from "../components/employees/ResignReasonCell";
import { AddActionButton } from "../components/ui/AddActionButton";
import { ExcelImportModal } from "../components/ui/ExcelImportModal";
import { SearchBox } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { Segmented } from "../components/ui/Segmented";
import { SortableTh } from "../components/ui/SortableTh";
import { useApp } from "../context/AppContext";
import { EMP_STATUS, EMP_STATUS_COLOR, EMP_STATUS_DEFS, POSITION_LIST, POSITION_ZH, isActive } from "../lib/constants";
import { TODAY_KEY, formatSeniority, inRange } from "../lib/dates";
import { downloadEmployeeTemplate, parseAndDedupEmployees } from "../lib/excel";
import { byId } from "../lib/schedule";
import { btnIcon, btnSecondary, card, inputCls } from "../lib/styles";
import { useTableHistory } from "../lib/useTableHistory";

export function EmployeesPage() {
  const { db, setDb, pushToast, confirmAction } = useApp();
  const [selected, setSelected] = useState(null);
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
  const [excelOpen, setExcelOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({});

  const {
    data: employees,
    updateData: setEmployeesWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTableHistory(db.employees, (nextEmployees) => {
    setDb((p) => ({ ...p, employees: nextEmployees }));
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  };

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const saveEmployee = (data) => {
    if (form && form.id) {
      setEmployeesWithHistory((prev) =>
        prev.map((e) => (e.id === form.id ? { ...e, ...data } : e))
      );
      pushToast(
        data.status === EMP_STATUS.RESIGNED
          ? "Đã chuyển nhân sự sang danh sách Nghỉ việc / 已转移至离职名单"
          : "Đã cập nhật hồ sơ nhân sự / 已更新",
        "success"
      );
    } else {
      setEmployeesWithHistory((prev) => [
        ...prev,
        { id: data.employeeCode, ...data },
      ]);
      pushToast("Đã thêm nhân sự mới / 已新增", "success");
    }
    setForm(null);
  };

  const updateEmployee = (id, patch) =>
    setEmployeesWithHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );

  const handleStatusChange = (e, newStatus) => {
    if (newStatus === EMP_STATUS.RESIGNED) {
      updateEmployee(e.id, { status: newStatus, resignDate: TODAY_KEY });
      pushToast(`Đã chuyển ${e.vietnameseName} sang danh sách Nghỉ việc / 已转移至离职名单`, "success");
    } else {
      updateEmployee(e.id, { status: newStatus });
      pushToast(`Đã cập nhật trạng thái ${e.vietnameseName} / 已更新状态`, "success");
    }
  };

  const deleteEmployee = (e) => {
    confirmAction(
      `Cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn nhân sự "${e.vietnameseName} (${e.employeeCode})"? / 警告：确定要删除员工 "${e.vietnameseName} (${e.employeeCode})" 吗？`,
      () => {
        setEmployeesWithHistory((prev) => prev.filter((x) => x.id !== e.id));
        pushToast(`Đã xóa nhân sự ${e.vietnameseName} / 已删除`, "info");
      },
      {
        title: "Xác nhận xóa nhân sự / 确认删除",
        danger: true,
        confirmLabel: "Xóa vĩnh viễn / 永久删除",
      }
    );
  };

  const restoreEmployee = (e) => {
    confirmAction(
      `Khôi phục ${e.vietnameseName} về trạng thái "Chính thức" và đưa lại vào danh sách đang làm việc? / 将 ${e.vietnameseName} 恢复为"正式工"并放回在职名单？`,
      () => {
        setEmployeesWithHistory((prev) =>
          prev.map((x) =>
            x.id === e.id
              ? { ...x, status: EMP_STATUS.OFFICIAL, resignDate: null, resignReason: "" }
              : x
          )
        );
        setDetailEmployee(null);
        pushToast(`Đã khôi phục ${e.vietnameseName} về danh sách đang làm việc / 已恢复在职`, "success");
      },
      { title: "Khôi phục nhân sự / 恢复员工", confirmLabel: "Khôi phục / 恢复" }
    );
  };

  const handlePasteImport = (rows) => {
    setEmployeesWithHistory((prev) => [...prev, ...rows]);
    pushToast(`Đã thêm ${rows.length} nhân sự từ dữ liệu dán / 已新增`, "success");
  };

  const handleExcelImport = (newEmployees) => {
    setEmployeesWithHistory((prev) => [...prev, ...newEmployees]);
    pushToast(`Đã thêm mới ${newEmployees.length} nhân sự từ Excel / 已新增`, "success");
  };

  const isSel = (rowId, colKey) => selected && selected.rowId === rowId && selected.colKey === colKey;
  const selCls = (rowId, colKey) => `${isSel(rowId, colKey) ? "ring-2 ring-inset ring-brand bg-brand-tint" : ""}`;
  const EMP_CELL_KEYS = ["employeeCode", "vietnameseName", "chineseName", "birthYear", "phone", "address", "joinDate", "position", "status", "resignDate", "resignReason"];
  const getCell = (rowId, colKey) => {
    const e = employees.find((x) => x.id === rowId);
    return e ? (e[colKey] ?? "") : "";
  };
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
        setCell(selected.rowId, selected.colKey, "");
        pushToast("Đã xóa dữ liệu ô / 已清空", "info");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, employees]);

  const filteredAndSortedList = useMemo(() => {
    let list = employees.filter((e) => (tab === "active" ? isActive(e) : !isActive(e)));

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.vietnameseName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          (e.chineseName || "").toLowerCase().includes(q) ||
          (e.phone || "").toLowerCase().includes(q) ||
          (e.address || "").toLowerCase().includes(q)
      );
    }

    if (positionFilter) list = list.filter((e) => e.position === positionFilter);
    if (joinRange) list = list.filter((e) => inRange(e.joinDate, joinRange.from, joinRange.to));
    if (tab === "resigned" && resignRange) {
      list = list.filter((e) => e.resignDate && inRange(e.resignDate, resignRange.from, resignRange.to));
    }

    if (filters.employeeCode) {
      const val = filters.employeeCode.toLowerCase();
      list = list.filter((e) => e.employeeCode.toLowerCase().includes(val));
    }
    if (filters.vietnameseName) {
      const val = filters.vietnameseName.toLowerCase();
      list = list.filter((e) => e.vietnameseName.toLowerCase().includes(val));
    }
    if (filters.chineseName) {
      const val = filters.chineseName.toLowerCase();
      list = list.filter((e) => (e.chineseName || "").toLowerCase().includes(val));
    }
    if (filters.birthYear) {
      const val = String(filters.birthYear).trim();
      list = list.filter((e) => String(e.birthYear || "").includes(val));
    }
    if (filters.phone) {
      const val = filters.phone.toLowerCase();
      list = list.filter((e) => (e.phone || "").toLowerCase().includes(val));
    }
    if (filters.address) {
      const val = filters.address.toLowerCase();
      list = list.filter((e) => (e.address || "").toLowerCase().includes(val));
    }
    if (filters.joinDate) {
      list = list.filter((e) => (e.joinDate || "").includes(filters.joinDate));
    }
    if (filters.position) {
      list = list.filter((e) => e.position === filters.position);
    }
    if (filters.status) {
      list = list.filter((e) => e.status === filters.status);
    }

    if (sortConfig.key) {
      list = [...list].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        valA = String(valA || "").toLowerCase();
        valB = String(valB || "").toLowerCase();
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [employees, tab, query, positionFilter, joinRange, resignRange, filters, sortConfig]);

  const positionFilterOptions = useMemo(
    () => POSITION_LIST.map((p) => ({ value: p, label: `${p} / ${POSITION_ZH[p]}` })),
    []
  );

  const statusFilterOptions = useMemo(
    () => EMP_STATUS_DEFS.map((s) => ({ value: s.vi, label: `${s.vi} / ${s.zh}` })),
    []
  );

  return (
    <div className="space-y-5">
      <PageHeader
        vi="Nhân sự"
        zh="人员管理"
        actions={
          <>
            <SearchBox value={query} onChange={setQuery} placeholder="Tìm tên, mã NV... / 搜索姓名、工号..." />
            <select
              className={`${inputCls} v-input--w40 text-sm`}
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
            >
              <option value="">Tất cả vị trí / 全部职位</option>
              {POSITION_LIST.map((p) => (
                <option key={p} value={p}>
                  {p} / {POSITION_ZH[p]}
                </option>
              ))}
            </select>
            <DateRangeFilter label="Ngày vào làm / 入职日期" value={joinRange} onChange={setJoinRange} />
            {tab === "resigned" && (
              <DateRangeFilter label="Ngày rời đi / 离职日期" value={resignRange} onChange={setResignRange} />
            )}
            <div className="flex items-center gap-1 border border-line bg-white px-2 py-1 rounded-xs">
              <button
                type="button"
                className="p-1 hover:text-[#2051A3] disabled:opacity-40 disabled:hover:text-inherit"
                disabled={!canUndo}
                onClick={undo}
                title="Hoàn tác / 撤销 (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                className="p-1 hover:text-[#2051A3] disabled:opacity-40 disabled:hover:text-inherit"
                disabled={!canRedo}
                onClick={redo}
                title="Làm lại / 重做 (Ctrl+Y)"
              >
                <Redo2 size={16} />
              </button>
            </div>
            <button className={btnSecondary} onClick={() => setPasteOpen(true)}>
              <ClipboardPaste size={14} /> Dán từ Excel / 从Excel粘贴
            </button>
            <AddActionButton
              labelVi="Thêm nhân sự"
              labelZh="新增员工"
              onManualAdd={() => setForm({})}
              onExcelAdd={() => setExcelOpen(true)}
            />
          </>
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { key: "active", label: `Đang làm việc / 在职 (${employees.filter((e) => isActive(e)).length})` },
          { key: "resigned", label: `Nghỉ việc / 离职 (${employees.filter((e) => !isActive(e)).length})` },
        ]}
      />

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="pe-thead text-sm">
              <tr>
                <th className="px-2 py-2 text-left align-top font-semibold text-ink text-sm w-12">
                  STT
                </th>
                <SortableTh
                  labelVi="Mã NV"
                  labelZh="工号"
                  colKey="employeeCode"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.employeeCode}
                  onFilterChange={handleFilterChange}
                  className="w-24"
                />
                <SortableTh
                  labelVi="Tên VN"
                  labelZh="越南语姓名"
                  colKey="vietnameseName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.vietnameseName}
                  onFilterChange={handleFilterChange}
                  className="w-36"
                />
                <SortableTh
                  labelVi="Tên Trung"
                  labelZh="中文姓名"
                  colKey="chineseName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.chineseName}
                  onFilterChange={handleFilterChange}
                  className="w-28"
                />
                <SortableTh
                  labelVi="Năm sinh"
                  labelZh="出生年"
                  colKey="birthYear"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.birthYear}
                  onFilterChange={handleFilterChange}
                  className="w-24"
                />
                <SortableTh
                  labelVi="Số điện thoại"
                  labelZh="电话"
                  colKey="phone"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.phone}
                  onFilterChange={handleFilterChange}
                  className="w-32"
                />
                <SortableTh
                  labelVi="Địa chỉ"
                  labelZh="地址"
                  colKey="address"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.address}
                  onFilterChange={handleFilterChange}
                  className="w-44"
                />
                <SortableTh
                  labelVi="Ngày vào làm"
                  labelZh="入职"
                  colKey="joinDate"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.joinDate}
                  onFilterChange={handleFilterChange}
                  className="w-28"
                />
                {tab === "resigned" && (
                  <SortableTh
                    labelVi="Ngày rời đi"
                    labelZh="离职"
                    colKey="resignDate"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    filterValue={filters.resignDate}
                    onFilterChange={handleFilterChange}
                    className="w-28"
                  />
                )}
                <th className="px-2 py-2 text-left align-top font-semibold text-ink text-sm w-24">
                  Thâm niên / 工龄
                </th>
                <SortableTh
                  labelVi="Vị trí"
                  labelZh="职位"
                  colKey="position"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterType="select"
                  filterOptions={positionFilterOptions}
                  filterValue={filters.position}
                  onFilterChange={handleFilterChange}
                  className="w-36"
                />
                <SortableTh
                  labelVi="Trạng thái"
                  labelZh="状态"
                  colKey="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterType="select"
                  filterOptions={statusFilterOptions}
                  filterValue={filters.status}
                  onFilterChange={handleFilterChange}
                  className="w-32"
                />
                <th className="px-2 py-2 text-right align-top font-semibold text-ink text-sm w-28">
                  Thao tác / 操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedList.map((e, idx) => (
                <tr key={e.id} className="border-t border-line hover:bg-canvas">
                  <td className="px-2 py-2 text-mute text-sm font-medium">
                    {idx + 1}
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "employeeCode")}`} onClick={() => setSelected({ rowId: e.id, colKey: "employeeCode" })}>
                    <input
                      className={`${inputCls} v-input--sm v-input--ghost font-bold text-sm`}
                      value={e.employeeCode}
                      onChange={(ev) => updateEmployee(e.id, { employeeCode: ev.target.value })}
                    />
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "vietnameseName")}`} onClick={() => setSelected({ rowId: e.id, colKey: "vietnameseName" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm`}
                      value={e.vietnameseName}
                      onChange={(ev) => updateEmployee(e.id, { vietnameseName: ev.target.value })}
                    />
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "chineseName")}`} onClick={() => setSelected({ rowId: e.id, colKey: "chineseName" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm`}
                      placeholder="—"
                      value={e.chineseName || ""}
                      onChange={(ev) => updateEmployee(e.id, { chineseName: ev.target.value })}
                    />
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "birthYear")}`} onClick={() => setSelected({ rowId: e.id, colKey: "birthYear" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm`}
                      placeholder="—"
                      value={e.birthYear || ""}
                      onChange={(ev) => updateEmployee(e.id, { birthYear: ev.target.value })}
                    />
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "phone")}`} onClick={() => setSelected({ rowId: e.id, colKey: "phone" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm`}
                      placeholder="—"
                      value={e.phone || ""}
                      onChange={(ev) => updateEmployee(e.id, { phone: ev.target.value })}
                    />
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "address")}`} onClick={() => setSelected({ rowId: e.id, colKey: "address" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm`}
                      placeholder="—"
                      value={e.address || ""}
                      onChange={(ev) => updateEmployee(e.id, { address: ev.target.value })}
                    />
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "joinDate")}`} onClick={() => setSelected({ rowId: e.id, colKey: "joinDate" })}>
                    <input
                      type="date"
                      className={`${inputCls} v-input--sm text-sm`}
                      value={e.joinDate}
                      onChange={(ev) => updateEmployee(e.id, { joinDate: ev.target.value })}
                    />
                  </td>
                  {tab === "resigned" && (
                    <td className={`px-2 py-2 ${selCls(e.id, "resignDate")}`} onClick={() => setSelected({ rowId: e.id, colKey: "resignDate" })}>
                      <input
                        type="date"
                        className={`${inputCls} v-input--sm text-sm`}
                        value={e.resignDate || ""}
                        onChange={(ev) => updateEmployee(e.id, { resignDate: ev.target.value })}
                      />
                    </td>
                  )}
                  <td className="px-2 py-2 text-sm text-ink whitespace-nowrap">
                    {formatSeniority(e.joinDate, e.resignDate) || "—"}
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "position")}`} onClick={() => setSelected({ rowId: e.id, colKey: "position" })}>
                    <select
                      className={`${inputCls} v-input--sm text-sm`}
                      value={e.position}
                      onChange={(ev) => updateEmployee(e.id, { position: ev.target.value })}
                    >
                      {POSITION_LIST.map((p) => (
                        <option key={p} value={p}>
                          {p} / {POSITION_ZH[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`px-2 py-2 ${selCls(e.id, "status")}`} onClick={() => setSelected({ rowId: e.id, colKey: "status" })}>
                    <select
                      className={`border border-transparent px-2 py-1 text-sm font-bold cursor-pointer rounded-xs ${EMP_STATUS_COLOR[e.status] || ""}`}
                      value={e.status}
                      onChange={(ev) => handleStatusChange(e, ev.target.value)}
                    >
                      {EMP_STATUS_DEFS.map((s) => (
                        <option key={s.vi} value={s.vi}>
                          {s.vi} / {s.zh}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className={`${btnIcon} rounded-xs`}
                        title="Xem chi tiết / 查看详情"
                        onClick={() => setDetailEmployee(e)}
                      >
                        <Eye size={14} />
                      </button>
                      {tab === "resigned" && (
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => restoreEmployee(e)}
                          title="Khôi phục / 恢复"
                        >
                          <Undo2 size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${btnIcon} text-bad rounded-xs`}
                        title="Xóa nhân sự / 删除"
                        onClick={() => deleteEmployee(e)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAndSortedList.length === 0 && (
                <tr>
                  <td colSpan={tab === "resigned" ? 14 : 13} className="px-3 py-8 text-center text-mute text-sm">
                    Không có nhân sự phù hợp / 没有符合条件的员工
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form !== null && (
        <EmployeeForm
          open
          onClose={() => setForm(null)}
          onSave={saveEmployee}
          initial={null}
          existingCodes={employees.map((e) => e.employeeCode)}
        />
      )}

      <EmployeeDetailDrawer
        employee={detailEmployee}
        onClose={() => setDetailEmployee(null)}
        machinesById={machinesById}
        ordersById={ordersById}
        moldsById={moldsById}
        schedules={db.schedules}
        onRestore={restoreEmployee}
      />

      <PasteImportModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onImport={handlePasteImport}
        existingCodes={employees.map((e) => e.employeeCode)}
      />

      {excelOpen && (
        <ExcelImportModal
          open
          onClose={() => setExcelOpen(false)}
          titleVi="Nhập nhân sự từ Excel"
          titleZh="从 Excel 导入员工"
          onDownloadTemplate={downloadEmployeeTemplate}
          onParseFile={(buf) => parseAndDedupEmployees(buf, employees)}
          onConfirmImport={handleExcelImport}
        />
      )}
    </div>
  );
}
