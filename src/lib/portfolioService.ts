/**
 * Client-side portfolio store backing the AI Assistant's invest / withdraw flow.
 *
 * Follows the same persistence pattern already used by watchlistService and
 * MarketSearch: localStorage as the source of truth plus a window CustomEvent so
 * any mounted page (Portfolio Risk, chat) re-reads after a mutation.
 *
 * Holdings are seeded once from INITIAL_PORTFOLIO so the Portfolio Risk page keeps
 * showing its existing positions until the user actually trades.
 */

import { PortfolioItem } from '../types';
import { INITIAL_PORTFOLIO } from '../data/mockData';
import { computeAllocationsLargestRemainder } from '../utils/portfolioMath';

const HOLDINGS_KEY = 'bs-portfolio-holdings';
const CASH_KEY = 'bs-portfolio-cash';
const TRANSACTIONS_KEY = 'bs-portfolio-transactions';

/** Fired after any mutation so open pages can refresh without a global store. */
export const PORTFOLIO_UPDATED_EVENT = 'bs-portfolio-updated';

/** Starting settlement cash for the demo account. */
export const DEFAULT_CASH_BALANCE = 250_000;

const MAX_TRANSACTIONS = 50;

export type TradeAction = 'invest' | 'withdraw';

export interface PortfolioTransaction {
  id: string;
  action: TradeAction;
  ticker: string;
  companyName: string;
  amount: number;
  price: number;
  shares: number;
  cashAfter: number;
  createdAt: string;
}

export interface TradeRequest {
  action: TradeAction;
  ticker: string;
  companyName: string;
  amount: number;
  price: number;
  riskScore?: number;
}

export interface TradeResult {
  ok: boolean;
  error?: string;
  transaction?: PortfolioTransaction;
  holding?: PortfolioItem;
  cashBalance: number;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* corrupted entry — fall through to default */
  }
  return fallback;
}

/**
 * Allocation percentages are derived using Largest Remainder Method,
 * ensuring they sum to exactly 100.0%.
 */
function recalcAllocations(holdings: PortfolioItem[]): PortfolioItem[] {
  const values = holdings.map((h) => h.shares * (h.price ?? h.avgCost ?? h.costBasis ?? 0));
  const rounded = computeAllocationsLargestRemainder(values, 1);
  return holdings.map((h, idx) => ({
    ...h,
    allocationPct: rounded[idx] ?? 0
  }));
}

function persist(holdings: PortfolioItem[], cash: number): void {
  localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
  localStorage.setItem(CASH_KEY, JSON.stringify(Number(cash.toFixed(2))));
  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT));
}

export function getHoldings(): PortfolioItem[] {
  const stored = readJson<PortfolioItem[] | null>(HOLDINGS_KEY, null);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    const hydrated = stored.map((item) => {
      const seed = INITIAL_PORTFOLIO.find((s) => s.ticker.toUpperCase() === item.ticker?.toUpperCase());
      const price = item.price ?? item.avgCost ?? item.costBasis ?? seed?.price ?? 100;
      const prevClose = item.prevClose ?? seed?.prevClose ?? price;
      return {
        ...item,
        name: item.name || item.companyName || seed?.name || item.ticker,
        companyName: item.companyName || item.name || seed?.companyName || item.ticker,
        sector: item.sector || seed?.sector || 'General',
        price,
        prevClose,
        shares: item.shares ?? seed?.shares ?? 0,
        riskScore: item.riskScore ?? seed?.riskScore ?? 50
      };
    });
    return recalcAllocations(hydrated);
  }
  // First run: seed from the existing mock portfolio so nothing appears empty.
  return recalcAllocations(INITIAL_PORTFOLIO.map((h) => ({ ...h })));
}

export function getCashBalance(): number {
  const stored = readJson<number | null>(CASH_KEY, null);
  return typeof stored === 'number' && Number.isFinite(stored) ? stored : DEFAULT_CASH_BALANCE;
}

export function getTransactions(): PortfolioTransaction[] {
  return readJson<PortfolioTransaction[]>(TRANSACTIONS_KEY, []);
}

