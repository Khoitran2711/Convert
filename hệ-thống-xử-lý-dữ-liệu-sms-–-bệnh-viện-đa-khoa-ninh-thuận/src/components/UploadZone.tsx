import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, Sparkles, CheckCircle2, X } from 'lucide-react';

interface UploadZoneProps {
  activeTab: 'link' | 'vaccine';
  fileName: string | null;
  rowCount: number;
  isProcessing: boolean;
  onFileSelect: (file: File) => void;
  onLoadSample: () => void;
  onDownloadTemplate: () => void;
  onClear: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  activeTab,
  fileName,
  rowCount,
  isProcessing,
  onFileSelect,
  onLoadSample,
  onDownloadTemplate,
  onClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isValidExcelFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (isValidExcelFile(file)) {
        onFileSelect(file);
      }
      e.target.value = '';
    }
  };

  const isValidExcelFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext === 'xlsx' || ext === 'xls' || ext === 'csv';
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Compact Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`relative flex items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 cursor-pointer transition-all duration-150 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
            : fileName
            ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-blue-400'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          disabled={isProcessing}
          onChange={handleInputChange}
        />

        {fileName ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {fileName}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  {rowCount} dòng dữ liệu
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nhấp hoặc kéo thả file khác vào đây để thay thế file hiện tại
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Kéo thả file Excel vào đây hoặc <span className="text-blue-600 dark:text-blue-400 underline">chọn file (.xlsx, .xls, .csv)</span>
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeTab === 'link' ? (
                  <span>
                    Cột yêu cầu: <strong className="font-mono text-slate-700 dark:text-slate-300">HoTen</strong>, <strong className="font-mono text-slate-700 dark:text-slate-300">SoDT</strong>, <strong className="font-mono text-slate-700 dark:text-slate-300">Link goc</strong>
                  </span>
                ) : (
                  <span>
                    Hệ thống tự động lấy: <strong className="text-slate-700 dark:text-slate-300">Cột B</strong> (Họ tên), <strong className="text-slate-700 dark:text-slate-300">Cột F</strong> (SĐT), <strong className="text-slate-700 dark:text-slate-300">Cột H</strong> (Vaccine), <strong className="text-slate-700 dark:text-slate-300">Cột I</strong> (Ngày hẹn)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Small quick action buttons inside / adjacent to drop area */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
            title="Tải file mẫu Excel chuẩn"
          >
            <Download className="h-3 w-3" />
            <span>Mẫu Excel</span>
          </button>

          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-300 rounded-md border border-blue-200/80 dark:border-blue-900 shadow-2xs transition-colors"
            title="Nạp ngay dữ liệu mẫu để thử nghiệm nhanh"
          >
            <Sparkles className="h-3 w-3 text-blue-500" />
            <span>Thử mẫu</span>
          </button>

          {fileName && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Xóa danh sách này"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
