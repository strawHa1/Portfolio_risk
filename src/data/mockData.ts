import {
  GlobalEvent,
  CompanyRisk,
  CountryRisk,
  PortfolioItem,
  AlertItem,
  ReportItem,
  UserProfile,
  AppSettings
} from '../types';

export const INITIAL_USER: UserProfile = {
  name: 'John Doe',
  email: 'j.doe@blackswan-intel.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  plan: 'Premium Plan',
  company: 'Aegis Capital Risk Management',
  role: 'Chief Risk Officer'
};

export const INITIAL_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'English (US)',
  timezone: 'UTC -5 (Eastern Time)',
  enableAnimations: true,
  autoRefreshIntervalSec: 15,
  emailAlerts: true,
  pushAlerts: true,
  criticalOnlyAlerts: false,
  finnhubApiKey: ''
};

export const INITIAL_COMPANIES: CompanyRisk[] = [
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: 'Semiconductors',
    country: 'United States',
    marketCap: '$3.12T',
    riskScore: 78,
    sentimentScore: 38,
    sentimentLabel: 'Bearish',
    description: 'Leader in GPU computing and AI infrastructure facing acute semiconductor export control risks and supply chain concentration in East Asia.',
    keyRisks: [
      'High supply chain exposure to Taiwan foundry bottleneck (TSMC)',
      'Tightening U.S. export controls on high-performance AI chips to Asia',
      'Geopolitical tensions in the Taiwan Strait impacting production continuity'
    ],
    aiSummary: 'NVIDIA exhibits high systemic exposure to East Asian semiconductor supply chains. While revenue growth remains strong, potential export sanctions and regional maritime disruptions represent critical tail risk.',
    recentNews: [
      { title: 'New Semiconductor Export Restrictions Imposed on Advanced AI Accelerators', source: 'Financial Times', time: '2h ago', sentiment: 'negative' },
      { title: 'Taiwan Strait Maritime Exercises Heighten Tech Freight Delays', source: 'Reuters', time: '5h ago', sentiment: 'negative' },
      { title: 'NVIDIA Expands European Data Center Partnerships', source: 'Bloomberg', time: '1d ago', sentiment: 'positive' }
    ],
    riskTrend: [
      { date: 'Jul 1', score: 62 },
      { date: 'Jul 5', score: 65 },
      { date: 'Jul 10', score: 71 },
      { date: 'Jul 15', score: 74 },
      { date: 'Jul 20', score: 78 }
    ]
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Consumer Electronics',
    country: 'United States',
    marketCap: '$3.35T',
    riskScore: 64,
    sentimentScore: 48,
    sentimentLabel: 'Neutral',
    description: 'Global consumer technology giant pivoting hardware assembly across India, Vietnam, and China amid shifting geopolitical trade policies.',
    keyRisks: [
      'Concentrated hardware assembly logistics in East and Southeast Asia',
      'Antitrust enforcement in EU and US regarding App Store revenue share',
      'Consumer discretionary spending shifts in key European markets'
    ],
    aiSummary: 'Apple maintains robust balance sheet liquidity but faces medium supply chain geographic risks. Active relocation of assembly capacity to Vietnam/India mitigates long-term tail risks.',
    recentNews: [
      { title: 'Apple Accelerates Manufacturing Shift into Southeast Asian Hubs', source: 'Nikkei Asia', time: '4h ago', sentiment: 'positive' },
      { title: 'EU Regulatory Panel Prepares Tech Compliance Audit', source: 'Wall Street Journal', time: '8h ago', sentiment: 'neutral' }
    ],
    riskTrend: [
      { date: 'Jul 1', score: 58 },
      { date: 'Jul 5', score: 60 },
      { date: 'Jul 10', score: 63 },
      { date: 'Jul 15', score: 64 },
      { date: 'Jul 20', score: 64 }
    ]
  },
  {
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Manufacturing Co.',
    sector: 'Semiconductors',
    country: 'Taiwan',
    marketCap: '$840B',
    riskScore: 88,
    sentimentScore: 28,
    sentimentLabel: 'Very Bearish',
    description: 'The world\'s primary semiconductor foundry foundry supplying 90%+ of advanced sub-5nm chips globally.',
    keyRisks: [
      'Extreme geographic concentration in Taiwan Strait earthquake & conflict zone',
      'Energy grid dependencies and water resource vulnerability during droughts',
      'Critical reliance on EUV lithography equipment imports from Europe (ASML)'
    ],
    aiSummary: 'TSMC sits at the epicenter of global technological risk. Any kinetic or blockade event in the Taiwan Strait would freeze $1.2T in annual downstream tech production within 30 days.',
    recentNews: [
      { title: 'Naval Inspection Zones Declared Near Major Shipping Corridors', source: 'Al Jazeera', time: '1h ago', sentiment: 'negative' },
      { title: 'TSMC Arizona Fab Reaches Milestone Production Phase', source: 'CNBC', time: '12h ago', sentiment: 'positive' }
    ],
    riskTrend: [
      { date: 'Jul 1', score: 80 },
      { date: 'Jul 5', score: 82 },
      { date: 'Jul 10', score: 85 },
      { date: 'Jul 15', score: 87 },
      { date: 'Jul 20', score: 88 }
    ]
  },
  {
    ticker: 'XOM',
    name: 'Exxon Mobil Corporation',
    sector: 'Energy & Oil',
    country: 'United States',
    marketCap: '$460B',
    riskScore: 71,
    sentimentScore: 62,
    sentimentLabel: 'Bullish',
    description: 'Multinational oil and gas major benefiting from crude supply tightness while managing offshore geopolitical concession risks.',
    keyRisks: [
      'Chokepoint maritime risks in the Strait of Hormuz and Red Sea transit routes',
      'OPEC+ quota compliance shifts and sudden crude price volatility',
      'Environmental compliance mandates and climate litigation exposure'
    ],
    aiSummary: 'Exxon benefits from elevated oil prices driven by geopolitical supply friction, but maintains elevated operational hazard in offshore South American and Middle Eastern extraction zones.',
    recentNews: [
      { title: 'Red Sea Transit Tariffs Spike Following Drone Interceptions', source: 'Maritime Executive', time: '3h ago', sentiment: 'negative' },
      { title: 'Crude Oil Surges 3.8% Amid Middle East Supply Risk Premiums', source: 'Bloomberg', time: '6h ago', sentiment: 'positive' }
    ],
    riskTrend: [
      { date: 'Jul 1', score: 65 },
      { date: 'Jul 5', score: 68 },
      { date: 'Jul 10', score: 70 },
      { date: 'Jul 15', score: 71 },
      { date: 'Jul 20', score: 71 }
    ]
  },
  {
    ticker: 'LMT',
    name: 'Lockheed Martin Corporation',
    sector: 'Defense & Aerospace',
    country: 'United States',
    marketCap: '$118B',
    riskScore: 35,
    sentimentScore: 78,
    sentimentLabel: 'Very Bullish',
    description: 'Global aerospace and defense contractor providing strategic defense systems, fighter jets, and precision missile defense.',
    keyRisks: [
      'Supply chain bottlenecks for rare earth elements used in radar guidance',
      'Government defense budget reallocations and congressional authorization delays',
      'Defense labor skill shortages in specialized aerospace manufacturing'
    ],
    aiSummary: 'Lockheed Martin acts as a structural geopolitical hedge. Elevated global risk levels translate directly to order backlog expansion and multi-year defense procurement guarantees.',
    recentNews: [
      { title: 'NATO Members Commit to Increased 2.5% GDP Defense Allocation Target', source: 'Defense News', time: '2h ago', sentiment: 'positive' },
      { title: 'Lockheed Awarded $2.4B Air Defense System Contract Expansion', source: 'Defense One', time: '10h ago', sentiment: 'positive' }
    ],
    riskTrend: [
      { date: 'Jul 1', score: 40 },
      { date: 'Jul 5', score: 38 },
      { date: 'Jul 10', score: 36 },
      { date: 'Jul 15', score: 35 },
      { date: 'Jul 20', score: 35 }
    ]
  },
  {
    ticker: 'ASML',
    name: 'ASML Holding N.V.',
    sector: 'Semiconductors',
    country: 'Netherlands',
    marketCap: '$310B',
    riskScore: 73,
    sentimentScore: 42,
    sentimentLabel: 'Neutral',
    description: 'Sole global producer of Extreme Ultraviolet (EUV) lithography machines required for advanced semiconductor manufacturing.',
    keyRisks: [
      'Dutch and U.S. government restrictions on tool exports and maintenance servicing in Asia',
      'Concentration of customer base across top 3 semiconductor foundries',
      'Complex global sub-tier supplier dependencies for optical and laser components'
    ],
    aiSummary: 'ASML holds a natural monopoly in EUV lithography, but diplomatic pressure over technology control caps addressable market growth in critical expansion territories.',
    recentNews: [
      { title: 'Dutch Ministry Reviews High-Tech Equipment Service License Rules', source: 'Dutch News', time: '5h ago', sentiment: 'negative' }
    ],
    riskTrend: [
      { date: 'Jul 1', score: 68 },
      { date: 'Jul 5', score: 70 },
      { date: 'Jul 10', score: 72 },
      { date: 'Jul 15', score: 73 },
      { date: 'Jul 20', score: 73 }
    ]
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    country: 'United States',
    marketCap: '$580B',
    riskScore: 48,
    sentimentScore: 65,
    sentimentLabel: 'Bullish',
    description: 'Largest U.S. banking institution with global investment banking, commercial lending, and cross-border payment clearing capabilities.',
    keyRisks: [
      'Sovereign debt restructuring risks in emerging market exposures',
      'Interest rate volatility and central bank balance sheet unwinding',
      'Cybersecurity threats targeting SWIFT interbank messaging nodes'
    ],
    aiSummary: 'JPMorgan exhibits high resilience due to fortress balance sheet liquidity, though derivative desk exposures require monitoring during sudden market volatility events.',
    recentNews: [
      { title: 'JPMorgan Reports Robust Trading Division Revenues Amid Volatility', source: 'Wall Street Journal', time: '1d ago', sentiment: 'positive' }
    ],
    riskTrend: [
      { date: 'Jul 1', score: 52 },
      { date: 'Jul 5', score: 50 },
      { date: 'Jul 10', score: 49 },
      { date: 'Jul 15', score: 48 },
      { date: 'Jul 20', score: 48 }
    ]
  }
];

