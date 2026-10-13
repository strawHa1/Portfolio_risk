import { useState, useEffect, useRef, useCallback } from 'react';
import { StockQuote } from '../types';

export interface EnrichedQuote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  percentChange: number;
  isMarketOpen: boolean;
  lastUpdatedFormatted: string;
  fetchedAt: number;
  isStale: boolean;
  error?: string | null;
}

interface UsePortfolioQuotesReturn {
  quotes: Record<string, EnrichedQuote>;
  loading: boolean;
  refreshingTickers: Record<string, boolean>;
  refreshTicker: (symbol: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

function formatLocalTime(isoOrTimestamp?: string | number): string {
  try {
    const d = isoOrTimestamp ? new Date(isoOrTimestamp) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleTimeString();
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return new Date().toLocaleTimeString();
  }
}

/**
 * Custom hook to manage real-time quote feeds for portfolio holdings.
 * Features:
 * - 20s polling interval
 * - Request de-duplication for batch & individual fetches
 * - Exponential backoff retry on API failures
 * - Preserves last-known good quote on errors with warning state
 * - Identifies stale data (>60s)
 */
export function usePortfolioQuotes(
  symbols: string[],
  initialQuotes: Array<{ ticker: string; price: number; prevClose: number }> = [],
  pollIntervalMs = 20000
): UsePortfolioQuotesReturn {
  // Pre-seed with existing holdings data so the UI has immediate numbers with zero layout shift
  const [quotes, setQuotes] = useState<Record<string, EnrichedQuote>>(() => {
    const initial: Record<string, EnrichedQuote> = {};
    const now = Date.now();
    for (const item of initialQuotes) {
      const sym = item.ticker.toUpperCase();
      const change = Number((item.price - item.prevClose).toFixed(2));
      const pct = item.prevClose > 0 ? Number(((change / item.prevClose) * 100).toFixed(2)) : 0;
      initial[sym] = {
        symbol: sym,
        price: item.price,
        previousClose: item.prevClose,
        change,
        percentChange: pct,
        isMarketOpen: true,
        lastUpdatedFormatted: formatLocalTime(now),
        fetchedAt: now,
        isStale: false
      };
    }
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [refreshingTickers, setRefreshingTickers] = useState<Record<string, boolean>>({});

  const isMounted = useRef(true);
  const isBatchInFlight = useRef(false);
  const inFlightSymbols = useRef<Set<string>>(new Set());
  const retryCount = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanSymbols = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean);

  const enrichRawQuote = (raw: StockQuote, errorMsg?: string | null): EnrichedQuote => {
    const price = Number(raw.price || 0);
    const previousClose = Number(raw.previousClose || price);
    const change = Number((price - previousClose).toFixed(2));
    const percentChange =
      previousClose > 0 ? Number(((change / previousClose) * 100).toFixed(2)) : 0;
    const now = Date.now();

    return {
      symbol: raw.symbol.toUpperCase(),
      price,
      previousClose,
      change,
      percentChange,
      isMarketOpen: Boolean(raw.isMarketOpen),
      lastUpdatedFormatted: formatLocalTime(raw.lastUpdated || now),
      fetchedAt: now,
      isStale: false,
      error: errorMsg || null
    };
  };

  /**
   * Fetch all symbols in batch with de-duplication and exponential backoff
   */
  const fetchBatch = useCallback(async () => {
    if (cleanSymbols.length === 0 || isBatchInFlight.current) return;
    isBatchInFlight.current = true;

    try {
      const query = encodeURIComponent(cleanSymbols.join(','));
      const response = await fetch(`/api/stocks/quotes?symbols=${query}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: Record<string, StockQuote> = await response.json();
      if (!isMounted.current) return;

      setQuotes((prev) => {
        const next = { ...prev };
        for (const [sym, q] of Object.entries(data)) {
          const upper = sym.toUpperCase();
          next[upper] = enrichRawQuote(q);
        }
        return next;
      });

      retryCount.current = 0; // reset retry count on success
    } catch (err: unknown) {
      if (!isMounted.current) return;
      const errorMsg = err instanceof Error ? err.message : 'Network error';

      // Keep previous quotes and flag error state
      setQuotes((prev) => {
        const next = { ...prev };
        for (const sym of cleanSymbols) {
          if (next[sym]) {
            next[sym] = {
              ...next[sym],
              error: errorMsg,
              isStale: Date.now() - next[sym].fetchedAt > 60000
            };
          }
        }
        return next;
      });

      // Exponential backoff retry: 2s, 4s, 8s, up to 30s
      retryCount.current += 1;
      const delay = Math.min(30000, Math.pow(2, retryCount.current) * 1000);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          fetchBatch();
        }
      }, delay);
    } finally {
      isBatchInFlight.current = false;
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [cleanSymbols.join(',')]);

  /**
   * Refresh a single ticker manually with spinning animation
   */
  const refreshTicker = useCallback(async (symbol: string) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym || inFlightSymbols.current.has(sym)) return;

    inFlightSymbols.current.add(sym);
    setRefreshingTickers((prev) => ({ ...prev, [sym]: true }));

    try {
      const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(sym)}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: StockQuote = await response.json();
      if (!isMounted.current) return;

      setQuotes((prev) => ({
        ...prev,
        [sym]: enrichRawQuote(data)
      }));
    } catch (err: unknown) {
      if (!isMounted.current) return;
      const errorMsg = err instanceof Error ? err.message : 'Fetch failed';
      setQuotes((prev) => {
        if (!prev[sym]) return prev;
        return {
          ...prev,
          [sym]: {
            ...prev[sym],
            error: errorMsg,
            isStale: Date.now() - prev[sym].fetchedAt > 60000
          }
        };
      });
    } finally {
      inFlightSymbols.current.delete(sym);
      if (isMounted.current) {
        setRefreshingTickers((prev) => ({ ...prev, [sym]: false }));
      }
    }
  }, []);

  // Polling lifecycle
  useEffect(() => {
    isMounted.current = true;
    fetchBatch();

    const interval = setInterval(() => {
      fetchBatch();
    }, pollIntervalMs);

    // Stale check interval (checks every 10s if any quote >60s old)
    const staleInterval = setInterval(() => {
      if (!isMounted.current) return;
      const now = Date.now();
      setQuotes((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [sym, q] of Object.entries(next)) {
          const stale = now - q.fetchedAt > 60000;
          if (q.isStale !== stale) {
            next[sym] = { ...q, isStale: stale };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      clearInterval(staleInterval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [fetchBatch, pollIntervalMs]);

  return {
    quotes,
    loading,
    refreshingTickers,
    refreshTicker,
    refreshAll: fetchBatch
  };
}
