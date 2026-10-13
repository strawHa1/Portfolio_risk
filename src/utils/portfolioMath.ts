/**
 * Pure mathematical helper functions for Portfolio Risk calculations.
 * Single source of truth for valuations, allocations, day changes, risk bands,
 * sector concentration, and hedging recommendations.
 */

export interface BaseHolding {
  ticker: string;
  name: string;
  sector: string;
  shares: number;
  price: number;
  prevClose: number;
  riskScore: number;
  id?: string;
  companyName?: string;
}

export interface ComputedHolding extends BaseHolding {
  positionValue: number;
  allocationPct: number;
  dayChangeDollar: number;
  dayChangePct: number;
  isFlagged: boolean;
  signalBand: RiskSignalBandMeta;
}

export type RiskSignalBand = 'Favorable' | 'Neutral-Hold' | 'Caution' | 'High-Risk';

export interface RiskSignalBandMeta {
  band: RiskSignalBand;
  label: string;
  badgeClass: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  allocationPct: number;
  holdingsCount: number;
  tickers: string[];
}

export interface CompositeTailRiskResult {
  score: number;
  label: 'Low' | 'Moderate' | 'High' | 'Severe';
  labelClass: string;
  concentrationPenalty: number;
  baseWeightedScore: number;
  herfindahlIndex: number;
  topSector: { name: string; allocationPct: number };
}

export interface HedgeRecommendation {
  ticker: string;
  companyName: string;
  shares: number;
  price: number;
  notionalHedged: number;
  contractsNeeded: number;
  actionTitle: string;
  strategyDescription: string;
  suggestedStrike: number;
  expiration: string;
  riskScore: number;
  allocationPct: number;
  disclaimer: string;
}

/**
 * 1. Position value = shares * price
 */
export function computePositionValue(shares: number, price: number): number {
  if (!Number.isFinite(shares) || !Number.isFinite(price) || shares < 0 || price < 0) {
    return 0;
  }
  return shares * price;
}

/**
 * 2. Total portfolio value = sum of position values
 */
export function computeTotalPortfolioValue(
  holdings: Array<{ shares: number; price: number }>
): number {
  if (!Array.isArray(holdings) || holdings.length === 0) return 0;
  return holdings.reduce((sum, h) => sum + computePositionValue(h.shares, h.price), 0);
}

/**
 * 3. Raw allocation % = position value / total * 100
 */
export function computeRawAllocationPct(positionValue: number, totalValue: number): number {
  if (!Number.isFinite(positionValue) || !Number.isFinite(totalValue) || totalValue <= 0) {
    return 0;
  }
  return (positionValue / totalValue) * 100;
}

/**
 * Allocations rounded using Largest Remainder Method (Hamilton/Hare-Niemeyer).
 * Guarantees that the rounded numbers sum to EXACTLY 100.0%.
 *
 * @param values Array of individual non-negative position values
 * @param decimals Number of decimal places (default 1)
 */
export function computeAllocationsLargestRemainder(
  values: number[],
  decimals = 1
): number[] {
  if (!Array.isArray(values) || values.length === 0) return [];
  const total = values.reduce((sum, v) => sum + (Number.isFinite(v) && v > 0 ? v : 0), 0);
  if (total <= 0) {
    return values.map(() => 0);
  }

  const multiplier = Math.pow(10, decimals);
  const targetSum = 100 * multiplier; // e.g. 1000 for 1 decimal

  const rawPcts = values.map((v) => {
    const val = Number.isFinite(v) && v > 0 ? v : 0;
    return (val / total) * 100;
  });

  const scaled = rawPcts.map((p) => p * multiplier);
  const floored = scaled.map((s) => Math.floor(s));
  const remainders = scaled.map((s, idx) => ({
    index: idx,
    remainder: s - floored[idx]
  }));

  const currentSum = floored.reduce((sum, f) => sum + f, 0);
  const difference = Math.round(targetSum - currentSum);

  // Sort by remainder descending to give the shortfall to the largest remainder fractions
  remainders.sort((a, b) => b.remainder - a.remainder);

  const result = [...floored];
  for (let i = 0; i < difference && i < remainders.length; i++) {
    result[remainders[i].index] += 1;
  }

  return result.map((r) => Number((r / multiplier).toFixed(decimals)));
}

/**
 * Day change $ for a single position = shares * (price - prevClose)
 */
export function computePositionDayChangeDollar(
  shares: number,
  price: number,
  prevClose: number
): number {
  if (!Number.isFinite(shares) || !Number.isFinite(price) || !Number.isFinite(prevClose)) {
    return 0;
  }
  return Number((shares * (price - prevClose)).toFixed(2));
}

/**
 * Day change $ = Σ shares * (price - prevClose)
 */
export function computePortfolioDayChangeDollar(
  holdings: Array<{ shares: number; price: number; prevClose: number }>
): number {
  if (!Array.isArray(holdings) || holdings.length === 0) return 0;
  const raw = holdings.reduce(
    (sum, h) => sum + computePositionDayChangeDollar(h.shares, h.price, h.prevClose),
    0
  );
  return Number(raw.toFixed(2));
}

