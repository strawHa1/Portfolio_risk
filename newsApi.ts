/**
 * Live news aggregation for India and world financial/geopolitical headlines.
 * Sources (priority): GNews → NewsAPI → Finnhub → RSS feeds (no key required).
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  timeAgo: string;
  region: 'india' | 'world';
  sentiment: 'negative' | 'neutral' | 'positive';
  imageUrl?: string;
}

type NewsRegion = 'india' | 'world' | 'all';

const CACHE_TTL_MS = 60_000;
const cache: Record<string, { data: NewsArticle[]; timestamp: number; source: string }> = {};

const INDIA_RSS_FEEDS = [
  { url: 'https://economictimes.indiatimes.com/rssfeeds/1977021501.cms', label: 'Economic Times' },
  { url: 'https://www.livemint.com/rss/markets', label: 'Mint Markets' },
  { url: 'https://www.business-standard.com/rss/markets-106.rss', label: 'Business Standard' }
];

const WORLD_RSS_FEEDS = [
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', label: 'CNBC Markets' },
  { url: 'https://finance.yahoo.com/news/rssindex', label: 'Yahoo Finance' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', label: 'BBC Business' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', label: 'CNBC Tech' },
  { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en', label: 'Google News Business' }
];

const NEGATIVE_KEYWORDS = [
  'crash', 'decline', 'war', 'crisis', 'sanctions', 'fall', 'drop', 'loss', 'risk',
  'recession', 'conflict', 'attack', 'downgrade', 'bankrupt', 'default', 'tariff',
  'inflation', 'strike', 'blockade', 'tension', 'plunge', 'slump', 'warning'
];

const POSITIVE_KEYWORDS = [
  'surge', 'gain', 'growth', 'rise', 'record', 'profit', 'deal', 'rally', 'boost',
  'expansion', 'recovery', 'upgrade', 'breakthrough', 'partnership', 'investment'
];

function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `news-${Math.abs(hash).toString(36)}`;
}

function inferSentiment(text: string): 'negative' | 'neutral' | 'positive' {
  const lower = text.toLowerCase();
  const neg = NEGATIVE_KEYWORDS.some((k) => lower.includes(k));
  const pos = POSITIVE_KEYWORDS.some((k) => lower.includes(k));
  if (neg && !pos) return 'negative';
  if (pos && !neg) return 'positive';
  return 'neutral';
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseRssItems(xml: string, region: 'india' | 'world', defaultSource: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < 80) {
    const block = match[1];
    const title = stripHtml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim());
    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
    const desc = stripHtml(
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || '').trim()
    );
    const pubDate =
      (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim() ||
      new Date().toISOString();
    const source =
      stripHtml((block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '').trim()) ||
      defaultSource;

    if (!title || title.length < 10) continue;

    const publishedAt = new Date(pubDate).toISOString();
    articles.push({
      id: hashId(title + link),
      title,
      description: desc.slice(0, 400) || title,
      source,
      url: link,
      publishedAt: Number.isNaN(new Date(pubDate).getTime()) ? new Date().toISOString() : publishedAt,
      timeAgo: formatTimeAgo(publishedAt),
      region,
      sentiment: inferSentiment(`${title} ${desc}`)
    });
  }

  return articles;
}

async function fetchRssFeed(feedUrl: string, label: string, region: 'india' | 'world'): Promise<NewsArticle[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'BlackSwan-NewsBot/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return parseRssItems(xml, region, label);
  } catch {
    return [];
  }
}

async function fetchFromRss(region: NewsRegion, limit: number): Promise<NewsArticle[]> {
  const indiaFeeds = INDIA_RSS_FEEDS.map((f) => ({ ...f, region: 'india' as const }));
  const worldFeeds = WORLD_RSS_FEEDS.map((f) => ({ ...f, region: 'world' as const }));
  const feeds =
    region === 'india' ? indiaFeeds :
    region === 'world' ? worldFeeds :
    [...indiaFeeds, ...worldFeeds];

  const results = await Promise.all(
    feeds.map((f) => fetchRssFeed(f.url, f.label, f.region))
  );

  const seen = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const batch of results) {
    for (const article of batch) {
      if (seen.has(article.id)) continue;
      seen.add(article.id);
      merged.push(article);
    }
  }

  return merged
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

async function fetchFromGNews(region: NewsRegion, limit: number, apiKey: string): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  const fetchRegion = async (r: 'india' | 'world') => {
    const url =
      r === 'india'
        ? `https://gnews.io/api/v4/top-headlines?country=in&category=business&lang=en&max=${limit}&apikey=${apiKey}`
        : `https://gnews.io/api/v4/top-headlines?category=business&lang=en&max=${limit}&apikey=${apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return;
    const data: any = await response.json();
    for (const item of data?.articles || []) {
      articles.push({
        id: hashId(item.url || item.title),
        title: item.title,
        description: item.description || item.title,
        source: item.source?.name || 'GNews',
        url: item.url,
        publishedAt: item.publishedAt,
        timeAgo: formatTimeAgo(item.publishedAt),
        region: r,
        sentiment: inferSentiment(`${item.title} ${item.description || ''}`),
        imageUrl: item.image
      });
    }
  };

  if (region === 'all') {
    await Promise.all([fetchRegion('india'), fetchRegion('world')]);
  } else {
    await fetchRegion(region);
  }

  return articles.slice(0, limit);
}

async function fetchFromNewsApi(region: NewsRegion, limit: number, apiKey: string): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  const fetchRegion = async (r: 'india' | 'world') => {
    const url =
      r === 'india'
        ? `https://newsapi.org/v2/top-headlines?country=in&category=business&pageSize=${limit}&apiKey=${apiKey}`
        : `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=${limit}&apiKey=${apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return;
    const data: any = await response.json();
    for (const item of data?.articles || []) {
      articles.push({
        id: hashId(item.url || item.title),
        title: item.title,
        description: item.description || item.content?.slice(0, 300) || item.title,
        source: item.source?.name || 'NewsAPI',
        url: item.url,
        publishedAt: item.publishedAt,
        timeAgo: formatTimeAgo(item.publishedAt),
        region: r,
        sentiment: inferSentiment(`${item.title} ${item.description || ''}`),
        imageUrl: item.urlToImage
      });
    }
  };

  if (region === 'all') {
    await Promise.all([fetchRegion('india'), fetchRegion('world')]);
  } else {
    await fetchRegion(region);
  }

  return articles.slice(0, limit);
}

async function fetchFromFinnhubGeneral(limit: number, apiKey: string): Promise<NewsArticle[]> {
  const response = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`, {
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return [];
  const data: any[] = await response.json();
  return (data || []).slice(0, limit).map((item) => ({
    id: hashId(String(item.id) + item.url),
    title: item.headline,
    description: item.summary || item.headline,
    source: item.source || 'Finnhub',
    url: item.url,
    publishedAt: new Date(item.datetime * 1000).toISOString(),
    timeAgo: formatTimeAgo(new Date(item.datetime * 1000).toISOString()),
    region: 'world' as const,
    sentiment: inferSentiment(`${item.headline} ${item.summary || ''}`),
    imageUrl: item.image
  }));
}

export async function fetchHeadlines(region: NewsRegion = 'all', limit = 20): Promise<{ articles: NewsArticle[]; source: string }> {
  const cacheKey = `headlines-${region}-${limit}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { articles: cached.data, source: cached.source };
  }

  const gnewsKey = process.env.GNEWS_API_KEY;
  const newsApiKey = process.env.NEWS_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  let articles: NewsArticle[] = [];
  let source = 'rss';

  if (gnewsKey) {
    try {
      const gnews = await fetchFromGNews(region, Math.min(limit, 50), gnewsKey);
      if (gnews.length > 0) {
        articles = articles.concat(gnews);
        source = 'gnews';
      }
    } catch (e) {
      console.warn('GNews fetch failed:', e);
    }
  }

  if (newsApiKey) {
    try {
      const newsApi = await fetchFromNewsApi(region, Math.min(limit, 50), newsApiKey);
      if (newsApi.length > 0) {
        articles = articles.concat(newsApi);
        source = source && source !== 'rss' ? `${source}+newsapi` : 'newsapi';
      }
    } catch (e) {
      console.warn('NewsAPI fetch failed:', e);
    }
  }

  if (finnhubKey) {
    try {
      const finnhub = await fetchFromFinnhubGeneral(Math.min(limit, 50), finnhubKey);
      if (finnhub.length > 0) {
        articles = articles.concat(finnhub);
        source = source ? `${source}+finnhub` : 'finnhub';
      }
    } catch (e) {
      console.warn('Finnhub news fetch failed:', e);
    }
  }

  try {
    const rss = await fetchFromRss(region, Math.max(limit, 80));
    if (rss.length > 0) {
      articles = articles.concat(rss);
      if (!source || source === 'rss' && articles.length === rss.length) source = 'rss';
      else if (source !== 'rss') source = `${source}+rss`;
    } else if (articles.length === 0) {
      source = 'offline';
    }
  } catch (e) {
    console.warn('RSS fetch failed:', e);
  }

  const seen = new Set<string>();
  articles = articles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  articles = articles
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, Math.min(200, Math.max(limit, articles.length)));

  cache[cacheKey] = { data: articles, timestamp: Date.now(), source };
  return { articles, source };
}

export async function fetchCompanyNews(symbol: string, limit = 10): Promise<{ articles: NewsArticle[]; source: string }> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `company-${cleanSymbol}-${limit}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { articles: cached.data, source: cached.source };
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  let articles: NewsArticle[] = [];
  let source = 'search';

  if (finnhubKey) {
    try {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(cleanSymbol)}&from=${from}&to=${to}&token=${finnhubKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (response.ok) {
        const data: any[] = await response.json();
        articles = (data || []).slice(0, limit).map((item) => ({
          id: hashId(String(item.id) + item.url),
          title: item.headline,
          description: item.summary || item.headline,
          source: item.source || 'Finnhub',
          url: item.url,
          publishedAt: new Date(item.datetime * 1000).toISOString(),
          timeAgo: formatTimeAgo(new Date(item.datetime * 1000).toISOString()),
          region: 'world' as const,
          sentiment: inferSentiment(`${item.headline} ${item.summary || ''}`),
          imageUrl: item.image
        }));
        source = 'finnhub';
      }
    } catch (e) {
      console.warn(`Finnhub company news failed for ${cleanSymbol}:`, e);
    }
  }

  if (articles.length === 0) {
    articles = await fetchCompanyRss(cleanSymbol, undefined, limit);
    if (articles.length > 0) {
      source = 'rss-company';
    }
  }

  if (articles.length === 0) {
    const { articles: headlines } = await fetchHeadlines('all', 40);
    const symbolLower = cleanSymbol.toLowerCase();
    const companyNames: Record<string, string[]> = {
      NVDA: ['nvidia'],
      AAPL: ['apple'],
      TSM: ['tsmc', 'taiwan semiconductor'],
      MSFT: ['microsoft'],
      AMZN: ['amazon'],
      GOOGL: ['google', 'alphabet'],
      XOM: ['exxon'],
      LMT: ['lockheed'],
      JPM: ['jpmorgan', 'jp morgan'],
      ASML: ['asml'],
      AMD: ['amd', 'advanced micro'],
      CVX: ['chevron'],
      BA: ['boeing'],
      RTX: ['rtx', 'raytheon'],
      MA: ['mastercard']
    };
    const keywords = [symbolLower, ...(companyNames[cleanSymbol] || [])];
    articles = headlines
      .filter((a) => {
        const text = `${a.title} ${a.description}`.toLowerCase();
        // Guard against generic words (e.g. apple fruit)
        if (cleanSymbol === 'AAPL') {
          return /\b(apple|aapl|iphone|ipad|macbook|tim cook|app store)\b/i.test(text) &&
            !/\b(cider|orchard|harvest|crop|fruit|grocer)\b/i.test(text);
        }
        return keywords.some((k) => text.includes(k));
      })
      .slice(0, limit);
    source = 'keyword-match';
  }

  cache[cacheKey] = { data: articles, timestamp: Date.now(), source };
  return { articles, source };
}

/**
 * Fetch targeted news for a company from Yahoo Finance and Google News RSS feeds.
 */
