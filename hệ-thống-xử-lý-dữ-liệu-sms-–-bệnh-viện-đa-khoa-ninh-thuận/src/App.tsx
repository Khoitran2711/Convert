import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { StatsBar } from './components/StatsBar';
import { LinkShortenerTab } from './components/LinkShortenerTab';
import { VaccineTab } from './components/VaccineTab';
import { ToastContainer } from './components/ToastContainer';
import {
  LinkItem,
  VaccineItem,
  Carrier,
  ToastMessage,
  AppSettings,
} from './types';
import {
  parseExcelFile,
  mapRawToLinkItems,
  mapRawToVaccineItems,
  downloadLinkSampleTemplate,
  downloadVaccineSampleTemplate,
  generateSampleLinkItems,
  generateSampleVaccineItems,
} from './utils/excel';
import { Link2, Syringe } from 'lucide-react';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('bvdk_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bvdk_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bvdk_theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  // Tabs: 'link' | 'vaccine'
  const [activeTab, setActiveTab] = useState<'link' | 'vaccine'>('link');

  // Datasets
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [linkFileName, setLinkFileName] = useState<string | null>(null);

  const [vaccineItems, setVaccineItems] = useState<VaccineItem[]>([]);
  const [vaccineFileName, setVaccineFileName] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Active Carrier Filter for Stats
  const [carrierFilter, setCarrierFilter] = useState<Carrier | 'all'>('all');

  // Settings
  const [settings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('bvdk_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      shortenService: 'tinyurl',
      smsBrandnameUrl: 'https://ads-new.vinaphone.com.vn/Agent/Login.aspx',
      autoNormalizeOnUpload: true,
      batchSize: 4,
      exportHeaderStyle: 'tieng_viet',
    };
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Upload handler
  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      const parsed = await parseExcelFile(file);

      if (parsed.objects.length === 0 && parsed.sheet2D.length === 0) {
        throw new Error('File không chứa dòng dữ liệu nào.');
      }

      if (activeTab === 'link') {
        const mapped = mapRawToLinkItems(parsed.objects);
        setLinkItems(mapped);
        setLinkFileName(file.name);
        setCarrierFilter('all');
        addToast({
          type: 'success',
          title: 'Đã tải file Excel thành công',
          message: `Đã nạp ${mapped.length} dòng dữ liệu cho chức năng Rút gọn link.`,
        });
      } else if (activeTab === 'vaccine') {
        const mapped = mapRawToVaccineItems(parsed);
        setVaccineItems(mapped);
        setVaccineFileName(file.name);
        setCarrierFilter('all');
        addToast({
          type: 'success',
          title: 'Đã tải file Excel thành công',
          message: `Đã nạp ${mapped.length} dòng dữ liệu tiêm chủng (Cột B: Họ tên, Cột F: Số ĐT, Cột H: Vaccine, Cột I: Ngày hẹn).`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Không thể đọc file Excel',
        message: err.message || 'Kiểm tra lại cấu trúc file và thử lại.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Sample data loaders
  const handleLoadSample = () => {
    if (activeTab === 'link') {
      const samples = generateSampleLinkItems();
      setLinkItems(samples);
      setLinkFileName('Du_Lieu_Mau_Link_NinhThuan.xlsx');
      setCarrierFilter('all');
      addToast({
        type: 'info',
        title: 'Đã nạp dữ liệu mẫu',
        message: `Đã tải 8 dòng mẫu hồ sơ bệnh nhân Bệnh viện Ninh Thuận kèm link Drive.`,
      });
    } else if (activeTab === 'vaccine') {
      const samples = generateSampleVaccineItems();
      setVaccineItems(samples);
      setVaccineFileName('Du_Lieu_Mau_Vaccine_NinhThuan.xlsx');
      setCarrierFilter('all');
      addToast({
        type: 'info',
        title: 'Đã nạp dữ liệu mẫu',
        message: `Đã tải 8 dòng mẫu lịch hẹn tiêm chủng vắc xin theo đúng cột B, F, H, I.`,
      });
    }
  };

  // Clear data
  const handleClearCurrent = () => {
    if (activeTab === 'link') {
      setLinkItems([]);
      setLinkFileName(null);
      setCarrierFilter('all');
      addToast({
        type: 'info',
        title: 'Đã xóa dữ liệu',
        message: 'Đã dọn sạch bảng dữ liệu rút gọn link.',
      });
    } else if (activeTab === 'vaccine') {
      setVaccineItems([]);
      setVaccineFileName(null);
      setCarrierFilter('all');
      addToast({
        type: 'info',
        title: 'Đã xóa dữ liệu',
        message: 'Đã dọn sạch bảng dữ liệu tiêm chủng vắc xin.',
      });
    }
  };

  // Compute statistics for current active tab
  const stats = React.useMemo(() => {
    const isLink = activeTab === 'link';
    const currentList = isLink ? linkItems : vaccineItems;
    const total = currentList.length;

    let validCount = 0;
    let errorCount = 0;
    let shortenedCount = 0;

    const carrierCounts: Record<Carrier, number> = {
      Viettel: 0,
      VinaPhone: 0,
      MobiFone: 0,
      Vietnamobile: 0,
      Gmobile: 0,
      Itelecom: 0,
      Wintel: 0,
      Khác: 0,
      'Không hợp lệ': 0,
    };

    currentList.forEach((item) => {
      if (item.isValidPhone) {
        validCount++;
      } else {
        errorCount++;
      }

      if (item.carrier in carrierCounts) {
        carrierCounts[item.carrier]++;
      } else {
        carrierCounts['Khác']++;
      }

      if (isLink && (item as LinkItem).status === 'success') {
        shortenedCount++;
      }
    });

    return {
      total,
      validCount,
      errorCount,
      carrierCounts,
      shortenedCount,
    };
  }, [activeTab, linkItems, vaccineItems]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <Header
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        isProcessing={isProcessing}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* Navigation Tabs with Badges - Centered and High Focus */}
        <div className="mb-6 flex flex-col items-center justify-center gap-2.5">
          <div className="w-full max-w-2xl p-1.5 sm:p-2 rounded-2xl bg-slate-200/90 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none flex items-center gap-2">
            {/* Tab 1: Rút gọn link */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('link');
                setCarrierFilter('all');
              }}
              className={`flex-1 flex items-center justify-center gap-2.5 px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/40 scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Link2 className={`h-4.5 w-4.5 ${activeTab === 'link' ? 'animate-pulse' : ''}`} />
              <span className="tracking-tight">1. RÚT GỌN LINK & SĐT</span>
              {linkItems.length > 0 && (
                <span
                  className={`ml-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-extrabold ${
                    activeTab === 'link'
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {linkItems.length}
                </span>
              )}
            </button>

            {/* Tab 2: Xử lý Vaccine */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('vaccine');
                setCarrierFilter('all');
              }}
              className={`flex-1 flex items-center justify-center gap-2.5 px-4 sm:px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                activeTab === 'vaccine'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40 scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/70'
              }`}
            >
              <Syringe className={`h-4.5 w-4.5 ${activeTab === 'vaccine' ? 'animate-pulse' : ''}`} />
              <span className="tracking-tight">2. XỬ LÝ VACCINE TIÊM CHỦNG</span>
              {vaccineItems.length > 0 && (
                <span
                  className={`ml-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-extrabold ${
                    activeTab === 'vaccine'
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {vaccineItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Centered Descriptive Micro-Kicker */}
          <div className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            {activeTab === 'link' && (
              <span>🔗 Chuẩn hóa SĐT đầu 84 · Phân loại nhà mạng viễn thông · Rút gọn link Google Drive sang file ZIP</span>
            )}
            {activeTab === 'vaccine' && (
              <span>💉 Tự động lấy Cột B (Họ tên không dấu), Cột F (SĐT 84), Cột H (Vaccine dấu phẩy), Cột I (Ngày hẹn)</span>
            )}
          </div>
        </div>

        {/* Dynamic Body Content based on Tab */}
        <div className="space-y-5">
          {/* Upload Zone */}
          <UploadZone
            activeTab={activeTab}
            fileName={activeTab === 'link' ? linkFileName : vaccineFileName}
            rowCount={activeTab === 'link' ? linkItems.length : vaccineItems.length}
            isProcessing={isProcessing}
            onFileSelect={handleFileSelect}
            onLoadSample={handleLoadSample}
            onDownloadTemplate={
              activeTab === 'link'
                ? downloadLinkSampleTemplate
                : downloadVaccineSampleTemplate
            }
            onClear={handleClearCurrent}
          />

          {/* Stats Dashboard */}
          {stats.total > 0 && (
            <StatsBar
              total={stats.total}
              validCount={stats.validCount}
              errorCount={stats.errorCount}
              carrierCounts={stats.carrierCounts}
              activeCarrierFilter={carrierFilter}
              onSelectCarrierFilter={(carrier) => setCarrierFilter(carrier)}
              shortenedCount={stats.shortenedCount}
              isLinkTab={activeTab === 'link'}
            />
          )}

          {/* Tab 1: Link Shortener Table */}
          {activeTab === 'link' && (
            <LinkShortenerTab
              items={linkItems}
              setItems={setLinkItems}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              addToast={addToast}
              activeCarrierFilter={carrierFilter}
              setActiveCarrierFilter={setCarrierFilter}
              headerStyle={settings.exportHeaderStyle || 'tieng_viet'}
            />
          )}

          {/* Tab 2: Vaccine Table */}
          {activeTab === 'vaccine' && (
            <VaccineTab
              items={vaccineItems}
              setItems={setVaccineItems}
              isProcessing={isProcessing}
              addToast={addToast}
              activeCarrierFilter={carrierFilter}
              setActiveCarrierFilter={setCarrierFilter}
              smsBrandnameUrl={settings.smsBrandnameUrl}
              headerStyle={settings.exportHeaderStyle || 'tieng_viet'}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Hệ thống Xử lý Dữ liệu SMS · Bệnh viện Đa khoa Ninh Thuận
          </div>
          <div className="text-[11px] text-slate-400">
            Hỗ trợ mạng Viettel, VinaPhone, MobiFone, Vietnamobile · Chuẩn hóa SĐT quốc tế 84
          </div>
        </div>
      </footer>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
