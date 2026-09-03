import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ImpactStoreState, StockImpactRecord, ImpactSeverity } from '../types';

const PRICE_POLL_MS = 30_000;

export type ImpactSortKey = 'severity' | 'impact' | 'recent';
export type ImpactFilterSector = 'all' | string;
export type ImpactFilterRegion = 'all' | string;

async function fetchImpactState(): Promise<ImpactStoreState> {
  const res = await fetch('/api/impact', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function triggerImpactRefresh(): Promise<ImpactStoreState> {
  const res = await fetch('/api/impact/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Refresh failed');
  return data;
}

const SEVERITY_ORDER: Record<ImpactSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function useImpactData() {
  const [state, setState] = useState<ImpactStoreState>({
    impactedCompanies: [],
    lastUpdated: null,
    lastPriceUpdated: null,
    isLoading: true,
    error: null,
    source: 'none'
  });
  const [sortBy, setSortBy] = useState<ImpactSortKey>('severity');
  const [filterSector, setFilterSector] = useState<ImpactFilterSector>('all');
  const [filterRegion, setFilterRegion] = useState<ImpactFilterRegion>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const isMounted = useRef(true);
  const refreshingRef = useRef(false);

  // Tick current time every 10 seconds to keep "Updated X ago" accurate without lag
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMounted.current) setCurrentTime(Date.now());
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchImpactState();
      if (isMounted.current) {
        setState((prev) => ({
          ...data,
          isLoading: false,
          error: data.error || null
        }));
      }
    } catch (e: any) {
      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: e?.message || 'Failed to load impact data'
        }));
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const data = await triggerImpactRefresh();
      if (isMounted.current) {
        setState((prev) => ({
          ...data,
          isLoading: false,
          error: null
        }));
      }
    } catch (e: any) {
      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          error: e?.message || 'Refresh failed'
        }));
      }
    } finally {
      refreshingRef.current = false;
      if (isMounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    load();
    const dataTimer = setInterval(load, PRICE_POLL_MS);
    return () => {
      isMounted.current = false;
      clearInterval(dataTimer);
    };
  }, [load]);

  const sectors = useMemo(
    () => ['all', ...new Set(state.impactedCompanies.map((r) => r.sector))],
    [state.impactedCompanies]
  );

  const regions = useMemo(
    () => ['all', ...new Set(state.impactedCompanies.map((r) => r.region))],
    [state.impactedCompanies]
  );

  const filteredAndSorted: StockImpactRecord[] = useMemo(() => {
    let list = [...state.impactedCompanies];
    if (filterSector !== 'all') list = list.filter((r) => r.sector === filterSector);
    if (filterRegion !== 'all') list = list.filter((r) => r.region === filterRegion);

    list.sort((a, b) => {
      if (sortBy === 'severity') {
        const sev = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
        if (sev !== 0) return sev;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      if (sortBy === 'impact') {
        const mag = Math.abs(b.actualChangePct) - Math.abs(a.actualChangePct);
        if (mag !== 0) return mag;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    return list;
  }, [state.impactedCompanies, sortBy, filterSector, filterRegion]);

  const timestampMs = state.lastUpdated ? new Date(state.lastUpdated).getTime() : null;
  const elapsedMs = timestampMs ? Math.max(0, currentTime - timestampMs) : null;
  const minutesAgo = elapsedMs !== null ? Math.floor(elapsedMs / 60000) : null;

  const timeAgoLabel = useMemo(() => {
    if (elapsedMs === null) return 'Never';
    if (elapsedMs < 45_000) return 'just now';
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }, [elapsedMs]);

  return {
    ...state,
    filteredImpacts: filteredAndSorted,
    sortBy,
    setSortBy,
    filterSector,
    setFilterSector,
    filterRegion,
    setFilterRegion,
    sectors,
    regions,
    refresh,
    refreshing,
    minutesAgo,
    timeAgoLabel,
    reload: load
  };
}