export async function fetchCompanyRss(symbol: string, companyName?: string, limit = 5): Promise<NewsArticle[]> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const articles: NewsArticle[] = [];

  // Try Yahoo Finance ticker RSS first
  try {
    const yahooUrl = `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(cleanSymbol)}`;
    const yahooRes = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlackSwan/1.0)' },
      signal: AbortSignal.timeout(6000)
    });
    if (yahooRes.ok) {
      const xml = await yahooRes.text();
      const parsed = parseRssItems(xml, 'world', 'Yahoo Finance');
      if (parsed.length > 0) {
        articles.push(...parsed);
      }
    }
  } catch {
    /* try google news next */
  }

  // If Yahoo didn't yield enough, query Google News RSS for this ticker
  if (articles.length < limit) {
    try {
      const query = companyName
        ? `${cleanSymbol} OR "${companyName}" stock`
        : `${cleanSymbol} stock`;
      const gnewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const gnewsRes = await fetch(gnewsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlackSwan/1.0)' },
        signal: AbortSignal.timeout(6000)
      });
      if (gnewsRes.ok) {
        const xml = await gnewsRes.text();
        const parsed = parseRssItems(xml, 'world', 'Google News');
        for (const item of parsed) {
          if (!articles.some((a) => a.id === item.id || a.title.toLowerCase() === item.title.toLowerCase())) {
            articles.push(item);
          }
        }
      }
    } catch {
      /* continue */
    }
  }

  return articles.slice(0, limit);
}

