import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Building2,
  Sliders,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { CompanyRisk, PortfolioItem } from '../../types';
import { getHoldings, PORTFOLIO_UPDATED_EVENT } from '../../lib/portfolioService';
import {
  BaseHolding,
  ComputedHolding,
  computePositionValue,
  computeTotalPortfolioValue,
  computeAllocationsLargestRemainder,
  computePortfolioDayChangeDollar,
  computePortfolioDayChangePct,
  getRiskSignalBand,
  isPositionFlagged,
  getFlaggedPositions,
  computeSectorAllocations,
  computeCompositeTailRiskScore,
  generateHedgeRecommendation,
  formatCurrency,
  formatPercent
} from '../../utils/portfolioMath';
import { usePortfolioQuotes } from '../../hooks/usePortfolioQuotes';
import { RelativeTimeAgo } from '../portfolio/RelativeTimeAgo';
import { PortfolioDonutChart, DonutSliceItem } from '../portfolio/PortfolioDonutChart';
import { PositionReviewModal } from '../portfolio/PositionReviewModal';
import { HedgePlanModal } from '../portfolio/HedgePlanModal';
import { generatePortfolioRiskReportPDF } from '../../utils/portfolioReportGenerator';

interface PortfolioRiskPageProps {
  onNavigate: (path: string) => void;
  companies: CompanyRisk[];
  userRiskTolerance?: number;
  initialReviewTicker?: string;
  initialAction?: string;
}

const TOLERANCE_STORAGE_KEY = 'bs-portfolio-risk-tolerance';

// Stable palette matching Donut Chart slices and legend dots
const TICKER_COLORS: Record<string, string> = {
  NVDA: '#3B82F6', // Blue
  TSM: '#8B5CF6',  // Purple
  AAPL: '#06B6D4', // Cyan
  XOM: '#F59E0B',  // Amber
  LMT: '#10B981',  // Emerald
  DEFAULT: '#6366F1'
};

const SECTOR_COLORS: Record<string, string> = {
  Semiconductors: '#8B5CF6',
  Technology: '#06B6D4',
  Energy: '#F59E0B',
  Defense: '#10B981',
  Healthcare: '#EC4899',
  Financial: '#3B82F6',
  DEFAULT: '#64748B'
};

