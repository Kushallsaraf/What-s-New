import type { Briefing, MarketRowData, NewsItem, Quote, Stock } from './types';

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

export const seedNews: NewsItem[] = [
  {
    id: 'nvda-ai-demand',
    ticker: 'NVDA',
    name: 'NVIDIA',
    color: '#76B900',
    sector: 'AI',
    headline: 'AI infrastructure demand remains the central driver',
    source: 'SEC filing',
    time: '12m ago',
    sentiment: 'bullish',
    impact: 'High',
    confidence: 88,
    summary:
      'Management language continues to emphasize accelerated-computing demand and ecosystem growth, while elevated expectations leave little room for execution misses.',
    why:
      'Sustained hyperscaler spending supports revenue visibility across the accelerator supply chain, but valuation makes confirmation especially important.',
    bullCase: 'Customer diversification and sustained capital spending would reinforce the demand case.',
    bearCase: 'Slower customer spending or supply constraints could weaken revenue visibility.',
    watch: ['Next quarterly filing', 'Hyperscaler capital-spending guidance', 'Gross-margin trend'],
    sources: [
      {
        label: 'SEC EDGAR — NVIDIA filings',
        url: 'https://www.sec.gov/edgar/browse/?CIK=1045810&owner=exclude',
        type: 'official',
      },
    ],
  },
  {
    id: 'tlt-rates',
    ticker: 'TLT',
    name: 'iShares 20+ Year Treasury ETF',
    color: '#5B78B5',
    sector: 'Fixed income',
    headline: 'Long-duration bonds remain exposed to higher yields',
    source: 'Treasury · FRED',
    time: '28m ago',
    sentiment: 'bearish',
    impact: 'High',
    confidence: 86,
    summary:
      'Long yields remain above their recent range. Incoming inflation and labor data are the next confirmation points.',
    why:
      'Higher long-term yields increase the discount-rate burden on duration-sensitive assets and can tighten financial conditions.',
    bullCase: 'Cooling inflation expectations or weaker labor data could ease pressure on long yields.',
    bearCase: 'A higher term premium could keep yields elevated even if policy expectations soften.',
    watch: ['Next CPI release', 'Treasury auction demand', '10-year term premium'],
    sources: [
      { label: 'FRED 10-Year Treasury Rate', url: 'https://fred.stlouisfed.org/series/DGS10', type: 'official' },
      { label: 'U.S. Treasury rates', url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates', type: 'official' },
    ],
  },
  {
    id: 'aapl-services',
    ticker: 'AAPL',
    name: 'Apple',
    color: '#A2AAAD',
    sector: 'Mega Cap',
    headline: 'Services resilience offsets uneven device demand',
    source: 'SEC filing',
    time: '1h ago',
    sentiment: 'neutral',
    impact: 'Medium',
    confidence: 68,
    summary:
      'Recurring revenue quality remains constructive, but the evidence for a stronger hardware upgrade cycle is not yet decisive.',
    why:
      'Services mix supports margins, while regional device demand and regulation remain important swing factors.',
    bullCase: 'A stronger replacement cycle with stable services margins would improve the medium-term picture.',
    bearCase: 'Regional demand weakness and regulatory pressure could weigh on services economics.',
    watch: ['Next earnings call', 'Services margin', 'Regional iPhone demand'],
    sources: [
      { label: 'SEC EDGAR — Apple filings', url: 'https://www.sec.gov/edgar/browse/?CIK=320193&owner=exclude', type: 'official' },
    ],
  },
  {
    id: 'xom-inventory',
    ticker: 'XOM',
    name: 'Exxon Mobil',
    color: '#C8102E',
    sector: 'Energy',
    headline: 'Oil inventory data remains inside its recent range',
    source: 'U.S. EIA',
    time: '3h ago',
    sentiment: 'neutral',
    impact: 'Low',
    confidence: 81,
    summary:
      'Stocks, production, and refinery utilization do not yet form a strong directional signal for energy equities.',
    why:
      'The absence of a confirmed inventory trend leaves the sector more sensitive to supply headlines and geopolitical risk.',
    bullCase: 'Sustained inventory draws with stable production would improve the demand case.',
    bearCase: 'Headline-driven oil moves can reverse before weekly official data confirms them.',
    watch: ['Weekly petroleum status report', 'U.S. production', 'Refinery utilization'],
    sources: [
      { label: 'EIA Weekly Petroleum Status Report', url: 'https://www.eia.gov/petroleum/supply/weekly/', type: 'official' },
    ],
  },
  {
    id: 'spy-breadth',
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    color: '#8B96A8',
    sector: 'Broad market',
    headline: 'Headline index is steadier than its internals',
    source: 'Market context',
    time: '4h ago',
    sentiment: 'neutral',
    impact: 'Medium',
    confidence: 76,
    summary:
      'Rate-sensitive groups are weaker while selected growth themes hold up, creating a selective rather than uniformly constructive backdrop.',
    why:
      'Concentration can make index performance look healthier than the median constituent.',
    bullCase: 'Broader participation across sectors would improve the quality of the advance.',
    bearCase: 'A narrow leadership group increases sensitivity to company-specific disappointments.',
    watch: ['Advance/decline breadth', 'Equal-weight index', 'Real yields'],
    sources: [
      { label: 'NYSE market data', url: 'https://www.nyse.com/market-data', type: 'market' },
    ],
  },
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

export const chatSuggestions = [
  'Why are long yields important?',
  'What changed for NVIDIA?',
  'What would change today’s view?',
];

export const askResearchResponses: Record<string, string> = {
  'why are long yields important?':
    'Long yields affect borrowing costs and the discount rate applied to future cash flows. Today’s evidence: Treasury and FRED series show yields above their recent range. Scenario: cooling inflation could ease pressure. Risk: a higher term premium could keep yields elevated. Confidence: 86%.',
  'what changed for nvidia?':
    'The latest source-linked evidence still emphasizes AI infrastructure demand. That supports the demand case, while elevated expectations remain the main risk. Watch hyperscaler capital spending, supply, and gross margins. Confidence: 88%.',
  'what would change today’s view?':
    'The view improves if inflation cools and participation broadens across sectors. It weakens if long yields rise, inflation reaccelerates, or enterprise spending softens. Current confidence: 78%.',
};

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
