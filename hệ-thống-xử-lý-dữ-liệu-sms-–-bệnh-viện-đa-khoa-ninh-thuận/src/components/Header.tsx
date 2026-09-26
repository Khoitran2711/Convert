import React from 'react';
import { Sun, Moon, ExternalLink, Activity, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleTheme,
  isProcessing,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M2 12h20" />
              <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                Hệ thống Xử lý Dữ liệu SMS
              </span>
              <span className="hidden items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span>Bệnh viện Đa khoa Ninh Thuận</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chuẩn hóa SĐT · Phân loại nhà mạng · Xuất file ZIP SMS Brandname
            </p>
          </div>
        </div>

        {/* Zone 2 & 3: Status indicator + Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Dot with subtle pulse */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="relative flex h-2 w-2">
              {isProcessing ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              )}
            </span>
            <span className="font-mono text-xs">
              {isProcessing ? 'Đang xử lý...' : 'Sẵn sàng'}
            </span>
          </div>

          {/* Quick link to VNPT SMS Brandname Portal */}
          <a
            href="https://ads-new.vinaphone.com.vn/Agent/Login.aspx"
            target="_blank"
            rel="noopener noreferrer"
            title="Đăng nhập cổng gửi tin SMS Brandname VNPT"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Cổng SMS Brandname</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={darkMode ? 'Đang ở chế độ Tối (Nhấp để chuyển sang giao diện Sáng)' : 'Đang ở chế độ Sáng (Nhấp để chuyển sang giao diện Tối)'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-xs"
          >
            {darkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-200" />
                <span className="hidden sm:inline text-amber-300">Tối</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-600 animate-in spin-in-180 duration-200" />
                <span className="hidden sm:inline text-slate-700">Sáng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
