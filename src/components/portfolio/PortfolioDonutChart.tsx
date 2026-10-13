import React, { useState, useMemo } from 'react';
import { PieChart as PieIcon, Layers } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../utils/portfolioMath';

export interface DonutSliceItem {
  id: string;
  label: string;
  subLabel?: string;
  value: number;
  allocationPct: number;
  color: string;
}

interface PortfolioDonutChartProps {
  items: DonutSliceItem[];
  mode: 'ticker' | 'sector';
  onModeChange: (mode: 'ticker' | 'sector') => void;
  hoveredKey: string | null;
  onHoverKey: (key: string | null) => void;
  className?: string;
}

export const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({
  items,
  mode,
  onModeChange,
  hoveredKey,
  onHoverKey,
  className = ''
}) => {
  const [activeTooltip, setActiveTooltip] = useState<DonutSliceItem | null>(null);

  // SVG trigonometry calculations for donut arcs
  const slices = useMemo(() => {
    if (!items || items.length === 0) return [];
    const totalAlloc = items.reduce((sum, it) => sum + it.allocationPct, 0) || 100;

    let cumulative = 0;
    return items.map((item) => {
      const startPct = cumulative;
      cumulative += item.allocationPct;
      const endPct = cumulative;

      // Angles in radians (-PI/2 rotates start to 12 o'clock)
      const startAngle = (startPct / totalAlloc) * 2 * Math.PI - Math.PI / 2;
      const endAngle = (endPct / totalAlloc) * 2 * Math.PI - Math.PI / 2;

      return {
        item,
        startAngle,
        endAngle,
        pct: item.allocationPct
      };
    });
  }, [items]);

  const cx = 100;
  const cy = 100;
  const rInner = 56;
  const rOuterBase = 84;

  const currentHoveredItem = useMemo(() => {
    if (activeTooltip) return activeTooltip;
    if (hoveredKey) {
      return items.find((it) => it.id.toUpperCase() === hoveredKey.toUpperCase()) || null;
    }
    return null;
  }, [activeTooltip, hoveredKey, items]);

  return (
    <div
      className={`bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] p-6 rounded-2xl shadow-sm dark:shadow-xl flex flex-col justify-between ${className}`}
    >
      {/* Header with Title and Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            {mode === 'sector' ? 'Sector Weight Allocation' : 'Asset Weight Allocation'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {mode === 'sector'
              ? 'Asset distribution grouped by industry sector'
              : 'Asset distribution by ticker'}
          </p>
        </div>

        {/* By Ticker | By Sector Toggle */}
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D] rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onModeChange('ticker')}
            aria-pressed={mode === 'ticker'}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
              mode === 'ticker'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            By Ticker
          </button>
          <button
            type="button"
            onClick={() => onModeChange('sector')}
            aria-pressed={mode === 'sector'}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
              mode === 'sector'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            By Sector
          </button>
        </div>
      </div>

      {/* Donut Chart Area */}
      {items.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
          <Layers className="w-8 h-8 mb-2 opacity-50" />
          No holdings available to visualize
        </div>
      ) : (
        <div className="relative my-4 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 sm:w-52 sm:h-52">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full transform transition-transform duration-300"
              role="img"
              aria-label={`Portfolio allocation chart ${
                mode === 'sector' ? 'by sector' : 'by ticker'
              }`}
            >
              {slices.map(({ item, startAngle, endAngle }) => {
                const isHovered =
                  (hoveredKey && item.id.toUpperCase() === hoveredKey.toUpperCase()) ||
                  (activeTooltip && item.id === activeTooltip.id);

                const rOuter = isHovered ? rOuterBase + 6 : rOuterBase;

                // End angle - start angle difference
                const angleDiff = endAngle - startAngle;
                const isFullCircle = angleDiff >= 2 * Math.PI - 0.001;

                let pathD = '';
                if (isFullCircle) {
                  // Full circle special case
                  pathD = `
                    M ${cx} ${cy - rOuter}
                    A ${rOuter} ${rOuter} 0 1 1 ${cx - 0.01} ${cy - rOuter}
                    Z
                    M ${cx} ${cy - rInner}
                    A ${rInner} ${rInner} 0 1 0 ${cx - 0.01} ${cy - rInner}
                    Z
                  `;
                } else {
                  // Standard arc path
                  const x1 = cx + rOuter * Math.cos(startAngle);
                  const y1 = cy + rOuter * Math.sin(startAngle);
                  const x2 = cx + rOuter * Math.cos(endAngle);
                  const y2 = cy + rOuter * Math.sin(endAngle);

                  const x3 = cx + rInner * Math.cos(endAngle);
                  const y3 = cy + rInner * Math.sin(endAngle);
                  const x4 = cx + rInner * Math.cos(startAngle);
                  const y4 = cy + rInner * Math.sin(startAngle);

                  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

                  pathD = `
                    M ${x1} ${y1}
                    A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2} ${y2}
                    L ${x3} ${y3}
                    A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x4} ${y4}
                    Z
                  `;
                }

                return (
                  <path
                    key={item.id}
                    d={pathD}
                    fill={item.color}
                    fillOpacity={isHovered ? 1.0 : hoveredKey ? 0.45 : 0.9}
                    stroke="#0F1420"
                    strokeWidth={1.5}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => {
                      setActiveTooltip(item);
                      onHoverKey(item.id);
                    }}
                    onMouseLeave={() => {
                      setActiveTooltip(null);
                      onHoverKey(null);
                    }}
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${item.label}: ${item.allocationPct}%`}
                    onFocus={() => {
                      setActiveTooltip(item);
                      onHoverKey(item.id);
                    }}
                    onBlur={() => {
                      setActiveTooltip(null);
                      onHoverKey(null);
                    }}
                  />
                );
              })}
            </svg>

            {/* Donut Center Label */}
            <div className="absolute inset-[27%] rounded-full bg-white dark:bg-[#0F1420] flex flex-col items-center justify-center pointer-events-none shadow-inner border border-slate-200/50 dark:border-[#232A3D]/50">
              <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
                {mode === 'sector' ? 'SECTORS' : 'POSITIONS'}
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {items.length}
              </span>
            </div>
          </div>

          {/* Interactive Tooltip Card */}
          <div className="min-h-[46px] w-full mt-2 text-center flex flex-col items-center justify-center">
            {currentHoveredItem ? (
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#161B2C] border border-slate-300 dark:border-[#232A3D] text-xs font-mono shadow-md animate-fadeIn flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentHoveredItem.color }}
                />
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentHoveredItem.label}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatCurrency(currentHoveredItem.value)}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatPercent(currentHoveredItem.allocationPct, 1)}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                Hover over a slice or legend item to inspect allocation
              </span>
            )}
          </div>
        </div>
      )}

      {/* Legend Rows */}
      <div className="w-full space-y-2 text-xs font-mono text-slate-700 dark:text-slate-300 pt-3 border-t border-slate-200 dark:border-[#232A3D]">
        {items.map((item) => {
          const isHovered =
            (hoveredKey && item.id.toUpperCase() === hoveredKey.toUpperCase()) ||
            (activeTooltip && item.id === activeTooltip.id);

          return (
            <div
              key={item.id}
              onMouseEnter={() => {
                setActiveTooltip(item);
                onHoverKey(item.id);
              }}
              onMouseLeave={() => {
                setActiveTooltip(null);
                onHoverKey(null);
              }}
              className={`flex justify-between items-center px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
                isHovered
                  ? 'bg-blue-500/15 ring-1 ring-blue-500/30'
                  : 'hover:bg-slate-100 dark:hover:bg-[#161B2C]'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {item.label}
                </span>
                {item.subLabel && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                    ({item.subLabel})
                  </span>
                )}
              </span>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] tabular-nums hidden sm:inline">
                  {formatCurrency(item.value)}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums min-w-[42px] text-right">
                  {formatPercent(item.allocationPct, 1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
