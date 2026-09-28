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
import { getPositionLabel, getStatusLabel, t } from "../lib/i18n";

export function EmployeesPage() {
  const { db, setDb, pushToast, confirmAction, lang = "vi", searchQuery = "" } = useApp();
  const query = searchQuery;
  const [selected, setSelected] = useState(null);
  const clipRef = useRef(null);
  const machinesById = useMemo(() => byId(db.machines), [db.machines]);
  const ordersById = useMemo(() => byId(db.orders), [db.orders]);
  const moldsById = useMemo(() => byId(db.molds), [db.molds]);
  const [tab, setTab] = useState("active");
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

  const tabEmployees = useMemo(
    () => employees.filter((e) => (tab === "active" ? isActive(e) : !isActive(e))),
    [employees, tab]
  );

  const filteredAndSortedList = useMemo(() => {
    let list = tabEmployees;

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

    Object.entries(filters).forEach(([colKey, filterVal]) => {
      if (!filterVal) return;
      if (Array.isArray(filterVal)) {
        const allowed = new Set(filterVal);
        list = list.filter((e) => {
          const raw = String(e[colKey] ?? "").trim();
          const val = raw === "" ? "(Chỗ trống)" : raw;
          return allowed.has(val);
        });
      } else if (typeof filterVal === "string" && filterVal.trim()) {
        const val = filterVal.toLowerCase().trim();
        list = list.filter((e) => String(e[colKey] ?? "").toLowerCase().includes(val));
      }
    });

    if (sortConfig.key) {
      list = [...list].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
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

    return list;
  }, [employees, tab, query, positionFilter, joinRange, resignRange, filters, sortConfig]);



  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 bg-[#F4F7FE] pb-2 space-y-3">
        <PageHeader
          vi="Nhân sự"
          zh="人员管理"
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
                labelVi="Thêm nhân sự"
                labelZh="新增员工"
                labelEn="Add Employee"
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
            { key: "active", label: `${t("activeEmployees", lang)} (${employees.filter((e) => isActive(e)).length})` },
            { key: "resigned", label: `${t("resignedEmployees", lang)} (${employees.filter((e) => !isActive(e)).length})` },
          ]}
        />
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)]">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="pe-thead text-sm sticky top-0 z-10 bg-[#F8FAFC] shadow-xs">
              <tr className="h-10">
                <th className="px-3 py-2 text-center align-middle font-semibold text-ink text-sm whitespace-nowrap w-12 min-w-[50px] bg-[#F8FAFC]">
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
                  data={tabEmployees}
                  className="min-w-[110px]"
                />
                <SortableTh
                  labelVi="Tên VN"
                  labelZh="越南语姓名"
                  colKey="vietnameseName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.vietnameseName}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  className="min-w-[150px]"
                />
                <SortableTh
                  labelVi="Tên Trung"
                  labelZh="中文姓名"
                  colKey="chineseName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.chineseName}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  className="min-w-[130px]"
                />
                <SortableTh
                  labelVi="Ngày vào làm"
                  labelZh="入职"
                  colKey="joinDate"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.joinDate}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  className="min-w-[130px]"
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
                    data={tabEmployees}
                    className="min-w-[130px]"
                  />
                )}
                <th className="px-3 py-2 text-left align-middle font-semibold text-ink text-sm whitespace-nowrap min-w-[120px]">
                  {t("seniority", lang)}
                </th>
                <SortableTh
                  labelVi="Vị trí"
                  labelZh="职位"
                  labelEn="Position"
                  colKey="position"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.position}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  getDisplayValue={(e) => getPositionLabel(e.position, lang)}
                  className="min-w-[175px]"
                />
                <SortableTh
                  labelVi="Trạng thái"
                  labelZh="状态"
                  labelEn="Status"
                  colKey="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.status}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  getDisplayValue={(e) => getStatusLabel(e.status, lang)}
                  className="min-w-[135px]"
                />
                 <SortableTh
                  labelVi="Năm sinh"
                  labelZh="出生年"
                  labelEn="Birth Year"
                  colKey="birthYear"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.birthYear}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  className="min-w-[110px]"
                />
                <SortableTh
                  labelVi="Số điện thoại"
                  labelZh="电话"
                  labelEn="Phone"
                  colKey="phone"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.phone}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  className="min-w-[130px]"
                />
                <SortableTh
                  labelVi="Địa chỉ"
                  labelZh="地址"
                  labelEn="Address"
                  colKey="address"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.address}
                  onFilterChange={handleFilterChange}
                  data={tabEmployees}
                  className="min-w-[170px]"
                />
                <th className="px-3 py-2 text-right align-middle font-semibold text-ink text-sm whitespace-nowrap min-w-[100px] bg-[#F8FAFC]">
                  {t("actions", lang)}
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
                    {formatSeniority(e.joinDate, e.resignDate, lang) || "—"}
                  </td>
                  <td className={`px-2 py-2 min-w-[175px] ${selCls(e.id, "position")}`} onClick={() => setSelected({ rowId: e.id, colKey: "position" })}>
                    <select
                      className={`${inputCls} v-input--sm text-sm w-full font-medium`}
                      value={e.position}
                      onChange={(ev) => updateEmployee(e.id, { position: ev.target.value })}
                    >
                      {POSITION_LIST.map((p) => (
                        <option key={p} value={p}>
                          {getPositionLabel(p, lang)}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  <td className={`px-2 py-2 min-w-[135px] ${selCls(e.id, "status")}`} onClick={() => setSelected({ rowId: e.id, colKey: "status" })}>
                    <select
                      className={`border border-transparent px-2 py-1 text-sm font-bold cursor-pointer rounded-xs w-full ${EMP_STATUS_COLOR[e.status] || ""}`}
                      value={e.status}
                      onChange={(ev) => handleStatusChange(e, ev.target.value)}
                    >
                      {EMP_STATUS_DEFS.map((s) => (
                        <option key={s.vi} value={s.vi}>
                          {getStatusLabel(s.vi, lang)}
                        </option>
                      ))}
                    </select>
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
                  <td className={`px-2 py-2 ${selCls(e.id, "address")}` } onClick={() => setSelected({ rowId: e.id, colKey: "address" })}>
                    <input
                      className={`${inputCls} v-input--sm text-sm`}
                      placeholder="—"
                      value={e.address || ""}
                      onChange={(ev) => updateEmployee(e.id, { address: ev.target.value })}
                    />
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