export type LiveGlobalEvent = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impactScore: number;
  region: string;
  countryIso?: string;
  sources: string[];
  reportedAt: string;
  category: 'Geopolitical' | 'Supply Chain' | 'Climate' | 'Macroeconomic' | 'Cybersecurity' | 'Energy';
  affectedCompanyTickers: string[];
  marketImpactSummary: string;
  url?: string;
};

export function newsToGlobalEvent(article: NewsArticle, index: number): LiveGlobalEvent {
  const severityFromSentiment =
    article.sentiment === 'negative' ? 'high' : article.sentiment === 'positive' ? 'low' : 'medium';
  const impactScore =
    article.sentiment === 'negative' ? 65 + (index % 20) : article.sentiment === 'positive' ? 25 + (index % 15) : 45 + (index % 20);

  const categoryKeywords: [RegExp, LiveGlobalEvent['category']][] = [
    [/supply.?chain|shipping|port|freight|logistics/i, 'Supply Chain'],
    [/cyber|hack|breach|malware/i, 'Cybersecurity'],
    [/oil|energy|gas|opec|pipeline/i, 'Energy'],
    [/gdp|inflation|rate|fed|central bank|monetary/i, 'Macroeconomic'],
    [/climate|flood|drought|weather|hurricane/i, 'Climate']
  ];
  let category: LiveGlobalEvent['category'] = 'Geopolitical';
  for (const [re, cat] of categoryKeywords) {
    if (re.test(`${article.title} ${article.description}`)) {
      category = cat;
      break;
    }
  }

  return {
    id: article.id,
    title: article.title,
    description: article.description,
    severity: severityFromSentiment,
    impactScore,
    region: article.region === 'india' ? 'South Asia' : 'Global',
    countryIso: article.region === 'india' ? 'IN' : undefined,
    sources: [article.source],
    reportedAt: article.timeAgo,
    category,
    affectedCompanyTickers: [],
    marketImpactSummary: article.description.slice(0, 200),
    url: article.url
  };
}
