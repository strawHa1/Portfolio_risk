import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Calendar,
  User,
  Zap,
  Tag,
  CheckCircle2,
  X,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Sparkles,
  Layers,
  Radio
} from 'lucide-react';
import { ReportItem, RiskSeverity } from '../../types';
import { INITIAL_REPORTS } from '../../data/mockData';
import { SeverityBadge } from '../common/SeverityBadge';
import { PDFReportExporter } from '../common/PDFReportExporter';

interface ReportsPageProps {
  onNavigate: (path: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-generation & Custom AI Report Generator State
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [topicInput, setTopicInput] = useState('Taiwan Semiconductor Shipping Lead Times');
  const [focusAreaInput, setFocusAreaInput] = useState('Asia-Pacific Maritime Logistics');
  const [severityInput, setSeverityInput] = useState<RiskSeverity>('high');
  const [generating, setGenerating] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/reports', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.reports) && data.reports.length > 0) {
        setReports(data.reports);
        setSelectedReportId((prev) => {
          if (prev && data.reports.some((r: ReportItem) => r.id === prev)) return prev;
          return data.reports[0].id;
        });
      }
    } catch (err: any) {
      console.error('[ReportsPage] Failed to load reports from backend:', err);
      setError(err?.message || 'Could not load archive from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAutoGenerate = async () => {
    if (autoGenerating) return;
    setAutoGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const newReport: ReportItem = await response.json();
      setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
      setSelectedReportId(newReport.id);
    } catch (err: any) {
      console.error('[ReportsPage] Auto-generation failed:', err);
      setError(err?.message || 'Failed to auto-generate report briefing');
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleGenerateCustomReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput,
          focusArea: focusAreaInput,
          preferredSeverity: severityInput
        })
      });

      if (response.ok) {
        const newReport: ReportItem = await response.json();
        setReports((prev) => [newReport, ...prev.filter((r) => r.id !== newReport.id)]);
        setSelectedReportId(newReport.id);
        setShowGenerateModal(false);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.error('[ReportsPage] Failed to generate AI report:', err);
      setError(err?.message || 'Failed to generate custom report');
    } finally {
      setGenerating(false);
    }
  };

  const selectedReport =
    reports.find((r) => r.id === selectedReportId) || reports[0] || INITIAL_REPORTS[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-bold uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4" />
            AI-Generated Financial Threat Intelligence Reports
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">AI Reports Studio</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Automated intelligence briefings synthesized from live critical market & geopolitical signals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleAutoGenerate}
            disabled={autoGenerating}
            className="px-3.5 py-2.5 rounded-xl bg-[#161B2C] border border-purple-500/30 hover:border-purple-500 text-purple-300 hover:text-white font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-50 shadow-md"
            title="Synthesize an automated intelligence briefing from current live news headlines"
          >
            {autoGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Synthesizing Live Briefing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Synthesize Live Daily Brief</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" />
            Generate Custom Report
          </button>
        </div>
      </div>

      {/* Non-blocking error notice */}
      {error && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchReports}
            className="text-amber-300 hover:text-white underline font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Split Layout: Report List Left, Detail Panel Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Reports List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Available Reports Archive ({reports.length})
            </h3>
            <button
              onClick={fetchReports}
              disabled={loading}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              title="Refresh reports archive"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto custom-scrollbar pr-1">
            {loading && reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2 bg-[#0F1420] border border-[#232A3D] rounded-2xl p-6">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <p className="text-xs">Loading intelligence reports archive...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-[#0F1420] border border-[#232A3D] rounded-2xl p-6">
                No reports found in archive. Click &quot;Synthesize Live Daily Brief&quot; to generate one.
              </div>
            ) : (
              reports.map((rep) => {
                const isSelected = selectedReportId === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReportId(rep.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#161B2C] border-purple-500 shadow-xl ring-1 ring-purple-500/30'
                        : 'bg-[#0F1420] border-[#232A3D] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <SeverityBadge severity={rep.severityTag} size="sm" />
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {rep.createdAt}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-2">{rep.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{rep.summary}</p>
                    {rep.tags && rep.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rep.tags.slice(0, 3).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#0F1420] border border-[#232A3D] text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Selected Report Detail Panel */}
        <div className="lg:col-span-2 bg-[#0F1420] border border-[#232A3D] p-6 rounded-2xl shadow-xl space-y-6">
          {selectedReport ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232A3D]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={selectedReport.severityTag} size="md" />
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1 bg-[#161B2C] px-2 py-0.5 rounded-md border border-[#232A3D]">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" /> Published: {selectedReport.createdAt}
                    </span>
                    {selectedReport.triggerSource && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <Radio className="w-3 h-3" /> Live Synthesized
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-extrabold text-white tracking-tight">{selectedReport.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-purple-400" /> Author: {selectedReport.author}
                    </span>
                    {selectedReport.tags && selectedReport.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        {selectedReport.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-[#161B2C] border border-[#232A3D] text-[10px] text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF Exporter Button Component */}
                <div className="shrink-0">
                  <PDFReportExporter report={selectedReport} />
                </div>
              </div>

              {/* Executive Summary Box */}
              <div className="p-4 rounded-xl bg-[#161B2C] border border-[#232A3D] space-y-1.5">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Executive Summary
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.summary}</p>
              </div>

              {/* Dynamic Report Content Sections */}
              <div className="space-y-6">
                {selectedReport.sections && selectedReport.sections.length > 0 ? (
                  selectedReport.sections.map((sec, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-[#232A3D] pb-1.5 flex items-center gap-2">
                        <span className="text-purple-400 font-mono text-xs">0{idx + 1}.</span>
                        {sec.heading}
                      </h3>
                      <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans pl-1">
                        {sec.body}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific analysis sections recorded for this brief.</p>
                )}
              </div>

              {/* Headline References if attached */}
              {selectedReport.headlineReferences && selectedReport.headlineReferences.length > 0 && (
                <div className="p-4 rounded-xl bg-[#121726] border border-[#232A3D] space-y-2 mt-6">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Synthesized From Live Market Headlines
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-400">
                    {selectedReport.headlineReferences.map((refTitle, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-400 shrink-0">•</span>
                        <span className="text-slate-300">{refTitle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              Select a report from the archive to view the full intelligence briefing.
            </div>
          )}
        </div>
      </div>

      {/* Generate Custom Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1420] border border-[#232A3D] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Generate AI Financial Intelligence Brief</h3>
                <p className="text-xs text-slate-400">Specify report topic and focus area for automated synthesis</p>
              </div>
            </div>

            <form onSubmit={handleGenerateCustomReport} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Report Topic
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. Taiwan Semiconductor Shipping Lead Times"
                  className="w-full bg-[#161B2C] border border-[#232A3D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Focus Area / Sector
                </label>
                <input
                  type="text"
                  value={focusAreaInput}
                  onChange={(e) => setFocusAreaInput(e.target.value)}
                  placeholder="e.g. Asia-Pacific Maritime Logistics & Foundry Buffer Stocks"
                  className="w-full bg-[#161B2C] border border-[#232A3D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  Target Severity Level
                </label>
                <select
                  value={severityInput}
                  onChange={(e) => setSeverityInput(e.target.value as RiskSeverity)}
                  className="w-full bg-[#161B2C] border border-[#232A3D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="critical">Critical Severity (Acute Tail Risk)</option>
                  <option value="high">High Risk (Elevated Volatility)</option>
                  <option value="medium">Medium Risk (Monitoring Phase)</option>
                  <option value="low">Low Risk (Informational)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#161B2C] text-slate-300 text-xs font-semibold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Intelligence...</span>
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
