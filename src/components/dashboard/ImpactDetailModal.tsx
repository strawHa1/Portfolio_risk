import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, TrendingDown, TrendingUp, Newspaper } from 'lucide-react';
import { StockImpactRecord } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { openExternalUrl } from '../../lib/externalLink';
import { isImpactAligned } from '../../lib/dashboardMetrics';

interface ImpactDetailModalProps {
  record: StockImpactRecord | null;
  onClose: () => void;
  onNavigateCompany: (ticker: string) => void;
  onNavigateEvent?: (newsId: string) => void;
}

function safeNum(value: number | undefined | null, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export const ImpactDetailModal: React.FC<ImpactDetailModalProps> = ({
  record,
  onClose,
  onNavigateCompany,
  onNavigateEvent
}) => {
  useEffect(() => {
    if (!record) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [record, onClose]);

  if (!record) return null;

  const currentPrice = safeNum(record.currentPrice);
  const actualChangePct = safeNum(record.actualChangePct);
  const volume = safeNum(record.volume);
  const projectedMin = safeNum(record.projectedImpactPct?.min);
  const projectedMax = safeNum(record.projectedImpactPct?.max);
  const predictedMid = ((projectedMin + projectedMax) / 2).toFixed(1);
  const aligned = isImpactAligned(actualChangePct, projectedMin, projectedMax);
  const isUp = actualChangePct > 0;
  const openPrice = currentPrice / (1 + actualChangePct / 100);

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="impact-detail-title"
    >
      <div
        className="bg-[#0F1420] border border-[#232A3D] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0F1420] border-b border-[#232A3D] p-5 flex items-start justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="impact-detail-title" className="text-lg font-bold text-white">
                {record.companyName}
              </h2>
              <span className="text-xs font-mono text-slate-400 bg-[#161B2C] px-2 py-0.5 rounded border border-[#232A3D]">
                {record.ticker}
              </span>
              <SeverityBadge severity={record.severity} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {record.sector} • {record.country} • {record.region}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#161B2C] text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Triggering news — primary context */}
          <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              News driving this impact ({record.newsType === 'macro' ? 'Macro Event' : 'Company News'})
            </h3>
            <h4 className="text-base font-bold text-white leading-snug">{record.headline}</h4>
            <p className="text-sm text-slate-300 leading-relaxed">{record.description}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>
                {record.source} • {record.timeAgo}
              </span>
              {record.url && (
                <button
                  type="button"
                  onClick={() => openExternalUrl(record.url)}
                  className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  Read original article <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Price row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#161B2C] border border-[#232A3D] p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Current Price</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">${currentPrice.toFixed(2)}</div>
            </div>
            <div className="bg-[#161B2C] border border-[#232A3D] p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Today&apos;s Change</div>
              <div
                className={`text-2xl font-bold font-mono mt-1 flex items-center gap-1 ${
                  isUp ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {isUp ? '+' : ''}
                {actualChangePct.toFixed(2)}%
              </div>
            </div>
            <div className="bg-[#161B2C] border border-[#232A3D] p-4 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Volume</div>
              <div className="text-lg font-bold font-mono text-white mt-1">
                {(volume / 1_000_000).toFixed(1)}M
              </div>
            </div>
          </div>

          {/* Predicted vs Actual */}
          <div className="bg-[#161B2C] border border-[#232A3D] p-4 rounded-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Predicted vs Actual Impact
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500">AI Projected Range</span>
                <div
                  className={`text-lg font-bold mt-1 ${
                    record.sentiment === 'bearish'
                      ? 'text-red-400'
                      : record.sentiment === 'bullish'
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                  }`}
                >
                  {record.projectedImpactLabel}
                </div>
                <span className="text-[10px] text-slate-500">Midpoint: {predictedMid}%</span>
              </div>
              <div>
                <span className="text-slate-500">Actual Market Move</span>
                <div className={`text-lg font-bold mt-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}
                  {actualChangePct.toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-500 capitalize">{record.sentiment} sentiment</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#232A3D] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className={aligned ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-amber-400 font-bold flex items-center gap-1'}>
                {aligned ? '✓ Aligned (Move is inside predicted range)' : '⚠ Not aligned (Move is outside predicted range)'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {record.newsId && onNavigateEvent && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateEvent(record.newsId!);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#161B2C] border border-purple-500/40 hover:border-purple-400 text-purple-200 font-bold text-xs transition-all"
              >
                View Full Event Brief →
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateCompany(record.ticker);
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs transition-all"
            >
              Open Company Analysis →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
