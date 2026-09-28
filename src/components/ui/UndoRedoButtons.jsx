import React from "react";
import { Redo2, Undo2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { t } from "../../lib/i18n";

export function UndoRedoButtons({ canUndo, canRedo, onUndo, onRedo }) {
  const { lang = "vi" } = useApp() || {};
  return (
    <div className="flex h-10 items-center gap-1 border border-line/80 bg-white px-2 rounded-full shadow-xs">
      <button
        type="button"
        className="w-7 h-7 flex items-center justify-center rounded-full text-body hover:text-brand hover:bg-[#F4F7FE] transition-colors disabled:opacity-30 disabled:hover:text-inherit disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
        disabled={!canUndo}
        onClick={onUndo}
        title={t("undo", lang)}
      >
        <Undo2 size={15} />
      </button>
      <div className="w-[1px] h-4 bg-line" />
      <button
        type="button"
        className="w-7 h-7 flex items-center justify-center rounded-full text-body hover:text-brand hover:bg-[#F4F7FE] transition-colors disabled:opacity-30 disabled:hover:text-inherit disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
        disabled={!canRedo}
        onClick={onRedo}
        title={t("redo", lang)}
      >
        <Redo2 size={15} />
      </button>
    </div>
  );
}