export const INITIAL_EVENTS: GlobalEvent[] = [
  {
    id: 'evt-101',
    title: 'Naval Drill Blockade Simulation in Taiwan Strait',
    description: 'Naval forces have initiated unannounced live-fire exclusion zones straddling major commercial shipping lanes in the Taiwan Strait, delaying semiconductor raw material shipments and maritime container vessels.',
    severity: 'critical',
    impactScore: 92,
    region: 'East Asia',
    countryIso: 'TW',
    sources: ['Reuters', 'Bloomberg', 'Nikkei Asia', 'Naval Intelligence Digest'],
    reportedAt: '18 minutes ago',
    category: 'Geopolitical',
    affectedCompanyTickers: ['TSM', 'NVDA', 'AAPL', 'ASML'],
    marketImpactSummary: 'Immediate 4.2% drop in global semiconductor indices. Freight shipping insurance rates through East Asian corridors surged +180% within 6 hours.',
    timeline: [
      { date: '08:30 UTC', title: 'Maritime Warning Issued', detail: 'Exclusion zone alerts broadcast to commercial vessels.' },
      { date: '10:15 UTC', title: 'Container Rerouting Commences', detail: 'Major shipping lines divert around eastern Taiwan coastal waters.' },
      { date: '12:00 UTC', title: 'Tech Index Volatility Spikes', detail: 'Semiconductor manufacturers issue supply lead-time advisories.' }
    ]
  },
  {
    id: 'evt-102',
    title: 'Strait of Hormuz Tanker Boarding & Route Restriction',
    description: 'Armed maritime security incidents reported near Oman border, causing crude oil tankers to pause passage through the Strait of Hormuz chokepoint.',
    severity: 'high',
    impactScore: 84,
    region: 'Middle East',
    countryIso: 'OM',
    sources: ['Lloyds List', 'Maritime Executive', 'Al Jazeera'],
    reportedAt: '1 hour ago',
    category: 'Energy',
    affectedCompanyTickers: ['XOM', 'CVX', 'SHEL', 'CAT'],
    marketImpactSummary: 'Brent crude jumped +3.9% to $88.40/bbl. European natural gas futures climbed +6.2% on regional escalation concerns.',
    timeline: [
      { date: '07:00 UTC', title: 'Distress Signal Logged', detail: 'Commercial tanker logs radar lock from coastal patrol craft.' },
      { date: '08:45 UTC', title: 'Insurance Underwriters Pause Cover', detail: 'War risk premiums increased to 1.2% of hull value.' }
    ]
  },
  {
    id: 'evt-103',
    title: 'Critical Rare Earth Export License Restrictions Imposed',
    description: 'Ministry of Commerce announces mandatory national security licensing approval for heavy rare earth elements including dysprosium and terbium used in EV motors and defense guidance electronics.',
    severity: 'high',
    impactScore: 81,
    region: 'East Asia',
    countryIso: 'CN',
    sources: ['South China Morning Post', 'Financial Times', 'Wall Street Journal'],
    reportedAt: '3 hours ago',
    category: 'Supply Chain',
    affectedCompanyTickers: ['NVDA', 'LMT', 'TSLA', 'AAPL'],
    marketImpactSummary: 'Aerospace and EV manufacturing supply chains report estimated 45-day reserve buffers before production throttles occur.',
    timeline: [
      { date: '04:00 UTC', title: 'Official Decree Published', detail: 'Customs bureaus enforce immediate export audit clearance requirements.' }
    ]
  },
  {
    id: 'evt-104',
    title: 'Panama Canal Drought Reduces Daily Vessel Transit Slots by 35%',
    description: 'Extended dry season water level drops at Gatun Lake force canal authority to restrict draft depth limits and limit vessel slots, stranding bulk carrier cargo.',
    severity: 'medium',
    impactScore: 63,
    region: 'Central America',
    countryIso: 'PA',
    sources: ['Panama Canal Authority', 'JOC Shipping News'],
    reportedAt: '5 hours ago',
    category: 'Climate',
    affectedCompanyTickers: ['CAT', 'DE', 'AMZN'],
    marketImpactSummary: 'Agricultural commodities and heavy machinery transit delays extended by 14 days, raising US East Coast port congestion indices.',
    timeline: [
      { date: '02:00 UTC', title: 'Transit Slot Cut Announced', detail: 'Daily vessel transits lowered from 32 to 22 ships.' }
    ]
  },
  {
    id: 'evt-105',
    title: 'Sophisticated Ransomware Attack Hits European Energy Grid Coordinator',
    description: 'State-sponsored cyber threat group breaches central load-balancing operational systems across Central European transmission corridors, causing localized voltage drop emergency protocols.',
    severity: 'high',
    impactScore: 78,
    region: 'Europe',
    countryIso: 'DE',
    sources: ['CERT-EU', 'Der Spiegel', 'Cyber Threat Intelligence Daily'],
    reportedAt: '8 hours ago',
    category: 'Cybersecurity',
    affectedCompanyTickers: ['ASML', 'SAP', 'SIE'],
    marketImpactSummary: 'European industrial manufacturing facilities operated on emergency auxiliary generators. Spot power prices surged +22% in Frankfurt intraday.',
    timeline: [
      { date: '01:15 UTC', title: 'System Intrusion Detected', detail: 'Anomalous encrypted telemetry detected in regional sub-node.' }
    ]
  },
  {
    id: 'evt-106',
    title: 'Central Bank Unexpectedly Raises Benchmark Rates by 75bps',
    description: 'Surprise emergency rate hike implemented to stem rapid currency depreciation and combat persistent energy import inflation spikes.',
    severity: 'medium',
    impactScore: 58,
    region: 'South America',
    countryIso: 'BR',
    sources: ['Central Bank Bulletin', 'Reuters Finance'],
    reportedAt: '12 hours ago',
    category: 'Macroeconomic',
    affectedCompanyTickers: ['JPM', 'MA', 'V'],
    marketImpactSummary: 'Local currency rallied 2.1%, while local sovereign 10-year bond yields rose 42bps. Emerging market credit spreads widened across regional peers.',
    timeline: [
      { date: '18:00 UTC', title: 'Emergency Board Statement', detail: 'Policy committee votes 7-2 in favor of front-loaded tightening.' }
    ]
  }
];

