import React, { useEffect } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { HedgeRecommendation, formatCurrency, formatPercent } from '../../utils/portfolioMath';

interface HedgePlanModalProps {
  hedge: HedgeRecommendation;
  onClose: () => void;
  onNavigateToCompany: (ticker: string) => void;
}

export const HedgePlanModal: React.FC<HedgePlanModalProps> = ({
  hedge,
  onClose,
  onNavigateToCompany
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const estimatedPremiumPerShare = Number((hedge.price * 0.028).toFixed(2));
  const totalEstimatedCost = Math.round(estimatedPremiumPerShare * hedge.shares);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hedge-plan-title"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-[#232A3D] rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-[#232A3D] bg-purple-500/10 dark:bg-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="hedge-plan-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                  Institutional Hedge Plan — ${hedge.ticker}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {hedge.companyName} &bull; Tail-Risk Mitigation Protocol
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#232A3D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Strategy Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D] space-y-2">
            <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Recommended Protective Strategy
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {hedge.actionTitle}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Provides asymmetric downside insurance against extreme geopolitical or supply chain shocks while preserving long-term stock equity upside.
            </p>
          </div>

          {/* Sizing & Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D]">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Notional Hedged
              </span>
              <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrency(hedge.notionalHedged)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D]">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Contracts Needed
              </span>
              <div className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                {hedge.contractsNeeded} ({hedge.shares} shs)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D]">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Strike Price
              </span>
              <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-1">
                ${hedge.suggestedStrike} (~8% OTM)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D]">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Expiration
              </span>
              <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-1">
                {hedge.expiration}
              </div>
            </div>
          </div>

          {/* Estimated Cost & Payoff */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
            <div className="font-bold text-blue-600 dark:text-blue-300 flex items-center justify-between">
              <span>Estimated Hedge Premium Cost</span>
              <span className="font-mono">{formatCurrency(totalEstimatedCost)} (~2.8% of notional)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Maximum loss on this position is capped below ${hedge.suggestedStrike} strike. If a tail-risk event triggers an adverse drop, option gains offset holding losses dollar-for-dollar below strike.
            </p>
          </div>

          {/* Execution Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Broker Execution Steps
            </h4>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Log into brokerage account containing ${hedge.ticker} equity shares.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Select ${hedge.ticker} Put Options chain expiring in ~60 days with strike around ${hedge.suggestedStrike}.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Submit Buy to Open limit order for {hedge.contractsNeeded} contract{hedge.contractsNeeded > 1 ? 's' : ''}.
                </span>
              </div>
            </div>
          </div>

          {/* Non-blocking Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#161B2C] border border-slate-200 dark:border-[#232A3D] text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span>{hedge.disclaimer}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#232A3D] bg-slate-50/50 dark:bg-[#161B2C]/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToCompany(hedge.ticker);
            }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Open ${hedge.ticker} Company Analysis →
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