/**
 * Day change % = day change $ / (total - day change $) * 100
 */
export function computePortfolioDayChangePct(
  dayChangeDollar: number,
  totalValue: number
): number {
  if (!Number.isFinite(dayChangeDollar) || !Number.isFinite(totalValue)) return 0;
  const previousTotal = totalValue - dayChangeDollar;
  if (previousTotal <= 0) return 0;
  return (dayChangeDollar / previousTotal) * 100;
}

/**
 * Risk signal band mapping relative to user tolerance:
 * - Favorable (< 40)
 * - Neutral-Hold (40 to tolerance)
 * - Caution (> tolerance to tolerance + 20)
 * - High-Risk (> tolerance + 20)
 */
export function getRiskSignalBand(riskScore: number, tolerance = 55): RiskSignalBandMeta {
  const score = Math.max(0, Math.min(100, Math.round(riskScore || 0)));
  const tol = Math.max(10, Math.min(90, Math.round(tolerance || 55)));

  if (score < 40) {
    return {
      band: 'Favorable',
      label: 'Favorable',
      badgeClass:
        'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      textColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30'
    };
  }

  if (score <= tol) {
    return {
      band: 'Neutral-Hold',
      label: 'Neutral-Hold',
      badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
      textColor: 'text-sky-500',
      bgColor: 'bg-sky-500/15',
      borderColor: 'border-sky-500/30'
    };
  }

  if (score <= tol + 20) {
    return {
      band: 'Caution',
      label: 'Caution',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      textColor: 'text-amber-500',
      bgColor: 'bg-amber-500/15',
      borderColor: 'border-amber-500/30'
    };
  }

  return {
    band: 'High-Risk',
    label: 'High-Risk',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    textColor: 'text-rose-500',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-500/30'
  };
}

/**
 * A position is flagged when riskScore > user tolerance.
 */
export function isPositionFlagged(riskScore: number, tolerance = 55): boolean {
  return (riskScore || 0) > (tolerance || 55);
}

/**
 * Filter holdings to only those that exceed the user's risk tolerance.
 */
export function getFlaggedPositions<T extends { riskScore: number }>(
  holdings: T[],
  tolerance = 55
): T[] {
  if (!Array.isArray(holdings)) return [];
  return holdings.filter((h) => isPositionFlagged(h.riskScore, tolerance));
}

/**
 * Group holdings by sector, computing total value and allocations.
 */
export function computeSectorAllocations(
  holdings: Array<{ sector: string; positionValue: number; ticker?: string }>,
  totalValue: number
): SectorAllocation[] {
  if (!Array.isArray(holdings) || holdings.length === 0 || totalValue <= 0) return [];

  const sectorMap = new Map<string, { value: number; count: number; tickers: string[] }>();

  for (const h of holdings) {
    const s = h.sector?.trim() || 'Other';
    const existing = sectorMap.get(s) || { value: 0, count: 0, tickers: [] };
    existing.value += h.positionValue;
    existing.count += 1;
    if (h.ticker) existing.tickers.push(h.ticker);
    sectorMap.set(s, existing);
  }

  const sectors = Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    value: data.value,
    allocationPct: 0,
    holdingsCount: data.count,
    tickers: data.tickers
  }));

  const values = sectors.map((s) => s.value);
  const roundedAllocations = computeAllocationsLargestRemainder(values, 1);

  sectors.forEach((s, idx) => {
    s.allocationPct = roundedAllocations[idx] || 0;
  });

  // Sort largest sector first
  return sectors.sort((a, b) => b.value - a.value);
}

/**
 * Composite Tail-Risk Score (0 - 100):
 *
 * 1. Base component: Weighted average of position risk scores by allocation:
 *    base = Σ (allocation_i / 100) * riskScore_i
 *
 * 2. Sector concentration penalty based on Herfindahl-Hirschman Index (HHI) of sector weights:
 *    HHI = Σ (sectorWeight_k)^2, where sectorWeight_k = sectorAllocationPct_k / 100.
 *    In an equally distributed portfolio across N sectors, HHI = 1/N.
 *    For concentrated portfolios (e.g. 40%+ in semiconductors), HHI rises significantly.
 *    penalty = Math.round(HHI * 16)
 *
 * 3. Composite score = clamp(round(base + penalty), 0, 100)
 *
 * 4. Label follows the numeric value relative to tolerance:
 *    < 40: Low
 *    <= tolerance: Moderate
 *    <= tolerance + 20: High
 *    > tolerance + 20: Severe
 */
