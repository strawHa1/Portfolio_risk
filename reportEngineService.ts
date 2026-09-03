/**
 * Automated Threat Intelligence Briefing & AI Reports Engine.
 * Ingests live critical news, classifies severity, clusters themes,
 * synthesizes structured intelligence reports via Gemini (with fallback),
 * and maintains an append-only archive.
 */

import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { GoogleGenAI } from '@google/genai';
import { fetchHeadlines, NewsArticle } from './newsApi.js';
import { getImpactState } from './impactService.js';
import { getGeminiApiKey } from './envConfig.js';
import { GEMINI_CHAT_MODELS, logRawGeminiError } from './geminiClient.js';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ReportSection {
  heading: string;
  body: string;
}

export interface ReportItem {
  id: string;
  title: string;
  summary: string;
  severityTag: RiskSeverity;
  createdAt: string; // YYYY-MM-DD
  author: string;
  tags: string[];
  sections: ReportSection[];
  triggerSource?: string;
  headlineReferences?: string[];
}

const REPORTS_CACHE_FILE = path.join(process.cwd(), '.cache', 'reports-archive.json');
let reportsMemoryCache: ReportItem[] | null = null;
let isGeneratingReport = false;
let reportBackgroundTimer: NodeJS.Timeout | null = null;

const SEED_HISTORICAL_REPORTS: ReportItem[] = [
  {
    id: 'rep-seed-2026-07',
    title: 'Q3 Global Tail Risk Intelligence Briefing',
    summary: 'Comprehensive analysis of East Asian semiconductor bottlenecks, Middle Eastern oil chokepoint escalations, and cross-border cyber threat vectors.',
    severityTag: 'critical',
    createdAt: '2026-07-22',
    author: 'Black Swan AI Intelligence Desk',
    tags: ['Semiconductors', 'Geopolitics', 'Oil & Gas', 'Cyber Risk'],
    sections: [
      {
        heading: 'Executive Overview',
        body: 'Global financial markets face heightened systemic risk driven by simultaneous friction across two strategic maritime transit corridors: the Taiwan Strait and the Strait of Hormuz. Semiconductor hardware availability and energy logistics present acute short-term price shock vulnerabilities.'
      },
      {
        heading: 'Semiconductor Bottleneck Analysis',
        body: 'Over 88% of advanced sub-5nm chips pass through foundry facilities in western Taiwan. A 14-day maritime quarantine would halt $480B in downstream electronics assembly across North America and Western Europe.'
      },
      {
        heading: 'Energy Market Contagion Vectors',
        body: 'Crude oil transit through Hormuz accounts for 21% of global liquid petroleum consumption. War risk insurance spikes are already adding $2.40 per barrel in spot transport overhead.'
      },
      {
        heading: 'Strategic Portfolio Action Plan',
        body: '1. Rebalance concentrated tech hardware weightings into aerospace & defense hedges.\n2. Purchase out-of-the-money energy volatility hedges.\n3. Establish emergency cash buffer reserves.'
      }
    ]
  },
  {
    id: 'rep-seed-2026-06',
    title: 'Rare Earth Supply Chain Vulnerability Assessment',
    summary: 'Detailed evaluation of heavy rare earth processing monopolies and impact on defense guidance systems and EV powertrain manufacturing.',
    severityTag: 'high',
    createdAt: '2026-07-15',
    author: 'Black Swan Quantitative Research',
    tags: ['Supply Chain', 'Rare Earths', 'Defense', 'EVs'],
    sections: [
      {
        heading: 'Executive Overview',
        body: 'Heavy rare earth supply lines (specifically dysprosium and terbium) face escalating regulatory export friction. Defense and renewable industrial supply chains maintain fragile 60-day buffer stocks.'
      },
      {
        heading: 'Monopoly Dynamics & Chokepoints',
        body: 'Processing capacity for heavy rare earths remains 90% concentrated. Domestic inventory buffers at Tier-1 defense contractors average 60 to 90 days before assembly curtailment.'
      },
      {
        heading: 'Strategic Portfolio Action Plan',
        body: '1. Overweight alternative mineral refiners in allied jurisdictions.\n2. Hedge Tier-1 defense hardware delivery timelines.'
      }
    ]
  }
];

