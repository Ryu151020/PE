import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Redo2, Trash2, Undo2 } from "lucide-react";
import { MoldForm } from "../components/molds/MoldForm";
import { AddActionButton } from "../components/ui/AddActionButton";
import { ExcelImportModal } from "../components/ui/ExcelImportModal";
import { SearchBox } from "../components/ui/Fields";
import { PageHeader } from "../components/ui/PageHeader";
import { useApp } from "../context/AppContext";
import { MOLD_STATUS_COLOR, MOLD_STATUS_DEFS } from "../lib/constants";
import { downloadMoldTemplate, parseAndDedupMolds } from "../lib/excel";
import { btnIcon, btnSecondary, card, inputCls } from "../lib/styles";
import { useTableHistory } from "../lib/useTableHistory";
import { SortableTh } from "../components/ui/SortableTh";
import { getMoldStatusLabel, t } from "../lib/i18n";

export function MachinesPage() {
  const { db, setDb, pushToast, confirmAction, lang = "vi", searchQuery = "" } = useApp();
  const query = searchQuery;
  const [moldForm, setMoldForm] = useState(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const clipRef = useRef(null);

  const {
    data: molds,
    updateData: setMoldsWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTableHistory(db.molds, (nextMolds) => {
    setDb((p) => ({ ...p, molds: nextMolds }));
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({});

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

  const filteredMolds = useMemo(() => {
    let result = molds.filter((m) => !query || m.moldName.toLowerCase().includes(query.toLowerCase()));

    Object.entries(filters).forEach(([colKey, filterVal]) => {
      if (!filterVal) return;
      if (Array.isArray(filterVal)) {
        const allowed = new Set(filterVal);
        result = result.filter((m) => {
          const raw = String(m[colKey] ?? "").trim();
          const val = raw === "" ? "(Chỗ trống)" : raw;
          return allowed.has(val);
        });
      } else if (typeof filterVal === "string" && filterVal.trim()) {
        const val = filterVal.toLowerCase().trim();
        result = result.filter((m) => String(m[colKey] ?? "").toLowerCase().includes(val));
      }
    });

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
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

    return result;
  }, [molds, query, filters, sortConfig]);

  const saveMold = (form) => {
    if (moldForm && moldForm.id) {
      setMoldsWithHistory((prev) =>
        prev.map((m) => (m.id === moldForm.id ? { ...m, ...form } : m))
      );
      pushToast("Đã cập nhật khuôn / 已更新", "success");
    } else {
      setMoldsWithHistory((prev) => [
        ...prev,
        { id: `MOLD-${Date.now()}`, ...form },
      ]);
      pushToast("Đã thêm khuôn mới / 已新增", "success");
    }
    setMoldForm(null);
  };

  const deleteMold = (m) => {
    confirmAction(
      `Cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn khuôn "${m.moldName}"? / 警告：确定要删除模具 "${m.moldName}" 吗？`,
      () => {
        setMoldsWithHistory((prev) => prev.filter((x) => x.id !== m.id));
        pushToast("Đã xóa khuôn / 已删除", "info");
      },
      {
        title: "Xác nhận xóa khuôn / 确认删除",
        danger: true,
        confirmLabel: "Xóa vĩnh viễn / 永久删除",
      }
    );
  };

  const updateMold = (id, patch) =>
    setMoldsWithHistory((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );

  const cellField = (colKey) => (colKey === "moldName" ? "moldName" : colKey === "status" ? "status" : "notes");
  const getCell = (rowId, colKey) => {
    const m = molds.find((x) => x.id === rowId);
    return m ? m[cellField(colKey)] : "";
  };

  const setCell = (rowId, colKey, value) => {
    if (colKey === "status" && !MOLD_STATUS_DEFS.some((s) => s.vi === value)) return;
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
      if (meta && (e.key === "c" || e.key === "C")) {
        clipRef.current = getCell(selected.rowId, selected.colKey);
        pushToast("Đã copy ô / 已复制", "info");
      } else if (meta && (e.key === "v" || e.key === "V")) {
        if (clipRef.current !== null) {
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
  }, [selected, molds]);

  const handleExcelImport = (newMolds) => {
    setMoldsWithHistory((prev) => [...prev, ...newMolds]);
    pushToast(`Đã thêm mới ${newMolds.length} khuôn từ Excel / 已新增`, "success");
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 bg-[#F4F7FE] pb-2">
        <PageHeader
          vi="Dữ liệu khuôn máy"
          zh="模具数据"
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
                labelVi="Thêm khuôn"
                labelZh="新增模具"
                labelEn="Add Mold"
                onManualAdd={() => setMoldForm({})}
                onExcelAdd={() => setExcelOpen(true)}
              />
            </>
          }
        />
      </div>

      <div className={`${card} overflow-hidden bg-white`}>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-215px)]">
          <table className="w-full table-fixed text-sm border-separate border-spacing-0">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[28%]" />
              <col className="w-[24%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="pe-thead text-sm sticky top-0 z-10 bg-[#F8FAFC] shadow-xs">
              <tr className="h-10">
                <th className="px-3 py-2 text-center align-middle font-semibold text-ink text-sm whitespace-nowrap bg-[#F8FAFC]">
                  {t("stt", lang)}
                </th>
                <SortableTh
                  labelVi="Tên khuôn"
                  labelZh="模具名称"
                  labelEn="Mold Name"
                  colKey="moldName"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.moldName}
                  onFilterChange={handleFilterChange}
                  data={molds}
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
                  data={molds}
                  getDisplayValue={(m) => getMoldStatusLabel(m.status, lang)}
                />
                <SortableTh
                  labelVi="Ghi chú"
                  labelZh="备注"
                  labelEn="Notes"
                  colKey="notes"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  filterValue={filters.notes}
                  onFilterChange={handleFilterChange}
                  data={molds}
                />
                <th className="px-3 py-2 text-right align-middle font-semibold text-ink text-sm whitespace-nowrap bg-[#F8FAFC]">
                  {t("actions", lang)}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMolds.map((m, i) => (
                <tr key={m.id} className="border-t border-line hover:bg-canvas">
                  <td className="px-3 py-2 text-mute text-sm font-medium">{i + 1}</td>
                  <td
                    className={`px-3 py-2 ${selCls(m.id, "moldName")}`}
                    onClick={() => setSelected({ rowId: m.id, colKey: "moldName" })}
                  >
                    <input
                      className={`${inputCls} v-input--sm v-input--ghost font-bold text-sm`}
                      value={m.moldName}
                      onChange={(e) => updateMold(m.id, { moldName: e.target.value })}
                    />
                  </td>
                  <td
                    className={`px-3 py-2 ${selCls(m.id, "status")}`}
                    onClick={() => setSelected({ rowId: m.id, colKey: "status" })}
                  >
                    <select
                      className={`border border-transparent px-2.5 py-1.5 text-sm font-bold cursor-pointer rounded-xs ${
                        MOLD_STATUS_COLOR[m.status] || ""
                      }`}
                      value={m.status}
                      onChange={(e) => updateMold(m.id, { status: e.target.value })}
                    >
                      {MOLD_STATUS_DEFS.map((s) => (
                        <option key={s.vi} value={s.vi}>
                          {getMoldStatusLabel(s.vi, lang)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    className={`px-3 py-2 ${selCls(m.id, "notes")}`}
                    onClick={() => setSelected({ rowId: m.id, colKey: "notes" })}
                  >
                    <input
                      className={`${inputCls} v-input--sm v-input--ghost text-sm`}
                      placeholder="—"
                      value={m.notes || ""}
                      onChange={(e) => updateMold(m.id, { notes: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className={`${btnIcon} rounded-xs`}
                        onClick={() => setMoldForm(m)}
                        title="Chỉnh sửa / 编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={`${btnIcon} text-bad rounded-xs`}
                        onClick={() => deleteMold(m)}
                        title="Xóa khuôn / 删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMolds.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-mute text-sm">
                    Không có khuôn phù hợp / 没有符合的模具
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {moldForm !== null && (
        <MoldForm
          open
          onClose={() => setMoldForm(null)}
          onSave={saveMold}
          initial={moldForm.id ? moldForm : null}
        />
      )}

      {excelOpen && (
        <ExcelImportModal
          open
          onClose={() => setExcelOpen(false)}
          titleVi="Nhập khuôn máy từ Excel"
          titleZh="从 Excel 导入模具"
          onDownloadTemplate={downloadMoldTemplate}
          onParseFile={(buf) => parseAndDedupMolds(buf, molds)}
          onConfirmImport={handleExcelImport}
        />
      )}
    </div>
  );
}