export function getHolding(ticker: string): PortfolioItem | undefined {
  const upper = ticker.toUpperCase();
  return getHoldings().find((h) => h.ticker.toUpperCase() === upper);
}

/**
 * Applies an invest (buy) or withdraw (sell) order at the supplied live price.
 *
 * Validation happens before any state is written, so a rejected order never
 * mutates holdings or cash:
 *   invest   — amount must be positive and covered by the cash balance
 *   withdraw — the position must exist and be worth at least the amount
 */
export function executeTrade(request: TradeRequest): TradeResult {
  const { action, companyName, amount, price, riskScore } = request;
  const ticker = request.ticker.toUpperCase();
  const holdings = getHoldings();
  const cash = getCashBalance();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter an amount greater than $0.', cashBalance: cash };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: `No live price is available for $${ticker} right now.`, cashBalance: cash };
  }

  const index = holdings.findIndex((h) => h.ticker.toUpperCase() === ticker);
  const existing = index >= 0 ? holdings[index] : undefined;
  const shares = Number((amount / price).toFixed(4));
  let nextHoldings: PortfolioItem[];
  let nextCash: number;

  if (action === 'invest') {
    if (amount > cash) {
      return {
        ok: false,
        error: `Insufficient funds. Your available cash is $${cash.toLocaleString(undefined, {
          maximumFractionDigits: 2
        })}, but this order needs $${amount.toLocaleString()}.`,
        cashBalance: cash
      };
    }

    if (existing) {
      // Blend the new purchase into the existing position's average cost.
      const totalShares = existing.shares + shares;
      const totalCost = existing.shares * (existing.avgCost || existing.costBasis || price) + amount;
      nextHoldings = [...holdings];
      nextHoldings[index] = {
        ...existing,
        shares: Number(totalShares.toFixed(4)),
        avgCost: Number((totalCost / totalShares).toFixed(2))
      };
    } else {
      nextHoldings = [
        ...holdings,
        {
          id: `port-${ticker.toLowerCase()}-${Date.now()}`,
          ticker,
          companyName,
          name: companyName,
          sector: 'General',
          shares,
          price: Number(price.toFixed(2)),
          prevClose: Number(price.toFixed(2)),
          avgCost: Number(price.toFixed(2)),
          allocationPct: 0,
          riskScore: riskScore ?? 50,
          action: 'Monitor'
        }
      ];
    }
    nextCash = cash - amount;
  } else {
    if (!existing) {
      return { ok: false, error: `You do not hold any $${ticker} to withdraw from.`, cashBalance: cash };
    }

    const positionValue = existing.shares * price;
    if (amount > positionValue) {
      return {
        ok: false,
        error: `Your $${ticker} position is only worth $${positionValue.toLocaleString(undefined, {
          maximumFractionDigits: 2
        })} at the current price, so $${amount.toLocaleString()} cannot be withdrawn.`,
        cashBalance: cash
      };
    }

    const remainingShares = Number((existing.shares - shares).toFixed(4));
    nextHoldings = [...holdings];
    if (remainingShares <= 0.0001) {
      nextHoldings.splice(index, 1); // Position fully closed.
    } else {
      nextHoldings[index] = { ...existing, shares: remainingShares };
    }
    nextCash = cash + amount;
  }

  nextHoldings = recalcAllocations(nextHoldings);

  const transaction: PortfolioTransaction = {
    id: `tx-${Date.now()}`,
    action,
    ticker,
    companyName,
    amount: Number(amount.toFixed(2)),
    price: Number(price.toFixed(2)),
    shares,
    cashAfter: Number(nextCash.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  persist(nextHoldings, nextCash);
  localStorage.setItem(
    TRANSACTIONS_KEY,
    JSON.stringify([transaction, ...getTransactions()].slice(0, MAX_TRANSACTIONS))
  );

  return {
    ok: true,
    transaction,
    holding: nextHoldings.find((h) => h.ticker === ticker),
    cashBalance: nextCash
  };
}