export function computeCompositeTailRiskScore(
  holdings: Array<{
    riskScore: number;
    allocationPct: number;
    sector?: string;
    positionValue?: number;
  }>,
  tolerance = 55
): CompositeTailRiskResult {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return {
      score: 0,
      label: 'Low',
      labelClass: 'text-emerald-500',
      concentrationPenalty: 0,
      baseWeightedScore: 0,
      herfindahlIndex: 0,
      topSector: { name: 'None', allocationPct: 0 }
    };
  }

  // 1. Weighted average of risk scores
  const totalAlloc = holdings.reduce((sum, h) => sum + (h.allocationPct || 0), 0) || 100;
  const baseWeightedScore = holdings.reduce(
    (sum, h) => sum + (h.riskScore || 0) * ((h.allocationPct || 0) / totalAlloc),
    0
  );

  // 2. Sector weights and Herfindahl Index
  const sectorWeightMap = new Map<string, number>();
  for (const h of holdings) {
    const s = h.sector?.trim() || 'General';
    const current = sectorWeightMap.get(s) || 0;
    sectorWeightMap.set(s, current + (h.allocationPct || 0));
  }

  let herfindahlIndex = 0;
  let topSectorName = 'General';
  let topSectorAlloc = 0;

  for (const [sector, allocPct] of sectorWeightMap.entries()) {
    const weight = allocPct / 100;
    herfindahlIndex += weight * weight;
    if (allocPct > topSectorAlloc) {
      topSectorAlloc = allocPct;
      topSectorName = sector;
    }
  }

  // Concentration penalty (0 - 16 pts)
  const concentrationPenalty = Math.round(herfindahlIndex * 16);

  // 3. Final clamped composite score
  const rawScore = Math.round(baseWeightedScore + concentrationPenalty);
  const score = Math.max(0, Math.min(100, rawScore));

  // 4. Label & Color
  let label: 'Low' | 'Moderate' | 'High' | 'Severe';
  let labelClass: string;

  if (score < 40) {
    label = 'Low';
    labelClass = 'text-emerald-500';
  } else if (score <= tolerance) {
    label = 'Moderate';
    labelClass = 'text-amber-500';
  } else if (score <= tolerance + 20) {
    label = 'High';
    labelClass = 'text-orange-500';
  } else {
    label = 'Severe';
    labelClass = 'text-rose-500';
  }

  return {
    score,
    label,
    labelClass,
    concentrationPenalty,
    baseWeightedScore: Math.round(baseWeightedScore),
    herfindahlIndex: Number(herfindahlIndex.toFixed(4)),
    topSector: {
      name: topSectorName,
      allocationPct: Number(topSectorAlloc.toFixed(1))
    }
  };
}

/**
 * Generate AI Recommended Hedging:
 * Pick the flagged position with highest (riskScore * allocationPct) and
 * suggest a protective put sized to its exposure.
 */
export function generateHedgeRecommendation(
  holdings: Array<{
    ticker: string;
    name?: string;
    companyName?: string;
    shares: number;
    price: number;
    riskScore: number;
    allocationPct: number;
  }>,
  tolerance = 55
): HedgeRecommendation | null {
  if (!Array.isArray(holdings) || holdings.length === 0) return null;

  // Filter positions where riskScore > tolerance
  const flagged = holdings.filter((h) => isPositionFlagged(h.riskScore, tolerance));
  if (flagged.length === 0) {
    return null;
  }

  // Pick highest (riskScore * allocationPct)
  let candidate = flagged[0];
  let maxProduct = (candidate.riskScore || 0) * (candidate.allocationPct || 0);

  for (let i = 1; i < flagged.length; i++) {
    const prod = (flagged[i].riskScore || 0) * (flagged[i].allocationPct || 0);
    if (prod > maxProduct) {
      maxProduct = prod;
      candidate = flagged[i];
    }
  }

  const notionalHedged = Math.round(candidate.shares * candidate.price);
  const contractsNeeded = Math.max(1, Math.round(candidate.shares / 100));
  const suggestedStrike = Math.round(candidate.price * 0.92); // ~8% OTM

  return {
    ticker: candidate.ticker,
    companyName: candidate.name || candidate.companyName || candidate.ticker,
    shares: candidate.shares,
    price: candidate.price,
    notionalHedged,
    contractsNeeded,
    actionTitle: `Buy ${candidate.ticker} 60-Day Out-Of-The-Money Puts`,
    strategyDescription: `Protective OTM Put (${contractsNeeded} contract${
      contractsNeeded > 1 ? 's' : ''
    } @ ~$${suggestedStrike} Strike)`,
    suggestedStrike,
    expiration: '60 Days',
    riskScore: candidate.riskScore,
    allocationPct: candidate.allocationPct,
    disclaimer: 'Informational only, not financial advice.'
  };
}

/**
 * Format currency with Intl.NumberFormat (USD)
 */
export function formatCurrency(
  value: number,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  if (!Number.isFinite(value)) return '$0';
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

/**
 * Format percentage with consistent decimals and optional sign
 */
export function formatPercent(
  value: number,
  decimals = 1,
  showSign = false
): string {
  if (!Number.isFinite(value)) return '0.0%';
  const prefix = showSign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}