export function getReportsArchive(): ReportItem[] {
  if (reportsMemoryCache) return reportsMemoryCache;

  try {
    if (fs.existsSync(REPORTS_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(REPORTS_CACHE_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        reportsMemoryCache = data;
        return reportsMemoryCache!;
      }
    }
  } catch (e) {
    console.warn('[Reports] Error reading reports archive, initializing fallback:', e);
  }

  // Pre-seed if missing
  reportsMemoryCache = [...SEED_HISTORICAL_REPORTS];
  saveReportsArchive(reportsMemoryCache);
  return reportsMemoryCache;
}

export function saveReportsArchive(reports: ReportItem[]): void {
  try {
    reportsMemoryCache = reports;
    const dir = path.dirname(REPORTS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REPORTS_CACHE_FILE, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Reports] Error saving reports archive to disk:', e);
  }
}

export function getReportById(id: string): ReportItem | undefined {
  const all = getReportsArchive();
  return all.find((r) => r.id === id);
}

interface NewsCluster {
  topic: string;
  focusArea: string;
  severity: RiskSeverity;
  tags: string[];
  headlines: NewsArticle[];
}

/**
 * Classifies news by risk keywords and clusters into thematic topic groups.
 */
export function clusterCriticalNews(articles: NewsArticle[]): NewsCluster[] {
  const clusters: Record<string, { topic: string; focusArea: string; severity: RiskSeverity; tags: string[]; headlines: NewsArticle[] }> = {
    semiconductor: {
      topic: 'Semiconductor Supply Chain & Global Chip Sovereignty',
      focusArea: 'Advanced Foundry Capacity, Export Restrictions & AI Hardware',
      severity: 'critical',
      tags: ['Semiconductors', 'Geopolitics', 'Hardware', 'Supply Chain'],
      headlines: []
    },
    energy: {
      topic: 'Global Energy Security & Maritime Chokepoints',
      focusArea: 'Crude Oil Logistics, Strait of Hormuz & Refining Vulnerabilities',
      severity: 'high',
      tags: ['Energy', 'Oil & Gas', 'Shipping', 'Middle East'],
      headlines: []
    },
    defense: {
      topic: 'Geopolitical Conflict & Defense Procurement Vectors',
      focusArea: 'NATO Defense Spending, Missile Systems & Aerospace Backlogs',
      severity: 'high',
      tags: ['Defense', 'Aerospace', 'Geopolitics', 'Security'],
      headlines: []
    },
    macro: {
      topic: 'Central Bank Liquidity & Sovereign Tail-Risk Contagion',
      focusArea: 'Interest Rates, Treasury Yield Volatility & Debt Pressures',
      severity: 'medium',
      tags: ['Macroeconomic', 'Central Banks', 'Rates', 'Liquidity'],
      headlines: []
    },
    trade: {
      topic: 'Global Trade Sanctions & Strategic Export Barriers',
      focusArea: 'Tariff Escalations, Rare Earths & Cross-Border Logistics',
      severity: 'medium',
      tags: ['Trade War', 'Tariffs', 'Supply Chain', 'Regulation'],
      headlines: []
    }
  };

  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase();

    if (/\b(taiwan|tsmc|nvidia|asml|semiconductor|chip|foundry|lithography|gpu|ai hardware|tech)\b/i.test(text)) {
      clusters.semiconductor.headlines.push(a);
    }
    if (/\b(oil|crude|opec|hormuz|red sea|tanker|pipeline|energy|gas|lng|petroleum)\b/i.test(text)) {
      clusters.energy.headlines.push(a);
    }
    if (/\b(military|defense|nato|lockheed|raytheon|missile|pentagon|war|conflict|fighter jet|security)\b/i.test(text)) {
      clusters.defense.headlines.push(a);
    }
    if (/\b(fed|federal reserve|interest rate|yield|inflation|treasury|central bank|liquidity|debt|stocks?|market)\b/i.test(text)) {
      clusters.macro.headlines.push(a);
    }
    if (/\b(sanction|tariff|trade war|export control|customs|embargo|duty|china|trade)\b/i.test(text)) {
      clusters.trade.headlines.push(a);
    }
  }

  return Object.values(clusters).filter((c) => c.headlines.length > 0);
}

/**
 * Deterministic fallback generator when Gemini API is offline or unavailable.
 */
