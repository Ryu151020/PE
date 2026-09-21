import { Lock, Pencil, Redo2, RefreshCw, Save, Trash2, Undo2, Unlock } from "lucide-react";
import { StatusBadge } from "../ui/Badges";
import { PLAN_STATUS, PLAN_STATUS_COLOR, PLAN_STATUS_DEFS } from "../../lib/constants";
import { btnGhost, btnPrimary, btnSecondary } from "../../lib/styles";

export function ScheduleToolbar({ editable, planStatus, isDirty, canUndo, canRedo, role, onEnterEdit, onSave, onUndo, onRedo, onToggleLock, onGetData, onClearAll }) {
  const isViewer = role === "VIEWER", isLocked = planStatus === PLAN_STATUS.LOCKED;
  const st = PLAN_STATUS_DEFS[planStatus] || PLAN_STATUS_DEFS.DRAFT;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatusBadge vi={st.vi} zh={st.zh} className={PLAN_STATUS_COLOR[planStatus] || PLAN_STATUS_COLOR.DRAFT} />
      {isDirty && <span className="text-xs text-warn">Có thay đổi chưa được lưu / 有未保存的更改</span>}
      <div className="ml-auto flex items-center gap-2">
        {editable && (<>
          <button className={btnGhost} disabled={!canUndo} onClick={onUndo} title="Hoàn tác / 撤销"><Undo2 size={15} /></button>
          <button className={btnGhost} disabled={!canRedo} onClick={onRedo} title="Làm lại / 重做"><Redo2 size={15} /></button>
          <button className={`${btnGhost} text-bad`} onClick={onClearAll} disabled={isLocked || isViewer} title="Xóa toàn bộ kế hoạch / 清空整个计划"><Trash2 size={15} /> Xóa toàn bộ / 清空</button>
        </>)}
        <button className={btnSecondary} onClick={onGetData} disabled={isLocked || isViewer}><RefreshCw size={14} /> Lấy dữ liệu / 获取数据</button>
        {!isViewer && !isLocked && (editable ? (
          <button className={btnPrimary} onClick={onSave}><Save size={14} /> Lưu kế hoạch / 保存</button>
        ) : (
          <button className={btnSecondary} onClick={onEnterEdit}><Pencil size={14} /> Sửa kế hoạch / 编辑</button>
        ))}
        {(role === "ADMIN" || role === "MANAGER") && (
          <button className={btnGhost} onClick={onToggleLock} title={isLocked ? "Mở khóa" : "Khóa kế hoạch"}>{isLocked ? <Unlock size={15} /> : <Lock size={15} />}</button>
        )}
      </div>
    </div>
  );
}
