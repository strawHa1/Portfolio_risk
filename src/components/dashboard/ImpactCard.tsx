import React from 'react';
import { StockImpactRecord } from '../../types';
import { TrendingDown, TrendingUp, Minus, ExternalLink } from 'lucide-react';
import { openExternalUrl } from '../../lib/externalLink';
import { isImpactAligned } from '../../lib/dashboardMetrics';

interface ImpactCardProps {
  record: StockImpactRecord;
  onClick: () => void;
}

function severityPillClass(severity: string): string {
  if (severity === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (severity === 'high') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (severity === 'medium') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
}

export const ImpactCard: React.FC<ImpactCardProps> = ({ record, onClick }) => {
  const isUp = record.actualChangePct > 0;
  const isDown = record.actualChangePct < 0;

  const aligned = isImpactAligned(
    record.actualChangePct,
    record.projectedImpactPct.min,
    record.projectedImpactPct.max
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-[#161B2C] border border-[#232A3D] hover:border-blue-500/40 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-white truncate">{record.companyName}</h4>
            <span className="text-[10px] font-mono text-slate-400 bg-[#0F1420] px-1.5 py-0.5 rounded border border-[#232A3D]">
              {record.ticker}
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${severityPillClass(record.severity)}`}
            >
              {record.severity}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {record.sector} • {record.region}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-bold font-mono text-white">${record.currentPrice.toFixed(2)}</div>
          <div
            className={`text-[11px] font-bold font-mono flex items-center justify-end gap-0.5 ${
              isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-400'
            }`}
          >
            {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {isUp ? '+' : ''}
            {record.actualChangePct.toFixed(2)}%
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="mt-3 w-full text-left text-[11px] text-slate-300 line-clamp-2 group-hover:text-blue-300 transition-colors"
      >
        {record.headline}
      </button>

      {record.url && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openExternalUrl(record.url);
          }}
          className="mt-1 text-[10px] text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
        >
          Open source article
          <ExternalLink className="w-3 h-3 opacity-70" />
        </button>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
        <div className="text-slate-400">
          <span className="text-slate-500">Predicted:</span>{' '}
          <span
            className={
              record.sentiment === 'bearish'
                ? 'text-red-400'
                : record.sentiment === 'bullish'
                  ? 'text-emerald-400'
                  : 'text-slate-300'
            }
          >
            {record.projectedImpactLabel}
          </span>
          <span className="text-slate-600 mx-1">|</span>
          <span className="text-slate-500">Actual:</span>{' '}
          <span className={isDown ? 'text-red-400' : isUp ? 'text-emerald-400' : 'text-slate-300'}>
            {isUp ? '+' : ''}
            {record.actualChangePct.toFixed(1)}%
          </span>
        </div>
        {aligned ? (
          <span className="text-emerald-400 font-semibold text-[9px] flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            ✓ Aligned
          </span>
        ) : (
          <span className="text-amber-400/90 font-semibold text-[9px] flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            ⚠ Not aligned
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        <span>{record.source}</span>
        <span>{record.timeAgo}</span>
      </div>
    </div>
  );
};
