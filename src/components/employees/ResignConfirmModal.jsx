import { useEffect, useState } from "react";
import { AlertCircle, Calendar, FileText, UserMinus } from "lucide-react";
import { Modal } from "../ui/Overlays";
import { RESIGN_REASONS } from "../../lib/constants";
import { TODAY_KEY } from "../../lib/dates";
import { btnDanger, btnSecondary, inputCls } from "../../lib/styles";
import { getPositionLabel } from "../../lib/i18n";

export function ResignConfirmModal({ employee, onClose, onConfirm, lang = "vi" }) {
  const [resignDate, setResignDate] = useState(TODAY_KEY);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setResignDate(TODAY_KEY);
      setSelectedReason("");
      setCustomReason("");
      setError("");
    }
  }, [employee]);

  if (!employee) return null;

  const handleConfirm = () => {
    let finalReason = selectedReason;
    if (selectedReason === "Khác") {
      finalReason = customReason.trim();
      if (!finalReason) {
        setError(
          lang === "zh"
            ? "请填写具体离职原因"
            : lang === "en"
            ? "Please enter specific reason"
            : "Vui lòng nhập lý do nghỉ việc cụ thể"
        );
        return;
      }
    } else if (!finalReason) {
      setError(
        lang === "zh"
          ? "请选择离职原因"
          : lang === "en"
          ? "Please select a resignation reason"
          : "Vui lòng chọn lý do nghỉ việc"
      );
      return;
    }

    onConfirm({
      resignDate: resignDate || TODAY_KEY,
      resignReason: finalReason,
    });
  };

  return (
    <Modal
      open={!!employee}
      onClose={onClose}
      title={
        lang === "zh"
          ? "确认员工离职 / Lý do nghỉ việc"
          : lang === "en"
          ? "Confirm Resignation"
          : "Xác nhận nhân sự nghỉ việc"
      }
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button type="button" className={btnSecondary} onClick={onClose}>
            {lang === "zh" ? "取消" : lang === "en" ? "Cancel" : "Hủy"}
          </button>
          <button
            type="button"
            className={`${btnDanger} flex items-center gap-1.5 font-bold`}
            onClick={handleConfirm}
          >
            <UserMinus size={15} />
            <span>
              {lang === "zh"
                ? "确认转移至离职名单"
                : lang === "en"
                ? "Confirm & Move to Resigned"
                : "Xác nhận & Chuyển sang Nghỉ việc"}
            </span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-ink">
        {/* Employee Summary Card */}
        <div className="flex items-center gap-3 p-3 rounded-md bg-[#FFF5F5] border border-[#FFD0CE]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EE5D50]/15 text-[#EE5D50] font-bold text-base">
            {employee.vietnameseName ? employee.vietnameseName.split(" ").pop()?.[0] : "E"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink truncate text-[15px]">
              {employee.vietnameseName}
            </div>
            <div className="text-xs text-mute flex items-center gap-2 mt-0.5">
              <span className="font-semibold text-[#4318FF]">{employee.employeeCode}</span>
              {employee.chineseName && <span>· {employee.chineseName}</span>}
              <span>· {getPositionLabel(employee.position, lang)}</span>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 text-xs text-mute bg-canvas p-2.5 rounded-md border border-line">
          <AlertCircle size={15} className="text-warn shrink-0 mt-0.5" />
          <span>
            {lang === "zh"
              ? "选择离职原因后，该员工将被转移至【离职名单】，并不再出现在排班候选人列表中。"
              : "Sau khi xác nhận, nhân sự sẽ được lưu lý do nghỉ việc, chuyển sang mục 【Nghỉ việc】 và không còn xuất hiện trong danh sách sắp đơn/sắp ca mới."}
          </span>
        </div>

        {/* Date Field */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Calendar size={13} className="text-mute" />
            <span>
              {lang === "zh" ? "离职日期 / Ngày rời đi" : "Ngày rời đi (Nghỉ việc)"}:
            </span>
          </label>
          <input
            type="date"
            className={`${inputCls} font-medium`}
            value={resignDate}
            onChange={(e) => setResignDate(e.target.value)}
          />
        </div>

        {/* Reason Field */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
            <FileText size={13} className="text-mute" />
            <span>
              {lang === "zh" ? "离职原因 / Lý do nghỉ việc" : "Lý do nghỉ việc"}:
            </span>
            <span className="text-bad font-bold">*</span>
          </label>
          <select
            autoFocus
            className={`${inputCls} font-medium`}
            value={selectedReason}
            onChange={(e) => {
              setSelectedReason(e.target.value);
              setError("");
              if (e.target.value === "Khác") {
                setCustomReason("");
              }
            }}
          >
            <option value="">
              — {lang === "zh" ? "请选择离职原因" : lang === "en" ? "Select Reason" : "Chọn lý do nghỉ việc"} —
            </option>
            {RESIGN_REASONS.map((r) => (
              <option key={r.vi} value={r.vi}>
                {r.vi} {r.zh ? `(${r.zh})` : ""}
              </option>
            ))}
          </select>

          {/* Quick reason chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {RESIGN_REASONS.filter((r) => r.vi !== "Khác").slice(0, 4).map((r) => (
              <button
                key={r.vi}
                type="button"
                onClick={() => {
                  setSelectedReason(r.vi);
                  setError("");
                }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  selectedReason === r.vi
                    ? "bg-[#4318FF] text-white border-[#4318FF]"
                    : "bg-white text-mute border-line hover:border-[#4318FF] hover:text-[#4318FF]"
                }`}
              >
                {r.vi}
              </button>
            ))}
          </div>

          {/* Custom Reason Input if 'Khác' selected */}
          {selectedReason === "Khác" && (
            <div className="mt-2.5 animate-in fade-in">
              <label className="mb-1 block text-xs font-medium text-mute">
                {lang === "zh" ? "请输入具体原因:" : "Nhập lý do cụ thể:"}
              </label>
              <input
                autoFocus
                className={inputCls}
                placeholder={
                  lang === "zh"
                    ? "请输入具体原因..."
                    : "Nhập lý do nghỉ việc cụ thể..."
                }
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setError("");
                }}
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-bad mt-1.5 font-medium flex items-center gap-1">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