export const INITIAL_COUNTRIES: CountryRisk[] = [
  {
    id: 'cnt-tw',
    name: 'Taiwan',
    isoCode: 'TW',
    riskScore: 88,
    riskLevel: 'Critical',
    flag: '🇹🇼',
    region: 'East Asia',
    coordinates: [120.9605, 23.6978],
    eventsCount: 4,
    keyRisks: ['Naval exclusion zone exercises', 'Cyber reconnaissance on power grid', 'Air defense zone incursions'],
    trendHistory: [{ month: 'May', score: 78 }, { month: 'Jun', score: 82 }, { month: 'Jul', score: 88 }]
  },
  {
    id: 'cnt-ua',
    name: 'Ukraine',
    isoCode: 'UA',
    riskScore: 92,
    riskLevel: 'Critical',
    flag: '🇺🇦',
    region: 'Eastern Europe',
    coordinates: [31.1656, 48.3794],
    eventsCount: 7,
    keyRisks: ['Black Sea grain corridor strikes', 'Energy grid artillery damage', 'Regional industrial displacement'],
    trendHistory: [{ month: 'May', score: 90 }, { month: 'Jun', score: 91 }, { month: 'Jul', score: 92 }]
  },
  {
    id: 'cnt-il',
    name: 'Israel',
    isoCode: 'IL',
    riskScore: 85,
    riskLevel: 'Critical',
    flag: '🇮🇱',
    region: 'Middle East',
    coordinates: [34.8516, 31.0461],
    eventsCount: 5,
    keyRisks: ['Regional missile threats', 'Port transit delays at Haifa', 'Tech workforce mobilization'],
    trendHistory: [{ month: 'May', score: 82 }, { month: 'Jun', score: 84 }, { month: 'Jul', score: 85 }]
  },
  {
    id: 'cnt-om',
    name: 'Oman / Strait of Hormuz',
    isoCode: 'OM',
    riskScore: 81,
    riskLevel: 'High',
    flag: '🇴🇲',
    region: 'Middle East',
    coordinates: [55.9754, 21.4735],
    eventsCount: 3,
    keyRisks: ['Oil tanker boarding incidents', 'Naval drone interference', 'Maritime war insurance spikes'],
    trendHistory: [{ month: 'May', score: 72 }, { month: 'Jun', score: 76 }, { month: 'Jul', score: 81 }]
  },
  {
    id: 'cnt-de',
    name: 'Germany',
    isoCode: 'DE',
    riskScore: 46,
    riskLevel: 'Medium',
    flag: '🇩🇪',
    region: 'Western Europe',
    coordinates: [10.4515, 51.1657],
    eventsCount: 2,
    keyRisks: ['Energy grid cyber breaches', 'Industrial power cost competitiveness', 'Automotive supply chain friction'],
    trendHistory: [{ month: 'May', score: 42 }, { month: 'Jun', score: 44 }, { month: 'Jul', score: 46 }]
  },
  {
    id: 'cnt-us',
    name: 'United States',
    isoCode: 'US',
    riskScore: 32,
    riskLevel: 'Low',
    flag: '🇺🇸',
    region: 'North America',
    coordinates: [-95.7129, 37.0902],
    eventsCount: 1,
    keyRisks: ['Fiscal debt ceiling debates', 'Critical infrastructure ransomware', 'Election cycle regulatory shifts'],
    trendHistory: [{ month: 'May', score: 30 }, { month: 'Jun', score: 31 }, { month: 'Jul', score: 32 }]
  }
];

