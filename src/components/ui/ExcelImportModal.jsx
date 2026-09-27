import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { Bi } from "./Bi";
import { Modal } from "./Overlays";
import { btnPrimary, btnSecondary } from "../../lib/styles";

export function ExcelImportModal({
  open,
  onClose,
  titleVi,
  titleZh,
  onDownloadTemplate,
  onParseFile,
  onConfirmImport,
}) {
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const parsed = onParseFile(buffer);
      setResult(parsed);
      setFileName(file.name);
    } catch (err) {
      setResult({ error: "Không thể đọc file. Vui lòng kiểm tra định dạng Excel!" });
    }
    e.target.value = "";
  };

  const handleApply = () => {
    if (result && result.added && result.added.length > 0) {
      onConfirmImport(result.added);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${titleVi} / ${titleZh}`}
      wide
      footer={
        <div className="flex items-center justify-end gap-2 text-sm">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Hủy / 取消
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!result || !result.addedCount}
            onClick={handleApply}
          >
            Xác nhận thêm mới / 确认导入
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-ink">
        <div className="flex items-center justify-between gap-3 p-3 bg-canvas border border-line rounded-xs">
          <div>
            <div className="font-bold text-ink text-sm">File Excel mẫu / 示例文件</div>
            <div className="text-sm text-mute">
              Tải file mẫu có sẵn tiêu đề cột và 1 dòng dữ liệu ví dụ để điền chính xác.
            </div>
          </div>
          <button
            type="button"
            className={`${btnSecondary} shrink-0 text-sm`}
            onClick={onDownloadTemplate}
          >
            <Download size={14} /> Tải file mẫu / 下载模板
          </button>
        </div>

        <div className="border border-dashed border-line p-5 text-center rounded-xs bg-white">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <FileSpreadsheet size={32} className="mx-auto mb-2 text-[#2051A3]" />
          <p className="text-sm font-medium text-ink mb-1">
            {fileName ? fileName : "Chọn file Excel để tải lên / 选择 Excel 文件"}
          </p>
          <p className="text-sm text-mute mb-3">
            Hệ thống sẽ tự động đối soát: dòng trùng lặp sẽ bị bỏ qua, chỉ thêm dòng mới.
          </p>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} /> Chọn file / 选择文件
          </button>
        </div>

        {result && (
          <div className="p-3 border border-line bg-canvas rounded-xs space-y-2 text-sm">
            {result.error ? (
              <div className="text-bad font-medium">{result.error}</div>
            ) : (
              <>
                <div className="font-bold text-ink">Kết quả kiểm tra dữ liệu / 检查结果:</div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-ok font-medium">
                    Thêm mới hợp lệ: <strong>{result.addedCount}</strong> dòng
                  </span>
                  <span className="text-mute">
                    Bỏ qua do trùng lặp: <strong>{result.skippedCount}</strong> dòng
                  </span>
                </div>
                {result.addedCount === 0 && (
                  <div className="text-warn text-sm">
                    Tất cả các dòng trong file đều đã tồn tại hoặc không hợp lệ. Không có dữ liệu mới để thêm.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
