import { Lock, RefreshCw, Trash2, Unlock } from "lucide-react";
import { UndoRedoButtons } from "../ui/UndoRedoButtons";
import { useApp } from "../../context/AppContext";
import { PLAN_STATUS, PLAN_STATUS_DEFS } from "../../lib/constants";
import { t } from "../../lib/i18n";

export function ScheduleToolbar({ editable, planStatus, canUndo, canRedo, role, onUndo, onRedo, onToggleLock, onGetData, onClearAll }) {
  const { lang = "vi" } = useApp() || {};
  const isViewer = role === "VIEWER", isLocked = planStatus === PLAN_STATUS.LOCKED;
  const st = PLAN_STATUS_DEFS[planStatus] || PLAN_STATUS_DEFS.SAVED;

  const statusStyles = {
    [PLAN_STATUS.SAVED]: "bg-[#E6FAF5] text-[#05CD99] border-[#05CD99]/25",
    [PLAN_STATUS.LOCKED]: "bg-[#F4F7FE] text-[#4318FF] border-[#4318FF]/25",
    [PLAN_STATUS.DRAFT]: "bg-canvas text-mute border-line",
  };
  const dotColor = {
    [PLAN_STATUS.SAVED]: "bg-[#05CD99]",
    [PLAN_STATUS.LOCKED]: "bg-[#4318FF]",
    [PLAN_STATUS.DRAFT]: "bg-mute",
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
      <div className={`flex items-center gap-1.5 h-10 px-3.5 rounded-full text-xs font-bold border shadow-xs ${statusStyles[planStatus] || statusStyles[PLAN_STATUS.SAVED]}`}>
        <span className={`w-2 h-2 rounded-full ${dotColor[planStatus] || dotColor[PLAN_STATUS.SAVED]}`} />
        <span>{lang === "zh" ? st.zh : lang === "en" ? (st.en || st.vi) : st.vi}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {editable && (
          <>
            <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
            <button
              className="h-10 px-4 rounded-full bg-[#FFF5F5] hover:bg-[#FFEAE8] text-[#EE5D50] border border-[#EE5D50]/20 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={onClearAll}
              disabled={isLocked || isViewer}
              title={t("clearAll", lang)}
            >
              <Trash2 size={14} />
              <span>{t("clearAll", lang)}</span>
            </button>
          </>
        )}
        <button
          className="h-10 px-4 rounded-full bg-[#F4F7FE] hover:bg-[#E9EDF7] text-[#4318FF] border border-line/70 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={onGetData}
          disabled={isLocked || isViewer}
        >
          <RefreshCw size={14} />
          <span>{t("getData", lang)}</span>
        </button>
        {(role === "ADMIN" || role === "MANAGER") && (
          <button
            className="w-10 h-10 rounded-full bg-white border border-line/80 hover:bg-[#F4F7FE] hover:text-[#4318FF] text-body flex items-center justify-center transition-all shadow-xs cursor-pointer"
            onClick={onToggleLock}
            title={isLocked ? t("unlockPlan", lang) : t("lockPlan", lang)}
          >
            {isLocked ? <Unlock size={15} /> : <Lock size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}