export const INITIAL_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'port-1',
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    companyName: 'NVIDIA Corporation',
    sector: 'Semiconductors',
    shares: 150,
    price: 118.50,
    prevClose: 116.80,
    avgCost: 118.50,
    riskScore: 78,
    action: 'Review'
  },
  {
    id: 'port-2',
    ticker: 'TSM',
    name: 'Taiwan Semiconductor Mfg.',
    companyName: 'Taiwan Semiconductor Mfg.',
    sector: 'Semiconductors',
    shares: 200,
    price: 142.00,
    prevClose: 139.00,
    avgCost: 142.00,
    riskScore: 88,
    action: 'Hedge / Reduce'
  },
  {
    id: 'port-3',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    companyName: 'Apple Inc.',
    sector: 'Technology',
    shares: 120,
    price: 210.30,
    prevClose: 207.50,
    avgCost: 210.30,
    riskScore: 64,
    action: 'Monitor'
  },
  {
    id: 'port-4',
    ticker: 'XOM',
    name: 'Exxon Mobil Corporation',
    companyName: 'Exxon Mobil Corporation',
    sector: 'Energy',
    shares: 180,
    price: 104.10,
    prevClose: 103.00,
    avgCost: 104.10,
    riskScore: 71,
    action: 'Monitor'
  },
  {
    id: 'port-5',
    ticker: 'LMT',
    name: 'Lockheed Martin Corporation',
    companyName: 'Lockheed Martin Corporation',
    sector: 'Defense',
    shares: 40,
    price: 452.00,
    prevClose: 449.00,
    avgCost: 452.00,
    riskScore: 35,
    action: 'Safe'
  }
];

