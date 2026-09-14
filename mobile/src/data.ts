import type { Briefing, EventPayload, FeedItem, MarketRowData, Quote, Stock } from './types';

export const stocks: Stock[] = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Mega Cap', color: '#A2AAAD', base: 245.5 },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Mega Cap', color: '#00A4EF', base: 421.12 },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'AI', color: '#76B900', base: 174.84 },
  { ticker: 'AMZN', name: 'Amazon', sector: 'Mega Cap', color: '#FF9900', base: 194.32 },
  { ticker: 'GOOGL', name: 'Alphabet', sector: 'AI', color: '#4285F4', base: 172.18 },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Mega Cap', color: '#0866FF', base: 562.03 },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Auto / EV', color: '#E31937', base: 241.34 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'AI', color: '#ED1C24', base: 151.07 },
  { ticker: 'NOW', name: 'ServiceNow', sector: 'Technology', color: '#62D84E', base: 921.02 },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', color: '#5A7EBF', base: 224.43 },
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', color: '#C8102E', base: 112.06 },
  { ticker: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', color: '#002677', base: 562.01 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury ETF', sector: 'Fixed income', color: '#5B78B5', base: 87.31 },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'Broad market', color: '#8B96A8', base: 658.09 },
];

export const sectors = [...new Set(stocks.map((stock) => stock.sector))];

export const initialQuotes: Record<string, Quote> = Object.fromEntries(
  stocks.map((stock, index) => [
    stock.ticker,
    {
      price: stock.base,
      change: [ -0.4, 0.5, 1.8, 0.2, 0.7, 0.1, -1.1, 1.2, -1.3, 0.3, 0.1, 0, -0.9, 0.1 ][index] ?? 0,
      freshness: 'Previous complete session',
    },
  ]),
);

export const morningBriefing: Briefing = {
  eyebrow: 'MORNING BRIEF · 7:00 ET',
  title: 'Rates still set the tone; AI demand remains the strongest company-level signal',
  summary:
    'Official rate data points to a restrictive backdrop, while recent company filings keep the AI infrastructure demand case constructive. Breadth is mixed, so the index headline may overstate how widely strength is shared.',
  confidence: 78,
  risks: 'A hotter inflation print or weaker enterprise spending would challenge this view.',
  scenarios: 'Cooling inflation plus broader sector participation would improve the market setup.',
};

/** Minutes-ago helper so bundled fixtures age like real feed rows. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function eventItem(
  id: string,
  minutes: number,
  section: string,
  payload: EventPayload,
): FeedItem {
  return {
    id,
    card_type: 'event',
    payload: payload as unknown as Record<string, unknown>,
    importance: payload.impact === 'High' ? 0.82 : payload.impact === 'Medium' ? 0.55 : 0.3,
    confidence: payload.confidence / 100,
    tickers: payload.tickers.map((t) => t.ticker),
    section,
    created_at: minutesAgo(minutes),
  };
}

/**
 * Bundled event fixtures used when EXPO_PUBLIC_RESEARCH_API_URL is unset.
 * Shaped exactly like `feed_items` rows with card_type 'event' from
 * jobs/news_ingest.py, so the same cards render on seed and live data.
 */