function generateDeterministicReport(
  topic: string,
  focusArea: string,
  severity: RiskSeverity,
  tags: string[],
  headlines: NewsArticle[],
  dateStr: string
): ReportItem {
  const headlineBullets = headlines.slice(0, 5).map((h) => `• ${h.title} (${h.source})`).join('\n');
  const headlineTitles = headlines.slice(0, 4).map((h) => h.title);

  return {
    id: `rep-${Date.now()}`,
    title: `${topic} Intelligence Brief`,
    summary: `Automated strategic risk assessment covering ${focusArea}. Evaluation synthesized from ${headlines.length} live market and geopolitical headlines.`,
    severityTag: severity,
    createdAt: dateStr,
    author: 'Black Swan AI Intelligence Desk',
    tags: tags.length ? tags : ['Risk Intelligence', 'Markets'],
    sections: [
      {
        heading: 'Executive Overview',
        body: `Elevated systemic volatility and market cross-currents require defensive capital alignment across ${focusArea}. Recent developments indicate accelerating operational friction across primary transmission channels.\n\nTriggering Market Signals:\n${headlineBullets || '• Monitoring live geopolitical and financial news feeds.'}`
      },
      {
        heading: 'Transmission Channels & Key Risk Drivers',
        body: `The primary mechanism of market transmission centers on supply constraints, regulatory compliance overhead, and liquidity adjustments. Downstream asset classes are repricing risk premiums in response to:\n1. Accelerated supply chain lead times and cross-border customs friction.\n2. Heightened volatility in raw material and component procurement costs.\n3. Sector-wide margin compression among unhedged corporate operators.`
      },
      {
        heading: 'Market & Sector Exposure Analysis',
        body: `Core industry sectors exhibit diverging sensitivity to these emerging risk drivers:\n• Overweight Exposure: Technology hardware, industrial logistics, and trade-sensitive manufacturing.\n• Neutral/Defensive: Regulated utilities, high-dividend infrastructure, and domestic healthcare.\n• Hedge Beneficiaries: Aerospace & defense contractors, energy producers with localized supply networks.`
      },
      {
        heading: 'Strategic Portfolio Action Plan',
        body: `1. Implement targeted tail-risk volatility hedges on high-beta equity allocations.\n2. Audit component and energy cost sensitivity across portfolio holdings.\n3. Rebalance capital toward defensive cash equivalents and multi-year defense backlogs.\n4. Maintain strict trailing stop-losses on concentrated single-stock exposures.`
      }
    ],
    triggerSource: 'deterministic-engine',
    headlineReferences: headlineTitles
  };
}

/**
 * Main report generation function: Synthesizes live news into a structured intelligence report via Gemini (or fallback).
 */
export async function generateIntelligenceReport(params?: {
  topic?: string;
  focusArea?: string;
  preferredSeverity?: RiskSeverity;
}): Promise<ReportItem> {
  const today = new Date().toISOString().split('T')[0];
  const { articles: liveHeadlines } = await fetchHeadlines('all', 40);
  const impactState = getImpactState();
  const clusters = clusterCriticalNews(liveHeadlines);

  // Pick best cluster or use user params
  let topic = params?.topic;
  let focusArea = params?.focusArea;
  let severity: RiskSeverity = params?.preferredSeverity || 'high';
  let tags: string[] = ['Risk Intelligence', 'Markets'];
  let relevantHeadlines = liveHeadlines.slice(0, 8);

  if (!topic && clusters.length > 0) {
    // Sort clusters by number of headlines & severity
    clusters.sort((a, b) => {
      const sevScore = { critical: 4, high: 3, medium: 2, low: 1 };
      return (sevScore[b.severity] - sevScore[a.severity]) || (b.headlines.length - a.headlines.length);
    });
    const topCluster = clusters[0];
    topic = topCluster.topic;
    focusArea = topCluster.focusArea;
    severity = topCluster.severity;
    tags = topCluster.tags;
    relevantHeadlines = topCluster.headlines.slice(0, 8);
  } else if (!topic) {
    topic = 'Global Market Tail-Risk & Geopolitical Transmission Brief';
    focusArea = 'Macroeconomic Shock Vectors & Supply Chain Chokepoints';
    severity = 'high';
  }

  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'black-swan-reports' } } });
      const headlinesContext = relevantHeadlines
        .map((h, i) => `[${i + 1}] "${h.title}" (Source: ${h.source}, Published: ${h.publishedAt})`)
        .join('\n');

      const impactContext = impactState.impactedCompanies
        .slice(0, 6)
        .map((c) => `• ${c.companyName} (${c.ticker}): ${c.headline} [Price Move: ${c.actualChangePct}%]`)
        .join('\n');

      const prompt = `You are the Chief Risk Officer at Black Swan Financial Intelligence Desk.
Generate an authoritative, institutional-grade Financial Risk Intelligence Briefing based on these live real-world signals.

Topic: "${topic}"
Focus Area: "${focusArea}"
Target Severity: ${severity}

Live News Signals:
${headlinesContext || '(Synthesize from current macroeconomic developments)'}

Live Company Impacts:
${impactContext || '(Synthesize from global market indicators)'}

Generate a structured JSON report matching this EXACT schema:
{
  "title": string (e.g. "${topic}: Tactical Risk Intelligence Brief"),
  "summary": string (2-3 paragraphs synthesizing executive risk implications),
  "severityTag": "critical" | "high" | "medium" | "low",
  "tags": [string] (3-5 relevant tags),
  "sections": [
    {
      "heading": "Executive Overview",
      "body": string (comprehensive high-level briefing summarizing the situation and immediate market threats)
    },
    {
      "heading": "Transmission Channels & Threat Vectors",
      "body": string (detailed analysis of how these specific news events transmit into financial shocks, logistics bottlenecks, or commodity price swings)
    },
    {
      "heading": "Market & Sector Exposure Analysis",
      "body": string (specific sector breakdown detailing which industries face acute downside and which act as defensive hedges)
    },
    {
      "heading": "Strategic Portfolio Action Plan",
      "body": string (concrete, numbered recommendations for capital preservation, hedging, and rebalancing)
    }
  ]
}

Return JSON ONLY. No conversational filler.`;

      for (const model of GEMINI_CHAT_MODELS) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });

          const text = (res.text || '').trim();
          if (!text) continue;

          const parsed = JSON.parse(text);
          if (parsed && parsed.title && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            const report: ReportItem = {
              id: `rep-${Date.now()}`,
              title: parsed.title,
              summary: parsed.summary || 'AI-generated threat intelligence brief.',
              severityTag: (parsed.severityTag as RiskSeverity) || severity,
              createdAt: today,
              author: 'Black Swan AI Intelligence Desk',
              tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : tags,
              sections: parsed.sections.map((s: any) => ({
                heading: String(s.heading || 'Analysis Section'),
                body: String(s.body || '')
              })),
              triggerSource: 'gemini-ai',
              headlineReferences: relevantHeadlines.slice(0, 4).map((h) => h.title)
            };

            const existing = getReportsArchive();
            saveReportsArchive([report, ...existing]);
            console.log(`[Reports] Successfully generated and archived new AI Report: "${report.title}"`);
            return report;
          }
        } catch (err) {
          logRawGeminiError(`report generation with model ${model}`, err);
        }
      }
    } catch (e) {
      console.warn('[Reports] Gemini generation failed, using deterministic intelligence generator:', e);
    }
  }

  // Deterministic fallback if Gemini is offline
  const fallbackReport = generateDeterministicReport(
    topic,
    focusArea,
    severity,
    tags,
    relevantHeadlines,
    today
  );
  const existing = getReportsArchive();
  saveReportsArchive([fallbackReport, ...existing]);
  console.log(`[Reports] Generated and archived deterministic AI Report: "${fallbackReport.title}"`);
  return fallbackReport;
}