export const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'alt-001',
    title: 'CRITICAL: Taiwan Strait Live Exclusion Zone Active',
    severity: 'critical',
    message: 'Naval exclusion zone declared spanning primary Taiwan Strait maritime traffic corridor. TSM and NVDA risk scores updated to +88 and +78 respectively.',
    read: false,
    createdAt: '15m ago',
    category: 'Geopolitical',
    targetType: 'event',
    targetId: 'evt-101'
  },
  {
    id: 'alt-002',
    title: 'HIGH: Strait of Hormuz Tanker Insurance Surcharge',
    severity: 'high',
    message: 'War risk underwriters raise hull insurance premiums +180% following maritime security incident in Strait of Hormuz.',
    read: false,
    createdAt: '1h ago',
    category: 'Energy',
    targetType: 'event',
    targetId: 'evt-102'
  },
  {
    id: 'alt-003',
    title: 'Portfolio Warning: TSM Allocation Overweight High-Risk Segment',
    severity: 'high',
    message: 'Your 22% allocation to TSM carries a risk score of 88/100. AI recommendation: Consider tail-risk put option hedge.',
    read: false,
    createdAt: '2h ago',
    category: 'Portfolio Risk',
    targetType: 'portfolio',
    targetId: 'port-2'
  },
  {
    id: 'alt-004',
    title: 'Rare Earth Export Restrictions Confirmed',
    severity: 'medium',
    message: 'Mandatory export license requirements imposed on heavy rare earth dysprosium shipments.',
    read: true,
    createdAt: '4h ago',
    category: 'Supply Chain',
    targetType: 'event',
    targetId: 'evt-103'
  },
  {
    id: 'alt-005',
    title: 'Cybersecurity Threat Level Escalated for European Grids',
    severity: 'medium',
    message: 'CERT-EU bulletin issued following ransomware intrusion at transmission coordinator.',
    read: true,
    createdAt: '8h ago',
    category: 'Cybersecurity',
    targetType: 'event',
    targetId: 'evt-105'
  }
];

export const INITIAL_REPORTS: ReportItem[] = [
  {
    id: 'rep-2026-07',
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
    id: 'rep-2026-06',
    title: 'Rare Earth Supply Chain Vulnerability Assessment',
    summary: 'Detailed evaluation of heavy rare earth processing monopolies and impact on defense guidance systems and EV powertrain manufacturing.',
    severityTag: 'high',
    createdAt: '2026-07-15',
    author: 'Black Swan Quantitative Research',
    tags: ['Supply Chain', 'Rare Earths', 'Defense', 'EVs'],
    sections: [
      {
        heading: 'Monopoly Dynamics',
        body: 'Processing capacity for heavy rare earths remains 90% concentrated. Domestic inventory buffers at Tier-1 defense contractors average 60 to 90 days before assembly curtailment.'
      }
    ]
  }
];