export const seedFeedItems: FeedItem[] = [
  eventItem('nvda-ai-demand', 12, 'breaking', {
    headline: 'AI infrastructure demand remains the central driver',
    summary:
      'Management language continues to emphasize accelerated-computing demand and ecosystem growth, while elevated expectations leave little room for execution misses.',
    impact: 'High',
    sentiment: 'bullish',
    confidence: 88,
    tickers: [
      { ticker: 'NVDA', direction: 'bullish', score: 88 },
      { ticker: 'AMD', direction: 'bullish', score: 61 },
      { ticker: 'MSFT', direction: 'bullish', score: 44 },
      { ticker: 'GOOGL', direction: 'bullish', score: 37 },
    ],
    bull_case: 'Customer diversification and sustained capital spending would reinforce the demand case.',
    bear_case: 'Slower customer spending or supply constraints could weaken revenue visibility.',
    risks: 'Valuation leaves little room for execution misses; concentration in a few hyperscaler customers.',
    sources: [
      { label: 'SEC EDGAR — NVIDIA filings', url: 'https://www.sec.gov/edgar/browse/?CIK=1045810&owner=exclude', type: 'official' },
      { label: 'SEC EDGAR — AMD filings', url: 'https://www.sec.gov/edgar/browse/?CIK=2488&owner=exclude', type: 'official' },
    ],
    time_horizon: 'Next quarter',
    meme: 'Green candles hit different 🕯️💚',
  }),
  eventItem('rates-long-end', 28, 'breaking', {
    headline: 'Long-duration bonds remain exposed to higher yields',
    summary:
      'Long yields remain above their recent range. Incoming inflation and labor data are the next confirmation points.',
    impact: 'High',
    sentiment: 'bearish',
    confidence: 86,
    tickers: [
      { ticker: 'TLT', direction: 'bearish', score: 84 },
      { ticker: 'SPY', direction: 'bearish', score: 41 },
      { ticker: 'JPM', direction: 'bullish', score: 38 },
    ],
    bull_case: 'Cooling inflation expectations or weaker labor data could ease pressure on long yields.',
    bear_case: 'A higher term premium could keep yields elevated even if policy expectations soften.',
    risks: 'Term premium can stay elevated independently of policy-rate expectations.',
    sources: [
      { label: 'FRED 10-Year Treasury Rate', url: 'https://fred.stlouisfed.org/series/DGS10', type: 'official' },
      { label: 'U.S. Treasury rates', url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates', type: 'official' },
    ],
    time_horizon: 'Next CPI release',
    meme: 'Red candles, cold sweats 🥶',
  }),
  eventItem('aapl-services', 62, 'recent', {
    headline: 'Services resilience offsets uneven device demand',
    summary:
      'Recurring revenue quality remains constructive, but the evidence for a stronger hardware upgrade cycle is not yet decisive.',
    impact: 'Medium',
    sentiment: 'neutral',
    confidence: 68,
    tickers: [
      { ticker: 'AAPL', direction: 'neutral', score: 66 },
      { ticker: 'QCOM', direction: 'neutral', score: 31 },
    ],
    bull_case: 'A stronger replacement cycle with stable services margins would improve the medium-term picture.',
    bear_case: 'Regional demand weakness and regulatory pressure could weigh on services economics.',
    risks: 'Regulatory action on app-store economics is the main asymmetric risk.',
    sources: [
      { label: 'SEC EDGAR — Apple filings', url: 'https://www.sec.gov/edgar/browse/?CIK=320193&owner=exclude', type: 'official' },
    ],
    time_horizon: 'Next earnings call',
  }),
  eventItem('energy-inventory', 184, 'recent', {
    headline: 'Oil inventory data remains inside its recent range',
    summary:
      'Stocks, production, and refinery utilization do not yet form a strong directional signal for energy equities.',
    impact: 'Low',
    sentiment: 'neutral',
    confidence: 81,
    tickers: [{ ticker: 'XOM', direction: 'neutral', score: 55 }],
    bull_case: 'Sustained inventory draws with stable production would improve the demand case.',
    bear_case: 'Headline-driven oil moves can reverse before weekly official data confirms them.',
    risks: 'Geopolitical supply headlines can move the sector ahead of confirmed data.',
    sources: [
      { label: 'EIA Weekly Petroleum Status Report', url: 'https://www.eia.gov/petroleum/supply/weekly/', type: 'official' },
    ],
    time_horizon: 'Weekly petroleum status report',
  }),
  eventItem('index-breadth', 244, 'recent', {
    headline: 'Headline index is steadier than its internals',
    summary:
      'Rate-sensitive groups are weaker while selected growth themes hold up, creating a selective rather than uniformly constructive backdrop.',
    impact: 'Medium',
    sentiment: 'neutral',
    confidence: 76,
    tickers: [
      { ticker: 'SPY', direction: 'neutral', score: 62 },
      { ticker: 'NVDA', direction: 'bullish', score: 34 },
      { ticker: 'TLT', direction: 'bearish', score: 29 },
    ],
    bull_case: 'Broader participation across sectors would improve the quality of the advance.',
    bear_case: 'A narrow leadership group increases sensitivity to company-specific disappointments.',
    risks: 'Concentration makes the index headline a poor proxy for the median constituent.',
    sources: [{ label: 'NYSE market data', url: 'https://www.nyse.com/market-data', type: 'market' }],
    time_horizon: 'Rest of quarter',
  }),
];

export const majorIndices: MarketRowData[] = [
  { name: 'S&P 500', value: '6,581.09', change: 0.1 },
  { name: 'Nasdaq 100', value: '24,106.42', change: 0.4 },
  { name: 'Dow Jones', value: '45,834.22', change: -0.2 },
];

export const globalMarkets: MarketRowData[] = [
  { name: 'FTSE 100', value: '9,214.44', change: 0.2 },
  { name: 'DAX', value: '23,748.12', change: -0.1 },
  { name: 'Nikkei 225', value: '44,372.50', change: 0.6 },
];

export const commodities: MarketRowData[] = [
  { name: 'WTI crude', value: '$67.18', change: 0.3 },
  { name: 'Gold', value: '$3,642.40', change: -0.2 },
  { name: 'Natural gas', value: '$3.08', change: 0.7 },
];

export const bonds: MarketRowData[] = [
  { name: 'U.S. 2-year', value: '3.72%', change: 0.02 },
  { name: 'U.S. 10-year', value: '4.08%', change: 0.04 },
  { name: 'U.S. 30-year', value: '4.68%', change: 0.03 },
];

export const defaultWatchlist = ['NVDA', 'AAPL', 'MSFT', 'TLT'];
export const defaultPreferences = ['Technology', 'AI', 'Breaking News', 'Morning brief'];

export const assistantSuggestions = [
  'Why are long bonds weak?',
  'Summarize the AI demand evidence',
  'What would change the morning view?',
];

export const assistantReplies: Record<string, string> = {
  'why are long bonds weak?':
    'Evidence: the 10-year yield remains above its recent range in Treasury and FRED data.\n\nScenario: cooling inflation or weaker labor data could reduce pressure.\n\nRisk: term premium can stay high even if policy-rate expectations ease.\n\nConfidence: 86%.',
  'summarize the ai demand evidence':
    'Evidence: recent company filings continue to emphasize accelerated-computing demand and ecosystem investment.\n\nBull case: broader customer adoption sustains spending. Bear case: elevated expectations magnify any slowdown.\n\nConfidence: 88%.',
  'what would change the morning view?':
    'The view would improve with cooler inflation and broader market participation. It would weaken with hotter inflation, rising long yields, or softer enterprise spending. Current confidence: 78%.',
};
