import React, { useState } from 'react';
import {
  Search,
  Building2,
  Flame,
  Globe2,
  FileSpreadsheet,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles
} from 'lucide-react';
import { GlobalEvent, CompanyRisk } from '../../types';
import { INITIAL_COUNTRIES, INITIAL_REPORTS } from '../../data/mockData';
import { SeverityBadge } from '../common/SeverityBadge';
import { LiveStockPrice } from '../common/LiveStockPrice';
import { computeInvestmentRiskSignal } from '../../utils/riskSignal';

interface SearchPageProps {
  onNavigate: (path: string) => void;
  events: GlobalEvent[];
  companies: CompanyRisk[];
  userRiskTolerance?: number;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  onNavigate,
  events,
  companies,
  userRiskTolerance = 55
}) => {
  const [query, setQuery] = useState('Taiwan');
  const [activeTab, setActiveTab] = useState<'all' | 'companies' | 'events' | 'countries' | 'reports'>('all');
  const [reports, setReports] = useState(INITIAL_REPORTS);

  React.useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.reports) && d.reports.length > 0) {
          setReports(d.reports);
        }
      })
      .catch(() => {});
  }, []);

  const matchedCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.ticker.toLowerCase().includes(query.toLowerCase()) ||
      c.sector.toLowerCase().includes(query.toLowerCase())
  );

  const matchedEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      e.region.toLowerCase().includes(query.toLowerCase()) ||
      e.description.toLowerCase().includes(query.toLowerCase())
  );

  const matchedCountries = INITIAL_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.region.toLowerCase().includes(query.toLowerCase())
  );

  const matchedReports = reports.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.summary.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header & Big Search Input */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global Terminal Search</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Search across tickers, live prices, quantitative risk signals, and macro events</p>
        </div>

        <div className="relative max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords (e.g., Taiwan, Semiconductor, Hormuz, NVDA...)"
            className="w-full bg-white dark:bg-[#0F1420] border-2 border-blue-500/50 rounded-2xl px-5 py-4 pl-12 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 font-mono shadow-md dark:shadow-2xl transition-colors"
          />
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 absolute left-4 top-4.5" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#232A3D] pb-1 overflow-x-auto">
        {[
          { id: 'all', label: 'All Results' },
          { id: 'companies', label: `Companies (${matchedCompanies.length})` },
          { id: 'events', label: `Events (${matchedEvents.length})` },
          { id: 'countries', label: `Countries (${matchedCountries.length})` },
          { id: 'reports', label: `Reports (${matchedReports.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Content */}
      <div className="space-y-6">
        {/* Companies Section */}
        {(activeTab === 'all' || activeTab === 'companies') && matchedCompanies.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Matched Companies & Risk Signals ({matchedCompanies.length})
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {matchedCompanies.map((c) => {
                const signal = computeInvestmentRiskSignal(c, 2, userRiskTolerance);

                return (
                  <div
                    key={c.ticker}
                    onClick={() => onNavigate(`/companies?symbol=${c.ticker}`)}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] hover:border-blue-500/50 cursor-pointer transition-all shadow-sm dark:shadow-md space-y-4 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#232A3D]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {c.name}
                          </h4>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
                            ${c.ticker}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{c.sector} • {c.country}</p>
                      </div>

                      {/* Live Price Widget */}
                      <div className="bg-slate-50 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D] px-3 py-2 rounded-xl shrink-0">
                        <LiveStockPrice symbol={c.ticker} size="sm" showDetails={true} />
                      </div>
                    </div>

                    {/* Signal & Score Row */}
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Signal:</span>
                        <span className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 ${
                          signal.label === 'Favorable'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-300'
                            : signal.label === 'Neutral-Hold'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400 border-sky-300'
                            : signal.label === 'Caution'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border-rose-300'
                        }`}>
                          {signal.label}
                        </span>
                      </div>

                      <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        Score: <strong className="text-slate-900 dark:text-white font-bold">{signal.compositeScore}/100</strong>
                        <span className="ml-2 text-[10px] text-slate-400">({signal.confidencePct}% Conf)</span>
                      </div>
                    </div>

                    {/* Key Drivers preview */}
                    <div className="bg-slate-50 dark:bg-[#161B2C] p-3 rounded-xl border border-slate-200 dark:border-[#232A3D] text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="font-bold text-slate-700 dark:text-slate-400 text-[10px] uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" /> Key Drivers:
                      </div>
                      <div className="line-clamp-2">
                        • {signal.keyDrivers.join(' • ')}
                      </div>
                    </div>

                    {/* Capital Loss Warning snippet if applicable */}
                    {signal.isCapitalLossWarning && (
                      <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 p-2.5 rounded-lg border border-rose-200 dark:border-rose-500/20 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 shrink-0" /> Capital Loss Risk Warning Flagged
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-sans hover:underline">Inspect Signal →</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events Section */}
        {(activeTab === 'all' || activeTab === 'events') && matchedEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600 dark:text-red-400" /> Matched Global Events ({matchedEvents.length})
            </h3>

            <div className="space-y-3">
              {matchedEvents.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onNavigate(`/events?id=${e.id}`)}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] hover:border-slate-400 cursor-pointer transition-all space-y-1 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={e.severity} size="sm" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{e.reportedAt}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{e.title}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{e.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