/**
 * Initializes the report engine on server startup:
 * Ensures the archive is loaded and a report for today exists.
 */
export async function initReportEngine(): Promise<void> {
  const reports = getReportsArchive();
  const today = new Date().toISOString().split('T')[0];
  const hasReportToday = reports.some((r) => r.createdAt === today);

  console.log(`[Reports] Engine initialized with ${reports.length} archived reports (Today has report: ${hasReportToday})`);

  if (!hasReportToday) {
    console.log('[Reports] No report for today found, triggering automated daily synthesis...');
    generateIntelligenceReport().catch((err) => console.error('[Reports] Auto-generation failed on boot:', err));
  }
}

/**
 * Background worker to automatically synthesize a daily threat intelligence briefing.
 */
export function startReportBackgroundWorker(intervalHours = 6): void {
  const ms = intervalHours * 60 * 60 * 1000;
  if (reportBackgroundTimer) clearInterval(reportBackgroundTimer);
  reportBackgroundTimer = setInterval(async () => {
    const today = new Date().toISOString().split('T')[0];
    const reports = getReportsArchive();
    const hasToday = reports.some((r) => r.createdAt === today);
    if (!hasToday && !isGeneratingReport) {
      isGeneratingReport = true;
      try {
        console.log('[Reports] Running scheduled automated daily briefing synthesis...');
        await generateIntelligenceReport();
      } catch (err) {
        console.error('[Reports] Scheduled briefing synthesis failed:', err);
      } finally {
        isGeneratingReport = false;
      }
    }
  }, ms);
  console.log(`[Reports] Background intelligence worker scheduled (every ${intervalHours}h)`);
}

export function startReportEngineCron(): void {
  // Scheduled daily report generation at 06:00 UTC
  cron.schedule('0 6 * * *', async () => {
    console.log('[Reports] Daily 06:00 UTC cron trigger: generating daily intelligence briefing...');
    try {
      await generateIntelligenceReport();
    } catch (e) {
      console.error('[Reports] Cron daily generation failed:', e);
    }
  });
  startReportBackgroundWorker(6);
}
