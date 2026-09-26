import React from 'react';
import { Carrier } from '../types';
import { CARRIER_META } from '../utils/phone';
import { CheckCircle2, AlertTriangle, Radio, Link as LinkIcon } from 'lucide-react';

interface StatsBarProps {
  total: number;
  validCount: number;
  errorCount: number;
  carrierCounts: Record<Carrier, number>;
  activeCarrierFilter?: Carrier | 'all';
  onSelectCarrierFilter?: (carrier: Carrier | 'all') => void;
  // Link specific
  shortenedCount?: number;
  isLinkTab?: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  total,
  validCount,
  errorCount,
  carrierCounts,
  activeCarrierFilter = 'all',
  onSelectCarrierFilter,
  shortenedCount = 0,
  isLinkTab = false,
}) => {
  if (total === 0) return null;

  const validPercent = total > 0 ? Math.round((validCount / total) * 100) : 0;
  const shortenedPercent = total > 0 ? Math.round((shortenedCount / total) * 100) : 0;

  const mainCarriers: Carrier[] = ['Viettel', 'VinaPhone', 'MobiFone', 'Vietnamobile', 'Khác'];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Top summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 mb-4">
        {/* Total rows */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng dữ liệu</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {total}
            </span>
            <span className="text-xs text-slate-500">dòng</span>
          </div>
        </div>

        {/* Valid phones */}
        <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 p-3 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>SĐT hợp lệ</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
              {validCount}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
              ({validPercent}%)
            </span>
          </div>
        </div>

        {/* Invalid / Error */}
        <div className="rounded-xl bg-rose-50/60 dark:bg-rose-950/30 p-3 border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>SĐT lỗi / Không chuẩn</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-300">
              {errorCount}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-mono">
              ({100 - validPercent}%)
            </span>
          </div>
        </div>

        {/* Link tab: Shortened count | Vaccine tab: Ready for SMS */}
        {isLinkTab ? (
          <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/30 p-3 border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Đã rút gọn Link</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-blue-700 dark:text-blue-300">
                {shortenedCount}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                / {total} ({shortenedPercent}%)
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 p-3 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
              <Radio className="h-3.5 w-3.5" />
              <span>Sẵn sàng gửi SMS</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-indigo-700 dark:text-indigo-300">
                {validCount}
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400">bản ghi</span>
            </div>
          </div>
        )}
      </div>

      {/* Network breakdown pills / clickable filter badges */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
          <span>Phân bố theo nhà mạng (Nhấp để lọc nhanh):</span>
          {activeCarrierFilter !== 'all' && onSelectCarrierFilter && (
            <button
              onClick={() => onSelectCarrierFilter('all')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Hiện tất cả nhà mạng
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mainCarriers.map((carrier) => {
            const count = carrierCounts[carrier] || 0;
            const meta = CARRIER_META[carrier];
            const isActive = activeCarrierFilter === carrier;

            return (
              <button
                key={carrier}
                type="button"
                onClick={() => onSelectCarrierFilter?.(isActive ? 'all' : carrier)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'ring-2 ring-blue-500 shadow-xs ' + meta.bgLight + ' ' + meta.textLight + ' ' + meta.bgDark + ' ' + meta.textDark
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${meta.dotColor}`} />
                <span className="font-semibold">{carrier}</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {count}
                </span>
                <span className="text-[11px] opacity-70 font-mono">
                  ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                </span>
              </button>
            );
          })}

          {carrierCounts['Không hợp lệ'] > 0 && (
            <button
              type="button"
              onClick={() => onSelectCarrierFilter?.(activeCarrierFilter === 'Không hợp lệ' ? 'all' : 'Không hợp lệ')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCarrierFilter === 'Không hợp lệ'
                  ? 'ring-2 ring-rose-500 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Lỗi</span>
              <span className="font-mono tabular-nums font-bold">
                {carrierCounts['Không hợp lệ']}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
