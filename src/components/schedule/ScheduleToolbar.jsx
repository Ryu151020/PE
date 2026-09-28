import { Lock, Pencil, Redo2, RefreshCw, Save, Trash2, Undo2, Unlock } from "lucide-react";
import { StatusBadge } from "../ui/Badges";
import { useApp } from "../../context/AppContext";
import { PLAN_STATUS, PLAN_STATUS_COLOR, PLAN_STATUS_DEFS } from "../../lib/constants";
import { t } from "../../lib/i18n";
import { btnGhost, btnPrimary, btnSecondary } from "../../lib/styles";

export function ScheduleToolbar({ editable, planStatus, isDirty, canUndo, canRedo, role, onEnterEdit, onSave, onUndo, onRedo, onToggleLock, onGetData, onClearAll }) {
  const { lang = "vi" } = useApp() || {};
  const isViewer = role === "VIEWER", isLocked = planStatus === PLAN_STATUS.LOCKED;
  const st = PLAN_STATUS_DEFS[planStatus] || PLAN_STATUS_DEFS.DRAFT;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatusBadge vi={st.vi} zh={st.zh} className={PLAN_STATUS_COLOR[planStatus] || PLAN_STATUS_COLOR.DRAFT} />
      {isDirty && <span className="text-xs text-warn font-medium">{t("unsavedWarning", lang)}</span>}
      <div className="ml-auto flex items-center gap-2">
        {editable && (<>
          <div className="flex h-10 items-center gap-1 border border-line bg-white px-2.5 rounded-xl shadow-xs">
            <button className="p-1.5 rounded-lg text-body hover:text-brand hover:bg-canvas transition-colors disabled:opacity-40 disabled:hover:text-inherit disabled:hover:bg-transparent" disabled={!canUndo} onClick={onUndo} title={t("undo", lang)}><Undo2 size={15} /></button>
            <button className="p-1.5 rounded-lg text-body hover:text-brand hover:bg-canvas transition-colors disabled:opacity-40 disabled:hover:text-inherit disabled:hover:bg-transparent" disabled={!canRedo} onClick={onRedo} title={t("redo", lang)}><Redo2 size={15} /></button>
          </div>
          <button className={`${btnGhost} text-bad`} onClick={onClearAll} disabled={isLocked || isViewer} title={t("clearAll", lang)}>
            <Trash2 size={15} /> {t("clearAll", lang)}
          </button>
        </>)}
        <button className={btnSecondary} onClick={onGetData} disabled={isLocked || isViewer}>
          <RefreshCw size={14} /> {t("getData", lang)}
        </button>
        {!isViewer && !isLocked && (editable ? (
          <button className={btnPrimary} onClick={onSave}>
            <Save size={14} /> {t("savePlan", lang)}
          </button>
        ) : (
          <button className={btnSecondary} onClick={onEnterEdit}>
            <Pencil size={14} /> {t("editPlan", lang)}
          </button>
        ))}
        {(role === "ADMIN" || role === "MANAGER") && (
          <button className={btnGhost} onClick={onToggleLock} title={isLocked ? t("unlockPlan", lang) : t("lockPlan", lang)}>
            {isLocked ? <Unlock size={15} /> : <Lock size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}