export const PortfolioRiskPage: React.FC<PortfolioRiskPageProps> = ({
  onNavigate,
  companies,
  userRiskTolerance: defaultTolerance = 55,
  initialReviewTicker = '',
  initialAction = ''
}) => {
  // 1. Persistent User Risk Tolerance State
  const [tolerance, setTolerance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(TOLERANCE_STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (Number.isFinite(parsed) && parsed >= 20 && parsed <= 90) return parsed;
      }
    } catch {
      /* ignore storage errors */
    }
    return defaultTolerance;
  });

  const handleToleranceChange = (newVal: number) => {
    const clamped = Math.max(20, Math.min(90, newVal));
    setTolerance(clamped);
    try {
      localStorage.setItem(TOLERANCE_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  };

  // 2. Single Source of Truth Holdings Data
  const [rawHoldings, setRawHoldings] = useState<PortfolioItem[]>(getHoldings);

  useEffect(() => {
    const sync = () => setRawHoldings(getHoldings());
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
  }, []);

  // 3. Live Quotes with Polling & Request De-duplication
  const symbols = useMemo(() => rawHoldings.map((h) => h.ticker), [rawHoldings]);
  const initialQuoteBases = useMemo(
    () =>
      rawHoldings.map((h) => ({
        ticker: h.ticker,
        price: h.price ?? h.avgCost ?? 100,
        prevClose: h.prevClose ?? h.price ?? 100
      })),
    [rawHoldings]
  );

  const { quotes, refreshingTickers, refreshTicker } = usePortfolioQuotes(
    symbols,
    initialQuoteBases,
    20000
  );

  // 4. Dynamically Computed Holdings Derived from Quotes & Seed Data
  const computedHoldings: ComputedHolding[] = useMemo(() => {
    // Merge live quotes into holdings
    const withLivePrices = rawHoldings.map((h) => {
      const sym = h.ticker.toUpperCase();
      const quote = quotes[sym];
      const livePrice = quote?.price && quote.price > 0 ? quote.price : (h.price ?? h.avgCost ?? 100);
      const livePrevClose =
        quote?.previousClose && quote.previousClose > 0
          ? quote.previousClose
          : (h.prevClose ?? livePrice);

      const posVal = computePositionValue(h.shares, livePrice);
      const dayChgDollar = h.shares * (livePrice - livePrevClose);
      const dayChgPct = livePrevClose > 0 ? ((livePrice - livePrevClose) / livePrevClose) * 100 : 0;

      return {
        id: h.id,
        ticker: h.ticker,
        name: h.name || h.companyName || h.ticker,
        sector: h.sector || 'General',
        shares: h.shares,
        price: livePrice,
        prevClose: livePrevClose,
        riskScore: h.riskScore,
        positionValue: posVal,
        dayChangeDollar: dayChgDollar,
        dayChangePct: dayChgPct
      };
    });

    const values = withLivePrices.map((h) => h.positionValue);
    const roundedAllocations = computeAllocationsLargestRemainder(values, 1);

    return withLivePrices.map((h, idx) => {
      const alloc = roundedAllocations[idx] ?? 0;
      const flagged = isPositionFlagged(h.riskScore, tolerance);
      const band = getRiskSignalBand(h.riskScore, tolerance);

      return {
        ...h,
        allocationPct: alloc,
        isFlagged: flagged,
        signalBand: band
      };
    });
  }, [rawHoldings, quotes, tolerance]);

  // 5. Total Portfolio Level Calculations
  const totalValue = useMemo(
    () => computeTotalPortfolioValue(computedHoldings),
    [computedHoldings]
  );

  const dayChangeDollar = useMemo(
    () => computePortfolioDayChangeDollar(computedHoldings),
    [computedHoldings]
  );

  const dayChangePct = useMemo(
    () => computePortfolioDayChangePct(dayChangeDollar, totalValue),
    [dayChangeDollar, totalValue]
  );

  const flaggedHoldings = useMemo(
    () => getFlaggedPositions(computedHoldings, tolerance),
    [computedHoldings, tolerance]
  );

  const compositeRisk = useMemo(
    () => computeCompositeTailRiskScore(computedHoldings, tolerance),
    [computedHoldings, tolerance]
  );

  const hedgeRecommendation = useMemo(
    () => generateHedgeRecommendation(computedHoldings, tolerance),
    [computedHoldings, tolerance]
  );

  // 6. Sector Allocations
  const sectorAllocations = useMemo(
    () => computeSectorAllocations(computedHoldings, totalValue),
    [computedHoldings, totalValue]
  );

  // 7. Interactive Donut Chart State
  const [chartMode, setChartMode] = useState<'ticker' | 'sector'>('ticker');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const donutItems: DonutSliceItem[] = useMemo(() => {
    if (chartMode === 'ticker') {
      return computedHoldings.map((h) => ({
        id: h.ticker,
        label: `$${h.ticker}`,
        subLabel: h.name,
        value: h.positionValue,
        allocationPct: h.allocationPct,
        color: TICKER_COLORS[h.ticker] || TICKER_COLORS.DEFAULT
      }));
    }

    return sectorAllocations.map((s) => ({
      id: s.sector,
      label: s.sector,
      subLabel: `${s.tickers.join(', ')}`,
      value: s.value,
      allocationPct: s.allocationPct,
      color: SECTOR_COLORS[s.sector] || SECTOR_COLORS.DEFAULT
    }));
  }, [chartMode, computedHoldings, sectorAllocations]);

  // 8. Modals & Drawers State
  const [activeReviewHolding, setActiveReviewHolding] = useState<ComputedHolding | null>(null);
  const [showHedgeModal, setShowHedgeModal] = useState(false);

  // Handle deep-linked action params from other pages
  useEffect(() => {
    if (initialReviewTicker) {
      const match = computedHoldings.find(
        (h) => h.ticker.toUpperCase() === initialReviewTicker.toUpperCase()
      );
      if (match) {
        if (initialAction === 'hedge') {
          setShowHedgeModal(true);
        } else {
          setActiveReviewHolding(match);
        }
      }
    }
  }, [initialReviewTicker, initialAction, computedHoldings]);

  // 9. Report Export Handler
  const handleGenerateReport = useCallback(() => {
    generatePortfolioRiskReportPDF({
      totalValue,
      dayChangeDollar,
      dayChangePct,
      compositeRisk,
      userTolerance: tolerance,
      holdings: computedHoldings,
      flaggedHoldings,
      hedgeRecommendation,
      timestamp: new Date().toLocaleString([], {
        dateStyle: 'full',
        timeStyle: 'medium'
      })
    });
  }, [
    totalValue,
    dayChangeDollar,
    dayChangePct,
    compositeRisk,
    tolerance,
    computedHoldings,
    flaggedHoldings,
    hedgeRecommendation
  ]);

  const isPositiveDay = dayChangeDollar >= 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-800 dark:text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
            <Briefcase className="w-4 h-4" />
            Institutional Tail-Risk & Hedging
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Portfolio Risk
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Single-source-of-truth valuations, live quote calibration, and concentration stress metrics
          </p>
        </div>

        {/* Action Controls: Risk Tolerance Slider & Report Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* User Risk Tolerance Slider / Input */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D]">
            <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <label
              htmlFor="risk-tolerance-slider"
              className="text-[11px] font-bold text-slate-600 dark:text-slate-300"
            >
              Tolerance: <span className="font-mono text-blue-500">{tolerance}</span>
            </label>
            <input
              id="risk-tolerance-slider"
              type="range"
              min="25"
              max="85"
              step="1"
              value={tolerance}
              onChange={(e) => handleToleranceChange(parseInt(e.target.value, 10))}
              className="w-20 sm:w-24 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              aria-label="Adjust portfolio risk tolerance threshold"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateReport}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 active:scale-95"
            aria-label="Generate and print portfolio risk report"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Generate Risk Report →
          </button>
        </div>
      </div>

      {/* Flagged Position Warning Banner (HIDDEN ENTIRELY WHEN NONE ARE FLAGGED) */}
      {flaggedHoldings.length > 0 && (
        <div
          className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-3 animate-fadeIn"
          role="alert"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  {flaggedHoldings.length} {flaggedHoldings.length === 1 ? 'POSITION' : 'POSITIONS'}{' '}
                  FLAGGED FOR DRAWDOWN EXPOSURE
                </h3>
                <p className="text-xs text-rose-800 dark:text-rose-200 mt-1 leading-relaxed">
                  Elevated capital loss risk detected. Ticker(s){' '}
                  <strong>
                    {flaggedHoldings
                      .map((f) => `$${f.ticker} (${f.riskScore}/100)`)
                      .join(', ')}
                  </strong>{' '}
                  exceed your risk tolerance setting of {tolerance}/100.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // Open highest-risk flagged position
                const highestRisk = [...flaggedHoldings].sort(
                  (a, b) => b.riskScore - a.riskScore
                )[0];
                setActiveReviewHolding(highestRisk);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto active:scale-95"
            >
              <Sliders className="w-4 h-4" />
              Review Position (${flaggedHoldings[0].ticker})
            </button>
          </div>
        </div>
      )}

      {/* Top 3 Stat Cards (All Derived Mathematically) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Portfolio Value & Today Change */}
        <div className="bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] p-5 rounded-2xl shadow-sm dark:shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Portfolio Value
            </span>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalValue)}
            </div>
          </div>
          <div
            className={`mt-3 text-xs font-bold flex items-center gap-1.5 font-mono ${
              isPositiveDay
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isPositiveDay ? (
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            ) : (
              <ArrowDownRight className="w-4 h-4 shrink-0" />
            )}
            <span>
              {isPositiveDay ? '+' : ''}
              {dayChangePct.toFixed(1)}% ({isPositiveDay ? '+' : ''}
              {formatCurrency(dayChangeDollar)}) Today
            </span>
          </div>
        </div>

        {/* Card 2: Composite Tail-Risk Score & Sector Concentration */}
        <div className="bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] p-5 rounded-2xl shadow-sm dark:shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Composite Tail-Risk Score
            </span>
            <div className="text-3xl font-black font-mono text-amber-500 dark:text-amber-400 mt-1 flex items-baseline gap-1.5">
              <span>{compositeRisk.score}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold truncate">
            {compositeRisk.label} Threat Concentration ({compositeRisk.topSector.name}{' '}
            {compositeRisk.topSector.allocationPct}%)
          </div>
        </div>

        {/* Card 3: AI Recommended Hedging */}
        <div className="bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] p-5 rounded-2xl shadow-sm dark:shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              AI Recommended Hedging
            </span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1.5 leading-snug">
              {hedgeRecommendation ? hedgeRecommendation.actionTitle : 'Exposure within acceptable bounds'}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            {hedgeRecommendation ? (
              <button
                type="button"
                onClick={() => setShowHedgeModal(true)}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Review ${hedgeRecommendation.ticker} Hedge Plan →
              </button>
            ) : (
              <span className="text-slate-400 text-xs">No hedge necessary</span>
            )}
            <span className="text-[10px] text-slate-400 italic">Informational only</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Table Left (2 cols), Allocation Donut Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] p-4 sm:p-6 rounded-2xl shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Portfolio Holdings & Live Signal Indicators
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {computedHoldings.length} Positions &bull; Sum: {formatCurrency(totalValue)}
            </span>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#232A3D] text-[10px] uppercase text-slate-500 dark:text-slate-400 font-mono">
                  <th className="py-3 px-3">Asset</th>
                  <th className="py-3 px-3 text-right">Allocation</th>
                  <th className="py-3 px-3 text-right">Live Quote</th>
                  <th className="py-3 px-3 text-center">Risk Signal</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#232A3D]">
                {computedHoldings.map((h) => {
                  const quote = quotes[h.ticker.toUpperCase()];
                  const isHovered = hoveredKey?.toUpperCase() === h.ticker.toUpperCase();
                  const isRefreshing = refreshingTickers[h.ticker.toUpperCase()] || false;
                  const priceDiff = h.price - h.prevClose;
                  const isPositivePrice = priceDiff >= 0;

                  return (
                    <tr
                      key={h.id || h.ticker}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredKey(h.ticker)}
                      onMouseLeave={() => setHoveredKey(null)}
                      onFocus={() => setHoveredKey(h.ticker)}
                      onBlur={() => setHoveredKey(null)}
                      className={`transition-colors focus:outline-none ${
                        isHovered
                          ? 'bg-blue-500/10 ring-1 ring-blue-500/40'
                          : 'hover:bg-slate-50 dark:hover:bg-[#161B2C]'
                      }`}
                    >
                      {/* Asset Column */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{h.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: TICKER_COLORS[h.ticker] || TICKER_COLORS.DEFAULT }}
                          />
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            ${h.ticker}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            &bull; {h.sector} &bull; {h.shares} shs
                          </span>
                        </div>
                      </td>

                      {/* Allocation Column (Right Aligned) */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm tabular-nums">
                          {formatPercent(h.allocationPct, 1)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatCurrency(h.positionValue)}
                        </div>
                      </td>

                      {/* Live Quote Column: Clean Two-Line Block */}
                      <td className="py-3.5 px-3 text-right">
                        {/* Line 1: Price and Change Badge */}
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm tabular-nums">
                            ${h.price.toFixed(2)}
                          </span>

                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border tabular-nums whitespace-nowrap ${
                              isPositivePrice
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isPositivePrice ? (
                              <TrendingUp className="w-2.5 h-2.5" />
                            ) : (
                              <TrendingDown className="w-2.5 h-2.5" />
                            )}
                            {isPositivePrice ? '+' : ''}
                            {h.dayChangePct.toFixed(2)}%
                          </span>
                        </div>

                        {/* Line 2: Market Status, Local Time, 1s Relative Ticker, Refresh Button */}
                        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {/* Market Open Dot & Label */}
                          <span className="inline-flex items-center gap-1 font-medium">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                quote?.isMarketOpen
                                  ? 'bg-emerald-500 animate-pulse'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span className={quote?.isMarketOpen ? 'text-emerald-500' : 'text-amber-500'}>
                              {quote?.isMarketOpen ? 'Live' : 'Last close'}
                            </span>
                          </span>

                          <span>&bull;</span>
                          <span className="tabular-nums">
                            {quote?.lastUpdatedFormatted || 'as of close'}
                          </span>

                          {/* Relative Time Ticking Every Second without Table Re-render */}
                          <RelativeTimeAgo timestamp={quote?.fetchedAt || null} />

                          {/* Stale Badge if > 60s */}
                          {quote?.isStale && (
                            <span className="px-1 py-0.2 rounded bg-slate-500/20 text-slate-400 text-[9px] uppercase font-bold">
                              stale
                            </span>
                          )}

                          {/* Per-row manual refresh button */}
                          <button
                            type="button"
                            onClick={() => refreshTicker(h.ticker)}
                            disabled={isRefreshing}
                            title={`Refresh quote for ${h.ticker}`}
                            aria-label={`Refresh ${h.ticker} live quote`}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#232A3D] transition-colors ml-0.5 disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Risk Signal Column (Centered, Fixed Width, No Wrap) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex justify-center">
                          <span
                            className={`min-w-[130px] px-2.5 py-1 rounded text-[10px] font-bold border font-mono whitespace-nowrap text-center ${h.signalBand.badgeClass}`}
                          >
                            {h.signalBand.label} ({h.riskScore})
                          </span>
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveReviewHolding(h)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 shadow-sm whitespace-nowrap ${
                            h.isFlagged
                              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                              : 'bg-slate-100 dark:bg-[#161B2C] hover:bg-slate-200 dark:hover:bg-[#232A3D] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-[#232A3D]'
                          }`}
                        >
                          {h.isFlagged ? 'Review Position' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Allocation Donut Chart (Right Col, Stacks on Mobile) */}
        <PortfolioDonutChart
          items={donutItems}
          mode={chartMode}
          onModeChange={setChartMode}
          hoveredKey={hoveredKey}
          onHoverKey={setHoveredKey}
        />
      </div>

      {/* Position Review Modal / Drawer */}
      {activeReviewHolding && (
        <PositionReviewModal
          holding={activeReviewHolding}
          company={companies.find((c) => c.ticker === activeReviewHolding.ticker)}
          userTolerance={tolerance}
          onClose={() => setActiveReviewHolding(null)}
          onOpenHedgePlan={(ticker) => {
            setActiveReviewHolding(null);
            setShowHedgeModal(true);
          }}
          onNavigateToCompany={(ticker) => {
            setActiveReviewHolding(null);
            onNavigate(`/companies?symbol=${ticker}`);
          }}
        />
      )}

      {/* Hedge Plan Modal */}
      {showHedgeModal && hedgeRecommendation && (
        <HedgePlanModal
          hedge={hedgeRecommendation}
          onClose={() => setShowHedgeModal(false)}
          onNavigateToCompany={(ticker) => {
            setShowHedgeModal(false);
            onNavigate(`/companies?symbol=${ticker}`);
          }}
        />
      )}
    </div>
  );
};
