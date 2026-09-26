import React, { useState, useMemo } from 'react';
import { VaccineItem, Carrier, ToastMessage } from '../types';
import { CARRIER_META, formatPhone } from '../utils/phone';
import { cleanVaccineName, removeVietnameseDiacritics } from '../utils/vietnamese';
import { exportVaccineZip, exportExcelFile } from '../utils/excel';
import { ColumnFilterInput } from './ColumnFilterInput';
import {
  Syringe,
  Archive,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FilterX,
  Edit2,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface VaccineTabProps {
  items: VaccineItem[];
  setItems: React.Dispatch<React.SetStateAction<VaccineItem[]>>;
  isProcessing: boolean;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  activeCarrierFilter: Carrier | 'all';
  setActiveCarrierFilter: (carrier: Carrier | 'all') => void;
  smsBrandnameUrl: string;
  headerStyle?: 'tieng_viet' | 'khong_dau';
}

export const VaccineTab: React.FC<VaccineTabProps> = ({
  items,
  setItems,
  isProcessing,
  addToast,
  activeCarrierFilter,
  setActiveCarrierFilter,
  smsBrandnameUrl,
  headerStyle = 'tieng_viet',
}) => {
  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterVaccine, setFilterVaccine] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Preview toggle: show unaccented SMS format vs original
  const [showSMSFormat, setShowSMSFormat] = useState(true);

  // Inline editing phone
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [tempPhone, setTempPhone] = useState<string>('');

  const hasActiveFilters = Boolean(
    filterName ||
    filterPhone ||
    filterVaccine ||
    filterDate ||
    (activeCarrierFilter && activeCarrierFilter !== 'all') ||
    (filterStatus && filterStatus !== 'all')
  );

  const clearAllFilters = () => {
    setFilterName('');
    setFilterPhone('');
    setFilterVaccine('');
    setFilterDate('');
    setActiveCarrierFilter('all');
    setFilterStatus('all');
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterName) {
        const query = filterName.toLowerCase();
        const unaccentedQuery = removeVietnameseDiacritics(query);
        if (
          !item.hoTen.toLowerCase().includes(query) &&
          !item.hoTenKhongDau.toLowerCase().includes(unaccentedQuery)
        ) {
          return false;
        }
      }
      if (filterPhone) {
        const cleanSearch = filterPhone.replace(/\D/g, '');
        if (cleanSearch) {
          if (!item.formattedPhone.includes(cleanSearch) && !item.rawPhone.includes(cleanSearch)) {
            return false;
          }
        } else if (!item.formattedPhone.includes(filterPhone) && !item.rawPhone.includes(filterPhone)) {
          return false;
        }
      }
      if (activeCarrierFilter !== 'all' && item.carrier !== activeCarrierFilter) {
        return false;
      }
      if (filterVaccine) {
        const query = filterVaccine.toLowerCase();
        const unaccentedQuery = removeVietnameseDiacritics(query);
        if (
          !item.vacXin.toLowerCase().includes(query) &&
          !item.vacXinKhongDau.toLowerCase().includes(unaccentedQuery)
        ) {
          return false;
        }
      }
      if (filterDate && !item.ngayHen.toLowerCase().includes(filterDate.toLowerCase())) {
        return false;
      }
      if (filterStatus !== 'all') {
        if (filterStatus === 'valid' && !item.isValidPhone) return false;
        if (filterStatus === 'invalid' && item.isValidPhone) return false;
      }
      return true;
    });
  }, [items, filterName, filterPhone, activeCarrierFilter, filterVaccine, filterDate, filterStatus]);

  // Selection
  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((i) => i.selected);
  const selectedCount = items.filter((i) => i.selected).length;

  const toggleSelectAll = () => {
    const targetState = !allFilteredSelected;
    const filteredIds = new Set(filteredItems.map((i) => i.id));
    setItems((prev) =>
      prev.map((item) => (filteredIds.has(item.id) ? { ...item, selected: targetState } : item))
    );
  };

  const toggleSelectItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Re-run batch normalization on all items
  const handleReNormalizeAll = () => {
    setItems((prev) =>
      prev.map((item) => {
        const phoneValidation = formatPhone(item.rawPhone || item.formattedPhone);
        const hoTenKhongDau = removeVietnameseDiacritics(item.hoTen);
        const vacXinKhongDau = cleanVaccineName(item.vacXin);
        const isValid = phoneValidation.isValid && !!item.hoTen && !!item.vacXin;

        return {
          ...item,
          formattedPhone: phoneValidation.formatted,
          carrier: phoneValidation.carrier,
          isValidPhone: phoneValidation.isValid,
          phoneError: phoneValidation.error,
          hoTenKhongDau,
          vacXinKhongDau,
          status: isValid ? 'valid' : 'invalid',
        };
      })
    );

    addToast({
      type: 'success',
      title: 'Đã hoàn tất chuẩn hóa',
      message: 'Toàn bộ họ tên và vắc xin đã được chuyển sang chuẩn SMS không dấu.',
    });
  };

  // Inline edit phone save
  const handleSavePhone = (id: string) => {
    const validation = formatPhone(tempPhone);
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const isValid = validation.isValid && !!i.hoTen && !!i.vacXin;
          return {
            ...i,
            rawPhone: tempPhone,
            formattedPhone: validation.formatted,
            carrier: validation.carrier,
            isValidPhone: validation.isValid,
            phoneError: validation.error,
            status: isValid ? 'valid' : 'invalid',
          };
        }
        return i;
      })
    );
    setEditingPhoneId(null);
    setTempPhone('');
  };

  // Export ZIP according to SMS system code standard:
  // 1.xlsx (VinaPhone), 2.xlsx (MobiFone), 3.xlsx (Viettel), 4.xlsx (Vietnamobile)
  const handleExportZip = async () => {
    if (items.length === 0) return;
    try {
      await exportVaccineZip(
        items,
        `BVDK_NinhThuan_SMS_Vaccine_${new Date().toISOString().slice(0, 10)}.zip`,
        headerStyle
      );
      addToast({
        type: 'success',
        title: 'Đã xuất gói ZIP thành công',
        message: 'File đã được đặt tên chuẩn hệ thống SMS: 1.xlsx (VinaPhone), 2.xlsx (MobiFone), 3.xlsx (Viettel), 4.xlsx (Vietnamobile).',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi xuất file ZIP',
        message: err.message,
      });
    }
  };

  // Export Excel Full (Chuẩn 4 cột theo quy định SMS)
  const handleExportExcel = () => {
    if (items.length === 0) return;
    const phoneHeader = headerStyle === 'khong_dau' ? 'SoDT' : 'Số điện thoại';
    const nameHeader = headerStyle === 'khong_dau' ? 'HoTen' : 'Họ tên';
    const vaccineHeader = 'Vaccine';
    const dateHeader = headerStyle === 'khong_dau' ? 'NgayTaiKham' : 'Ngày tái khám';

    const validItems = items.filter((i) => i.isValidPhone);
    const exportRows = (validItems.length > 0 ? validItems : items).map((item) => ({
      [phoneHeader]: item.formattedPhone,
      [nameHeader]: item.hoTenKhongDau,
      [vaccineHeader]: item.vacXinKhongDau,
      [dateHeader]: item.ngayHen,
    }));

    exportExcelFile(
      exportRows,
      `BVDK_NinhThuan_TongHop_Vaccine_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'DanhSachVaccine'
    );

    addToast({
      type: 'success',
      title: 'Đã xuất file Excel',
      message: 'Danh sách tiêm chủng vắc xin (4 cột chuẩn) đã được lưu.',
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3">
          <Syringe className="h-7 w-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Chưa có dữ liệu danh sách Tiêm chủng Vaccine
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Vui lòng tải lên file báo cáo tiêm chủng chứa các cột <span className="font-mono text-xs font-semibold">Họ tên</span>, <span className="font-mono text-xs font-semibold">Điện thoại</span>, <span className="font-mono text-xs font-semibold">Vaccine</span>, và <span className="font-mono text-xs font-semibold">Ngày tái khám</span> ở phía trên.
        </p>
      </div>
    );
  }

  const validCount = items.filter((i) => i.isValidPhone).length;

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          {/* Re-normalize button */}
          <button
            type="button"
            onClick={handleReNormalizeAll}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Chuẩn hóa lại bỏ dấu họ tên và thay dấu chấm vắc xin"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Tự động chuẩn hóa lại</span>
          </button>

          {/* Toggle format: SMS non-accent vs Original */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setShowSMSFormat(true)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                showSMSFormat
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Chuẩn SMS (Không dấu)
            </button>
            <button
              type="button"
              onClick={() => setShowSMSFormat(false)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                !showSMSFormat
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Bản gốc (Có dấu)
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export ZIP with SMS naming convention */}
          <button
            type="button"
            onClick={handleExportZip}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs shadow-blue-500/20 transition-all"
            title="Xuất file ZIP chứa 1.xlsx (VinaPhone), 2.xlsx (MobiFone), 3.xlsx (Viettel), 4.xlsx (Vietnamobile) - Chỉ gồm 4 cột chuẩn"
          >
            <Archive className="h-4 w-4" />
            <span>Xuất file ZIP Vaccine (4 cột chuẩn)</span>
          </button>

          {/* Export Excel Full */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Xuất danh sách gồm đúng 4 cột: Số điện thoại, Họ tên, Vaccine, Ngày tái khám"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Xuất Excel tổng (4 cột)</span>
          </button>

          {/* Open SMS Brandname portal button */}
          <a
            href={smsBrandnameUrl || 'https://ads-new.vinaphone.com.vn/Agent/Login.aspx'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-lg transition-colors"
            title="Mở cổng gửi tin SMS Brandname VNPT"
          >
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Cổng SMS VNPT</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* Info notification about SMS Brandname file naming and 4 columns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-200">
        <div>
          <span className="font-semibold">Quy cách file nhà mạng: </span>
          <span className="text-slate-700 dark:text-slate-300">
            Chỉ gồm 4 cột: <strong>Số điện thoại (đầu 84)</strong>, <strong>Họ tên (không dấu)</strong>, <strong>Vaccine</strong>, <strong>Ngày tái khám</strong>.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
          <span><strong>1.xlsx</strong>: Vina</span>
          <span><strong>2.xlsx</strong>: Mobi</span>
          <span><strong>3.xlsx</strong>: Viettel</span>
          <span><strong>4.xlsx</strong>: VNM</span>
        </div>
      </div>

      {/* Interactive Table with Column Filters */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs text-slate-700 dark:text-slate-300 font-semibold shadow-xs">
              {/* Header Title Row */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="w-10 px-3 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="p-1 hover:text-blue-600"
                    title={allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả dòng đang hiện'}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="w-12 px-2 py-2.5 text-center font-mono">STT</th>
                <th className="min-w-[180px] px-3 py-2.5">
                  {showSMSFormat ? 'Họ tên (Chuẩn SMS)' : 'Họ tên (Bản gốc)'}
                </th>
                <th className="min-w-[150px] px-3 py-2.5">Số điện thoại (đầu 84)</th>
                <th className="min-w-[130px] px-3 py-2.5">Nhà mạng</th>
                <th className="min-w-[220px] px-3 py-2.5">
                  {showSMSFormat ? 'Vaccine (Không dấu, phẩy)' : 'Vaccine (Bản gốc)'}
                </th>
                <th className="min-w-[120px] px-3 py-2.5">Ngày tái khám</th>
                <th className="min-w-[110px] px-3 py-2.5 text-center">Trạng thái</th>
              </tr>

              {/* Column Filter Input Row */}
              <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <td className="px-2 py-1.5 text-center text-[10px] text-slate-400">Lọc:</td>
                <td className="px-1 py-1.5 text-center font-mono text-[10px] text-slate-400">
                  {filteredItems.length}/{items.length}
                </td>
                <td className="px-2 py-1.5">
                  <ColumnFilterInput
                    value={filterName}
                    onChange={setFilterName}
                    placeholder="Lọc họ tên..."
                  />
                </td>
                <td className="px-2 py-1.5">
                  <ColumnFilterInput
                    value={filterPhone}
                    onChange={setFilterPhone}
                    placeholder="Lọc SĐT..."
                  />
                </td>
                <td className="px-2 py-1.5">
                  <ColumnFilterInput
                    type="select"
                    value={activeCarrierFilter}
                    onChange={(val) => setActiveCarrierFilter(val as any)}
                    options={[
                      { value: 'all', label: 'Tất cả nhà mạng' },
                      { value: 'VinaPhone', label: '1. VinaPhone' },
                      { value: 'MobiFone', label: '2. MobiFone' },
                      { value: 'Viettel', label: '3. Viettel' },
                      { value: 'Vietnamobile', label: '4. Vietnamobile' },
                      { value: 'Khác', label: '5. Khác' },
                      { value: 'Không hợp lệ', label: 'Không hợp lệ' },
                    ]}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <ColumnFilterInput
                    value={filterVaccine}
                    onChange={setFilterVaccine}
                    placeholder="Lọc tên vaccine..."
                  />
                </td>
                <td className="px-2 py-1.5">
                  <ColumnFilterInput
                    value={filterDate}
                    onChange={setFilterDate}
                    placeholder="Lọc ngày tái khám..."
                  />
                </td>
                <td className="px-2 py-1.5">
                  <ColumnFilterInput
                    type="select"
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'valid', label: 'Hợp lệ' },
                      { value: 'invalid', label: 'Lỗi SĐT' },
                    ]}
                  />
                </td>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy dữ liệu nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const meta = CARRIER_META[item.carrier];
                  const isEditingThis = editingPhoneId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        item.selected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      } ${!item.isValidPhone ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectItem(item.id)}
                          className="p-0.5 text-slate-400 hover:text-blue-600"
                        >
                          {item.selected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* STT */}
                      <td className="px-2 py-2.5 text-center font-mono text-slate-400 tabular-nums">
                        {index + 1}
                      </td>

                      {/* Họ tên (Không dấu vs Có dấu) */}
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {showSMSFormat ? (
                            <span>{item.hoTenKhongDau || item.hoTen}</span>
                          ) : (
                            <span>{item.hoTen}</span>
                          )}
                        </div>
                        {showSMSFormat && item.hoTen !== item.hoTenKhongDau && (
                          <div className="text-[10px] text-slate-400">
                            Gốc: {item.hoTen}
                          </div>
                        )}
                      </td>

                      {/* Số điện thoại */}
                      <td className="px-3 py-2.5">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempPhone}
                              onChange={(e) => setTempPhone(e.target.value)}
                              className="w-28 rounded border border-blue-500 px-1.5 py-0.5 font-mono text-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePhone(item.id)}
                              className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPhoneId(null)}
                              className="text-[10px] text-slate-400 hover:text-slate-600"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span
                              className={`font-mono tabular-nums font-medium ${
                                item.isValidPhone
                                  ? 'text-slate-800 dark:text-slate-200'
                                  : 'text-rose-600 dark:text-rose-400 line-through'
                              }`}
                            >
                              {item.formattedPhone || item.rawPhone}
                            </span>
                            {!item.isValidPhone && (
                              <span
                                className="text-[11px] text-rose-500 font-normal"
                                title={item.phoneError}
                              >
                                (Lỗi)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPhoneId(item.id);
                                setTempPhone(item.rawPhone || item.formattedPhone);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition-opacity"
                              title="Sửa số điện thoại"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {item.rawPhone !== item.formattedPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Gốc: {item.rawPhone}
                          </div>
                        )}
                      </td>

                      {/* Nhà mạng Badge (kèm mã file SMS 1, 2, 3, 4) */}
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${meta.bgLight} ${meta.textLight} ${meta.bgDark} ${meta.textDark} ${meta.borderColor}`}
                          title={`File xuất tương ứng: ${meta.fileNameVaccine}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`} />
                          <span>{item.carrier}</span>
                          <span className="font-mono text-[10px] opacity-75 font-normal">
                            ({meta.fileNameVaccine})
                          </span>
                        </span>
                      </td>

                      {/* Vắc xin */}
                      <td className="px-3 py-2.5">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {showSMSFormat ? (
                            <span>{item.vacXinKhongDau || item.vacXin}</span>
                          ) : (
                            <span>{item.vacXin}</span>
                          )}
                        </div>
                        {showSMSFormat && item.vacXin !== item.vacXinKhongDau && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs" title={item.vacXin}>
                            Gốc: {item.vacXin}
                          </div>
                        )}
                      </td>

                      {/* Ngày hẹn */}
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {item.ngayHen || <span className="text-slate-400 italic">Trống</span>}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-3 py-2.5 text-center">
                        {item.isValidPhone ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Hợp lệ</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium text-[11px]"
                            title={item.phoneError}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Lỗi SĐT</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            Hiển thị <span className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">{filteredItems.length}</span> / {items.length} dòng
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>Đã chọn: <strong className="text-blue-600">{selectedCount}</strong></span>
            <span>SĐT hợp lệ: <strong className="text-emerald-600">{validCount}</strong></span>
            <span>SĐT lỗi: <strong className="text-rose-600">{items.length - validCount}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
