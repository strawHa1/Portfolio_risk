import {
  BaseHolding,
  ComputedHolding,
  CompositeTailRiskResult,
  HedgeRecommendation,
  formatCurrency,
  formatPercent
} from './portfolioMath';

export interface PortfolioReportData {
  totalValue: number;
  dayChangeDollar: number;
  dayChangePct: number;
  compositeRisk: CompositeTailRiskResult;
  userTolerance: number;
  holdings: ComputedHolding[];
  flaggedHoldings: ComputedHolding[];
  hedgeRecommendation: HedgeRecommendation | null;
  timestamp: string;
}

/**
 * Generates an institutional-grade printable report formatted for PDF export.
 * Opens a print-ready window with custom high-resolution styling.
 */
export function generatePortfolioRiskReportPDF(data: PortfolioReportData): void {
  const isPositiveDay = data.dayChangeDollar >= 0;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Portfolio Risk Intelligence Report - Black Swan</title>
      <style>
        @page {
          size: letter portrait;
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
          background: #FFF;
          margin: 0;
          padding: 20px;
          font-size: 11pt;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #0F172A;
          padding-bottom: 15px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .brand {
          font-size: 20pt;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #0F172A;
        }
        .badge {
          font-size: 8pt;
          font-weight: 800;
          text-transform: uppercase;
          background: #EF4444;
          color: #FFF;
          padding: 4px 10px;
          border-radius: 99px;
          letter-spacing: 0.5px;
        }
        .meta-line {
          font-size: 9pt;
          color: #64748B;
          margin-top: 4px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-card {
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          border-radius: 8px;
          padding: 12px;
        }
        .stat-label {
          font-size: 8pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
          letter-spacing: 0.5px;
        }
        .stat-val {
          font-size: 16pt;
          font-weight: 900;
          font-family: monospace;
          color: #0F172A;
          margin-top: 4px;
        }
        .stat-sub {
          font-size: 9pt;
          margin-top: 4px;
          font-weight: 600;
        }
        .text-green { color: #059669; }
        .text-red { color: #DC2626; }
        .text-amber { color: #D97706; }
        .text-purple { color: #7C3AED; }

        .section-title {
          font-size: 12pt;
          font-weight: 800;
          text-transform: uppercase;
          border-bottom: 1.5px solid #CBD5E1;
          padding-bottom: 6px;
          margin-top: 24px;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
          color: #1E293B;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          margin-bottom: 20px;
        }
        th {
          background: #F1F5F9;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 7.5pt;
          color: #475569;
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #CBD5E1;
        }
        th.text-right, td.text-right { text-align: right; }
        th.text-center, td.text-center { text-align: center; }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #E2E8F0;
        }
        tr:nth-child(even) { background: #FAFAFA; }
        .font-mono { font-family: monospace; }
        .signal-pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 7.5pt;
          font-family: monospace;
        }
        .signal-favorable { background: #DCFCE7; color: #166534; }
        .signal-neutral { background: #E0F2FE; color: #075985; }
        .signal-caution { background: #FEF3C7; color: #92400E; }
        .signal-highrisk { background: #FEE2E2; color: #991B1B; }

        .flagged-box {
          border-left: 4px solid #EF4444;
          background: #FEF2F2;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 9.5pt;
        }
        .hedge-box {
          border-left: 4px solid #8B5CF6;
          background: #F5F3FF;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 9.5pt;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #E2E8F0;
          padding-top: 12px;
          font-size: 8pt;
          color: #94A3B8;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">∆ BLACK SWAN RISK INTELLIGENCE</div>
          <div class="meta-line">Institutional Tail-Risk Audit & Portfolio Shock Calibration</div>
          <div class="meta-line">Generated: ${data.timestamp} &bull; Tolerance Limit: ${data.userTolerance}/100</div>
        </div>
        <div class="badge">
          ${data.flaggedHoldings.length > 0 ? `${data.flaggedHoldings.length} POSITIONS FLAGGED` : 'PORTFOLIO STABLE'}
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="stat-card">
          <div class="stat-label">Total Portfolio Value</div>
          <div class="stat-val">${formatCurrency(data.totalValue)}</div>
          <div class="stat-sub ${isPositiveDay ? 'text-green' : 'text-red'}">
            ${isPositiveDay ? '+' : ''}${formatCurrency(data.dayChangeDollar)} (${isPositiveDay ? '+' : ''}${data.dayChangePct.toFixed(1)}%) Today
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Composite Tail-Risk Score</div>
          <div class="stat-val text-amber">${data.compositeRisk.score} <span style="font-size: 10pt; font-weight: normal; color: #64748B;">/ 100</span></div>
          <div class="stat-sub text-amber">
            ${data.compositeRisk.label} Threat (${data.compositeRisk.topSector.name} ${data.compositeRisk.topSector.allocationPct}%)
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">AI Recommended Hedge</div>
          <div class="stat-val text-purple" style="font-size: 13pt;">
            ${data.hedgeRecommendation ? `$${data.hedgeRecommendation.ticker} Put Options` : 'None Required'}
          </div>
          <div class="stat-sub text-purple">
            ${data.hedgeRecommendation ? `${data.hedgeRecommendation.contractsNeeded} Contracts (${formatCurrency(data.hedgeRecommendation.notionalHedged)} Notional)` : 'Exposure Balanced'}
          </div>
        </div>
      </div>

      <!-- Flagged Warning Banner -->
      ${data.flaggedHoldings.length > 0 ? `
        <div class="flagged-box">
          <strong>CAPITAL DRAWDOWN WARNING (${data.flaggedHoldings.length} POSITIONS FLAGGED):</strong><br/>
          Elevated tail-risk detected for: <strong>${data.flaggedHoldings.map((f) => `$${f.ticker} (${f.riskScore}/100)`).join(', ')}</strong>.
          These positions exceed your configured risk tolerance limit (${data.userTolerance}/100).
        </div>
      ` : ''}

      <!-- Holdings Table -->
      <div class="section-title">Portfolio Holdings & Live Risk Signal Calibration</div>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Sector</th>
            <th class="text-right">Shares</th>
            <th class="text-right">Price</th>
            <th class="text-right">Position Value</th>
            <th class="text-right">Allocation</th>
            <th class="text-center">Risk Score</th>
            <th class="text-center">Signal Band</th>
          </tr>
        </thead>
        <tbody>
          ${data.holdings.map((h) => {
            const signalClass =
              h.signalBand.band === 'Favorable'
                ? 'signal-favorable'
                : h.signalBand.band === 'Neutral-Hold'
                ? 'signal-neutral'
                : h.signalBand.band === 'Caution'
                ? 'signal-caution'
                : 'signal-highrisk';

            return `
              <tr>
                <td><strong>$${h.ticker}</strong> - ${h.name}</td>
                <td>${h.sector}</td>
                <td class="text-right font-mono">${h.shares}</td>
                <td class="text-right font-mono">$${h.price.toFixed(2)}</td>
                <td class="text-right font-mono font-bold">${formatCurrency(h.positionValue)}</td>
                <td class="text-right font-mono font-bold">${formatPercent(h.allocationPct, 1)}</td>
                <td class="text-center font-mono font-bold">${h.riskScore}/100</td>
                <td class="text-center">
                  <span class="signal-pill ${signalClass}">${h.signalBand.label}</span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <!-- Hedging Protocol -->
      ${data.hedgeRecommendation ? `
        <div class="section-title">AI Prescribed Tail-Risk Mitigation Protocol</div>
        <div class="hedge-box">
          <strong>Recommended Action:</strong> ${data.hedgeRecommendation.actionTitle}<br/>
          <strong>Strategy Parameters:</strong> ${data.hedgeRecommendation.strategyDescription} &bull; Sizing: ${data.hedgeRecommendation.contractsNeeded} Contracts (${formatCurrency(data.hedgeRecommendation.notionalHedged)} Notional Hedged) &bull; Suggested Strike: ~$${data.hedgeRecommendation.suggestedStrike} (8% OTM) &bull; Expiration: ${data.hedgeRecommendation.expiration}.<br/>
          <span style="font-size: 8.5pt; color: #64748B; margin-top: 4px; display: inline-block;">
            *${data.hedgeRecommendation.disclaimer}
          </span>
        </div>
      ` : ''}

      <div class="footer">
        CONFIDENTIAL - INSTITUTIONAL RISK AUDIT - BLACK SWAN FINANCIAL INTELLIGENCE PLATFORM
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
