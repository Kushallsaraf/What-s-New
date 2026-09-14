import type { Briefing, EventPayload, FeedItem, MarketRowData, Quote, Stock } from './types';

/**
 * Bundled universe. Sectors deliberately match the GICS names the pipeline
 * uses in universe.py so the two halves stop diverging — the app should
 * eventually read this from /api/assets rather than carry its own copy.
 */
export const stocks: Stock[] = [
  { ticker: 'AAPL', name: 'Apple', sector: 'Technology', base: 245.5 },
  { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', base: 421.12 },
  { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', base: 174.84 },
  { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology', base: 338.2 },

  { ticker: 'GOOGL', name: 'Alphabet', sector: 'Communication Services', base: 172.18 },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Communication Services', base: 562.03 },
  { ticker: 'NFLX', name: 'Netflix', sector: 'Communication Services', base: 705.4 },

  { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer Discretionary', base: 194.32 },
  { ticker: 'TSLA', name: 'Tesla', sector: 'Consumer Discretionary', base: 241.34 },
  { ticker: 'MCD', name: "McDonald's", sector: 'Consumer Discretionary', base: 302.15 },

  { ticker: 'WMT', name: 'Walmart', sector: 'Consumer Staples', base: 96.4 },
  { ticker: 'KO', name: 'Coca-Cola', sector: 'Consumer Staples', base: 68.25 },
  { ticker: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', base: 158.7 },

  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', base: 224.43 },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', base: 41.8 },
  { ticker: 'WFC', name: 'Wells Fargo', sector: 'Financials', base: 72.1 },

  { ticker: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', base: 562.01 },
  { ticker: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', base: 812.4 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', base: 158.9 },

  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', base: 112.06 },
  { ticker: 'CVX', name: 'Chevron', sector: 'Energy', base: 148.3 },
  { ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy', base: 102.75 },

  { ticker: 'CAT', name: 'Caterpillar', sector: 'Industrials', base: 385.2 },
  { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrials', base: 178.55 },

  { ticker: 'NEE', name: 'NextEra Energy', sector: 'Utilities', base: 74.9 },
  { ticker: 'LIN', name: 'Linde', sector: 'Materials', base: 452.1 },
  { ticker: 'AMT', name: 'American Tower', sector: 'Real Estate', base: 198.6 },

  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'ETF', base: 658.09 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'ETF', base: 512.44 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury ETF', sector: 'ETF', base: 87.31 },
];

export const sectors = [...new Set(stocks.map((stock) => stock.sector))];

/** Stable pseudo-random move per ticker, so bundled quotes stay put across
 *  reloads without needing a hand-maintained parallel array. */
function seededChange(ticker: string): number {
  let hash = 0;
  for (let i = 0; i < ticker.length; i += 1) hash = (hash * 31 + ticker.charCodeAt(i)) % 997;
  return Math.round(((hash / 997) * 4 - 2) * 10) / 10;
}

export const initialQuotes: Record<string, Quote> = Object.fromEntries(
  stocks.map((stock) => [
    stock.ticker,
    { price: stock.base, change: seededChange(stock.ticker), freshness: 'Previous complete session' },
  ]),
);

export const morningBriefing: Briefing = {
  eyebrow: 'MORNING BRIEF · 7:00 ET',
  title: 'Policy and the consumer are setting the tone; company news is the second-order story',
  summary:
    'Official inflation and labour series still describe a restrictive backdrop, and consumer-facing data has softened at the margin. Sector dispersion is wide, so the index headline says less than usual about the median position.',
  confidence: 74,
  risks: 'A hotter inflation print, a weaker labour read, or an energy supply shock would each change the picture on their own.',
  scenarios: 'Cooling inflation alongside steadier real income would broaden participation beyond the current leadership.',
};

/** Minutes-ago helper so bundled fixtures age like real feed rows. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function eventItem(id: string, minutes: number, section: string, payload: EventPayload): FeedItem {
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
 * jobs/news_ingest.py.
 *
 * These span the kinds of news that actually move a broad market — monetary
 * policy, inflation and the consumer, energy supply, healthcare cost trend,
 * bank regulation, capital spending — rather than a single theme. Company
 * news is one entry among several, not the premise.
 *
 * Content is illustrative. Claims are deliberately qualitative: these
 * fixtures must not put invented statistics in the mouth of a named source.
 */
export const seedFeedItems: FeedItem[] = [
  eventItem('policy-inflation-path', 14, 'breaking', {
    headline: 'Inflation running ahead of wage growth keeps the policy path restrictive',
    summary:
      'Official price and earnings series continue to describe real incomes under pressure, which keeps the restrictive-for-longer reading intact. Duration is most exposed; banks benefit at the margin from a steeper curve.',
    impact: 'High',
    sentiment: 'bearish',
    confidence: 84,
    tickers: [
      { ticker: 'TLT', direction: 'bearish', score: 86 },
      { ticker: 'SPY', direction: 'bearish', score: 47 },
      { ticker: 'JPM', direction: 'bullish', score: 41 },
      { ticker: 'AMT', direction: 'bearish', score: 33 },
    ],
    bull_case: 'A cooler sequence of prints would ease pressure on the long end and broaden participation.',
    bear_case: 'A higher term premium can hold yields up even if policy-rate expectations soften.',
    risks: 'Term premium and policy expectations can move independently; one cool print is not a trend.',
    sources: [
      { label: 'Federal Reserve press releases', url: 'https://www.federalreserve.gov/newsevents/pressreleases.htm', type: 'official' },
      { label: 'BLS news releases', url: 'https://www.bls.gov/news.release/', type: 'official' },
      { label: 'FRED 10-Year Treasury Rate', url: 'https://fred.stlouisfed.org/series/DGS10', type: 'official' },
    ],
    time_horizon: 'Next CPI release',
    themes: [{ key: 'inflation_data', label: 'Inflation' }, { key: 'monetary_policy', label: 'Monetary policy' }],
  }),
  eventItem('consumer-outlook', 39, 'breaking', {
    headline: 'Consumer outlook softens as inflation expectations rise',
    summary:
      'Sentiment and spending-intent measures have weakened while price expectations firmed. That split usually favours staples over discretionary rather than moving the whole tape.',
    impact: 'High',
    sentiment: 'bearish',
    confidence: 78,
    tickers: [
      { ticker: 'AMZN', direction: 'bearish', score: 62 },
      { ticker: 'MCD', direction: 'bearish', score: 54 },
      { ticker: 'WMT', direction: 'bullish', score: 49 },
      { ticker: 'KO', direction: 'bullish', score: 38 },
    ],
    bull_case: 'Steadier real income would put the discretionary basket back on the front foot.',
    bear_case: 'Trade-down behaviour compresses discretionary margins well before it shows up in volumes.',
    risks: 'Survey measures and actual spending have diverged for extended stretches before.',
    sources: [
      { label: 'CNBC Economy', url: 'https://www.cnbc.com/economy/', type: 'market' },
      { label: 'BLS news releases', url: 'https://www.bls.gov/news.release/', type: 'official' },
    ],
    time_horizon: 'Next retail sales print',
    themes: [{ key: 'inflation_data', label: 'Inflation' }],
  }),
  eventItem('energy-supply', 96, 'recent', {
    headline: 'Record domestic crude production reshapes the refining margin picture',
    summary:
      'Official supply data points to output at the top of its range while crack spreads stay elevated. Integrated producers and refiners are not positioned identically against that mix.',
    impact: 'Medium',
    sentiment: 'neutral',
    confidence: 76,
    tickers: [
      { ticker: 'XOM', direction: 'bullish', score: 58 },
      { ticker: 'COP', direction: 'bearish', score: 44 },
      { ticker: 'CVX', direction: 'neutral', score: 36 },
    ],
    bull_case: 'Sustained margins with stable output supports integrated cash generation.',
    bear_case: 'Supply at record levels caps price recovery if demand growth slows.',
    risks: 'Geopolitical supply headlines routinely move the sector ahead of confirmed weekly data.',
    sources: [
      { label: 'EIA Today in Energy', url: 'https://www.eia.gov/todayinenergy/', type: 'official' },
      { label: 'EIA Weekly Petroleum Status Report', url: 'https://www.eia.gov/petroleum/supply/weekly/', type: 'official' },
    ],
    time_horizon: 'Weekly petroleum status report',
    themes: [{ key: 'energy_supply', label: 'Energy supply' }],
  }),
  eventItem('bank-regulation', 148, 'recent', {
    headline: 'Regulators move to reduce reporting burden for smaller banks',
    summary:
      'Proposed changes to examination cycles and third-party risk guidance lower fixed compliance cost. The benefit is real but skewed toward regional balance sheets rather than the largest institutions.',
    impact: 'Medium',
    sentiment: 'bullish',
    confidence: 71,
    tickers: [
      { ticker: 'WFC', direction: 'bullish', score: 52 },
      { ticker: 'BAC', direction: 'bullish', score: 45 },
      { ticker: 'JPM', direction: 'neutral', score: 28 },
    ],
    bull_case: 'Lower fixed compliance cost supports returns across regional franchises.',
    bear_case: 'Relief on reporting does nothing for credit cost, which remains the sector swing factor.',
    risks: 'Proposals are open for comment and can narrow substantially before taking effect.',
    sources: [
      { label: 'Federal Reserve press releases', url: 'https://www.federalreserve.gov/newsevents/pressreleases.htm', type: 'official' },
    ],
    time_horizon: 'Comment period close',
    themes: [{ key: 'regulation', label: 'Regulation and antitrust' }],
  }),
  eventItem('healthcare-cost-trend', 213, 'recent', {
    headline: 'Medical cost trend stays the deciding variable for managed care',
    summary:
      'Utilisation commentary in recent filings remains the clearest read on margin direction, and it has not yet settled. Pharma is exposed to the same trend from the opposite side.',
    impact: 'Medium',
    sentiment: 'neutral',
    confidence: 69,
    tickers: [
      { ticker: 'UNH', direction: 'bearish', score: 57 },
      { ticker: 'LLY', direction: 'bullish', score: 42 },
      { ticker: 'JNJ', direction: 'neutral', score: 26 },
    ],
    bull_case: 'Utilisation normalising toward pre-pandemic patterns would restore margin visibility.',
    bear_case: 'Cost trend running above pricing compresses managed-care margins for several quarters.',
    risks: 'Policy and reimbursement changes can override the underlying utilisation trend.',
    sources: [
      { label: 'SEC EDGAR — UnitedHealth filings', url: 'https://www.sec.gov/edgar/browse/?CIK=731766&owner=exclude', type: 'official' },
    ],
    time_horizon: 'Next earnings season',
    themes: [{ key: 'public_health', label: 'Public health' }],
  }),
  eventItem('capex-machinery', 287, 'recent', {
    headline: 'Capital-goods orders point to a slower industrial spending cycle',
    summary:
      'Order and backlog commentary suggests customers are extending decision timelines. Aerospace demand is holding up better than construction and mining-exposed machinery.',
    impact: 'Medium',
    sentiment: 'bearish',
    confidence: 67,
    tickers: [
      { ticker: 'CAT', direction: 'bearish', score: 55 },
      { ticker: 'LIN', direction: 'bearish', score: 34 },
      { ticker: 'GE', direction: 'bullish', score: 31 },
    ],
    bull_case: 'Infrastructure and grid investment can offset weakness in construction-linked demand.',
    bear_case: 'Extended decision timelines show up in backlog well before they show up in revenue.',
    risks: 'Order data is volatile month to month and is frequently revised.',
    sources: [
      { label: 'CNBC Markets', url: 'https://www.cnbc.com/markets/', type: 'market' },
    ],
    time_horizon: 'Next durable goods report',
    // Order-book commentary is company-level, so nothing routed it here.
    themes: [],
  }),
  eventItem('ai-infrastructure-demand', 341, 'recent', {
    headline: 'AI infrastructure demand remains the strongest company-level signal',
    summary:
      'Filing language continues to emphasise accelerated-computing demand and ecosystem investment. It is a genuine company-level driver, but a narrow one against the macro backdrop above.',
    impact: 'Medium',
    sentiment: 'bullish',
    confidence: 81,
    tickers: [
      { ticker: 'NVDA', direction: 'bullish', score: 79 },
      { ticker: 'AVGO', direction: 'bullish', score: 58 },
      { ticker: 'MSFT', direction: 'bullish', score: 41 },
      { ticker: 'NEE', direction: 'bullish', score: 24 },
    ],
    bull_case: 'Customer diversification and sustained capital spending would reinforce the demand case.',
    bear_case: 'Concentration in a handful of buyers magnifies any single spending decision.',
    risks: 'Expectations are elevated, which leaves little room for execution misses.',
    sources: [
      { label: 'SEC EDGAR — NVIDIA filings', url: 'https://www.sec.gov/edgar/browse/?CIK=1045810&owner=exclude', type: 'official' },
      { label: 'SEC EDGAR — Broadcom filings', url: 'https://www.sec.gov/edgar/browse/?CIK=1730168&owner=exclude', type: 'official' },
    ],
    time_horizon: 'Next quarter',
    themes: [],
    meme: 'Green candles hit different 🕯️💚',
  }),
];

export const majorIndices: MarketRowData[] = [
  { name: 'S&P 500', value: '6,581.09', change: 0.1 },
  { name: 'Nasdaq 100', value: '24,106.42', change: 0.4 },
  { name: 'Dow Jones', value: '45,834.22', change: -0.2 },
];

export const defaultWatchlist = ['SPY', 'JPM', 'XOM', 'TLT'];
export const defaultPreferences = ['Energy', 'Financials', 'Healthcare', 'Macro'];
