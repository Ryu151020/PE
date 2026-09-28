import React from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.removeItem("pe_local_db_v2");
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F7FE] p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-line text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-[#2B3674] mb-2">
              Đã xảy ra sự cố hiển thị / 界面加载出错
            </h2>
            <p className="text-sm text-[#707EAE] mb-6">
              Ứng dụng gặp lỗi tạm thời khi hiển thị dữ liệu. Bạn hãy thử tải lại trang hoặc khôi phục dữ liệu.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#4318FF] hover:bg-[#3311CC] text-white rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
              >
                <RefreshCw size={16} /> Tải lại trang / 刷新页面
              </button>
              <button
                onClick={this.handleResetCache}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-[#2B3674] rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                <RotateCcw size={16} /> Khôi phục bộ nhớ đệm / 重置本地缓存
              </button>
            </div>
            {this.state.error?.message && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-mono text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
