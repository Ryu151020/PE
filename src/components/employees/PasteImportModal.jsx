import { useState } from "react";
import { Modal } from "../ui/Overlays";
import { EMP_STATUS, EMP_STATUS_DEFS, POSITION_LIST } from "../../lib/constants";
import { parseCsvText } from "../../lib/excel";
import { btnPrimary, btnSecondary, inputCls } from "../../lib/styles";

export function PasteImportModal({ open, onClose, onImport, existingCodes }) {
  const [text, setText] = useState(""); const [preview, setPreview] = useState([]); const [errors, setErrors] = useState([]);
  const parse = () => {
    const rows = parseCsvText(text); const seen = new Set(); const result = []; const errs = [];
    rows.forEach((cells, i) => {
      const [code, vn, cn, birth, phone, joinRaw, position, statusRaw] = cells.map((c) => (c || "").trim());
      if (!code || !vn) { errs.push(`Dòng ${i + 1}: thiếu Mã NV hoặc Tên.`); return; }
      if (existingCodes.includes(code) || seen.has(code)) { errs.push(`Dòng ${i + 1}: mã "${code}" đã tồn tại.`); return; }
      seen.add(code);
      const [d, m, y] = (joinRaw || "").split("/");
      const joinDate = d && m && y ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
      result.push({ id: code, employeeCode: code, vietnameseName: vn, chineseName: cn || "", birthYear: Number(birth) || 2000, phone: phone || "", address: "", joinDate, resignDate: null, resignReason: "", position: POSITION_LIST.includes(position) ? position : POSITION_LIST[0], status: EMP_STATUS_DEFS.some((s) => s.vi === statusRaw) ? statusRaw : EMP_STATUS.OFFICIAL, notes: "" });
    });
    setPreview(result); setErrors(errs);
  };
  return (
    <Modal open={open} onClose={onClose} title="Dán dữ liệu từ Excel / 从 Excel 粘贴数据" wide footer={<><button className={btnSecondary} onClick={onClose}>Hủy</button>{preview.length > 0 ? <button className={btnPrimary} onClick={() => { onImport(preview); setText(""); setPreview([]); setErrors([]); onClose(); }}>Thêm {preview.length} nhân sự</button> : <button className={btnPrimary} onClick={parse}>Xem trước</button>}</>}>
      <div className="space-y-3">
        <p className="text-xs text-body">Thứ tự cột: Mã NV, Tên VN, Tên Trung, Năm sinh, SĐT, Ngày vào làm (dd/mm/yyyy), Vị trí, Trạng thái (Chính thức/Thời vụ/Đã nghỉ việc).</p>
        <textarea className={`${inputCls} font-mono`} rows={6} placeholder={"NV059\tNguyễn Văn X\t阮文X\t1998\t0987654321\t01/02/2025\tCông nhân\tChính thức"} value={text} onChange={(e) => { setText(e.target.value); setPreview([]); setErrors([]); }} />
        {errors.length > 0 && <div className="rad-14 bg-bad-tint p-2 text-xs text-bad space-y-0.5">{errors.map((e, i) => <div key={i}>{e}</div>)}</div>}
        {preview.length > 0 && (<div className="overflow-y-auto rad-14 border border-line" style={{ maxHeight: 190 }}><table className="w-full text-xs"><thead className="pe-thead sticky top-0 "><tr><th className="px-2 py-1 text-left">Mã NV</th><th className="px-2 py-1 text-left">Tên</th><th className="px-2 py-1 text-left">Vị trí</th></tr></thead><tbody>{preview.map((p) => (<tr key={p.id} className="border-t border-line"><td className="px-2 py-1">{p.employeeCode}</td><td className="px-2 py-1">{p.vietnameseName}</td><td className="px-2 py-1">{p.position}</td></tr>))}</tbody></table></div>)}
      </div>
    </Modal>
  );
}
