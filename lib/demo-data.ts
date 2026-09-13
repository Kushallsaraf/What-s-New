import type { Asset } from '@/lib/product-types';

export const assets: Asset[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    assetClass: 'Equity · Technology',
    value: '$174.84',
    move: '+1.8%',
    direction: 'up',
    freshness: 'Previous complete session',
    sparkline: [42, 45, 43, 49, 48, 55, 58, 54, 61, 65, 63, 69],
    context:
      'Demand evidence remains constructive, while elevated expectations make the shares more sensitive to small disappointments.',
    scenario:
      'Customer diversification and sustained hyperscaler capex would reinforce the demand case.',
    risk:
      'Slower customer spending or supply constraints could weaken revenue visibility faster than filings reveal.',
    confidence: 72,
    timeline: [
      {
        id: 'nvda-research',
        date: 'Today · 6:52 ET',
        kind: 'Research',
        title: 'AI demand narrative remains intact',
        detail:
          'The latest filing and peer commentary point in the same direction, but valuation leaves little room for execution misses.',
        impact: 'Mixed',
        confidence: 72,
        sources: [
          {
            label: 'SEC EDGAR company filings',
            url: 'https://www.sec.gov/edgar/search/',
            kind: 'official',
          },
        ],
      },
      {
        id: 'nvda-filing',
        date: 'Latest filing',
        kind: 'Filing',
        title: 'Data-center demand remains the central driver',
        detail:
          'Management language continues to emphasize accelerated-computing demand and ecosystem growth.',
        impact: 'Tailwind',
        confidence: 88,
        sources: [
          {
            label: 'SEC EDGAR',
            url: 'https://www.sec.gov/edgar/browse/?CIK=1045810&owner=exclude',
            kind: 'official',
          },
        ],
      },
    ],
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    assetClass: 'Equity · Technology',
    value: '$245.50',
    move: '-0.4%',
    direction: 'down',
    freshness: 'Previous complete session',
    sparkline: [56, 55, 57, 54, 52, 53, 51, 50, 52, 49, 48, 47],
    context:
      'Services resilience offsets uneven device demand. The next useful evidence is management commentary on upgrade cycles and margins.',
    scenario:
      'A stronger replacement cycle and stable services margins would improve the medium-term picture.',
    risk:
      'Regional demand weakness and regulatory pressure on services economics remain the clearest uncertainties.',
    confidence: 68,
    timeline: [
      {
        id: 'aapl-research',
        date: 'Yesterday · 16:20 ET',
        kind: 'Research',
        title: 'Services strength is doing more of the work',
        detail:
          'The current evidence is balanced: recurring revenue quality is strong, while hardware momentum is less clear.',
        impact: 'Mixed',
        confidence: 68,
        sources: [
          {
            label: 'Apple filings on SEC EDGAR',
            url: 'https://www.sec.gov/edgar/browse/?CIK=320193&owner=exclude',
            kind: 'official',
          },
        ],
      },
    ],
  },
  {
    symbol: 'XLE',
    name: 'Energy Select Sector SPDR Fund',
    assetClass: 'ETF · Energy',
    value: '$91.22',
    move: '+0.2%',
    direction: 'up',
    freshness: 'Previous complete session',
    sparkline: [48, 47, 50, 52, 51, 53, 52, 55, 54, 56, 55, 57],
    context:
      'Physical inventory data is balanced, leaving energy exposure unusually sensitive to supply headlines and geopolitical risk.',
    scenario:
      'A sustained inventory draw combined with stable production would improve the fundamental demand case.',
    risk:
      'Headline-driven oil moves can reverse before official weekly data confirms a change.',
    confidence: 81,
    timeline: [
      {
        id: 'xle-eia',
        date: 'Latest weekly release',
        kind: 'Macro',
        title: 'Inventories remain inside their recent range',
        detail:
          'Stocks, production, and utilization do not yet form a strong directional signal.',
        impact: 'Mixed',
        confidence: 81,
        sources: [
          {
            label: 'U.S. EIA Weekly Petroleum Status Report',
            url: 'https://www.eia.gov/petroleum/supply/weekly/',
            kind: 'official',
          },
        ],
      },
    ],
  },
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    assetClass: 'ETF · Fixed income',
    value: '$87.31',
    move: '-0.9%',
    direction: 'down',
    freshness: 'Previous complete session',
    sparkline: [63, 61, 60, 58, 59, 55, 54, 52, 53, 50, 48, 46],
    context:
      'Long-duration bonds remain exposed to higher yields. Incoming inflation and labor data are the next confirmation points.',
    scenario:
      'Cooling inflation expectations or weaker labor data could ease upward pressure on long yields.',
    risk:
      'Term-premium changes can keep long yields elevated even if policy-rate expectations soften.',
    confidence: 86,
    timeline: [
      {
        id: 'tlt-rates',
        date: 'Today · 7:18 ET',
        kind: 'Macro',
        title: 'Ten-year yield remains above its recent range',
        detail:
          'Treasury and FRED series agree on direction, increasing confidence in the rate-sensitivity assessment.',
        impact: 'Headwind',
        confidence: 86,
        sources: [
          {
            label: 'FRED 10-Year Treasury Rate',
            url: 'https://fred.stlouisfed.org/series/DGS10',
            kind: 'official',
          },
          {
            label: 'U.S. Treasury resource center',
            url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates',
            kind: 'official',
          },
        ],
      },
    ],
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    assetClass: 'ETF · Broad market',
    value: '$658.09',
    move: '+0.1%',
    direction: 'flat',
    freshness: 'Previous complete session',
    sparkline: [48, 49, 51, 50, 52, 51, 53, 54, 53, 54, 55, 54],
    context:
      'Index-level resilience masks a narrower mix underneath: rate-sensitive groups are weaker while selected growth themes hold up.',
    scenario:
      'Broader participation across sectors would improve the quality of the advance.',
    risk:
      'Concentration can make index performance look healthier than the median constituent.',
    confidence: 76,
    timeline: [
      {
        id: 'spy-breadth',
        date: 'Previous session',
        kind: 'Research',
        title: 'Headline index is steadier than its internals',
        detail:
          'Breadth and sector dispersion suggest a selective rather than uniformly constructive market backdrop.',
        impact: 'Mixed',
        confidence: 76,
        sources: [
          {
            label: 'Market data placeholder',
            url: 'https://www.nyse.com/market-data',
            kind: 'market',
          },
        ],
      },
    ],
  },
];

export const defaultWatchlist = ['NVDA', 'AAPL', 'XLE', 'TLT'];

export const marketDrivers = [
  {
    id: 'rates',
    label: 'Rates',
    value: 'Restrictive',
    direction: 'Headwind',
    confidence: 86,
    detail:
      'Long yields remain above their recent median, increasing the discount-rate burden on long-duration assets.',
    source: 'Treasury · FRED',
  },
  {
    id: 'labor',
    label: 'Labor',
    value: 'Cooling slowly',
    direction: 'Mixed',
    confidence: 74,
    detail:
      'The labor picture is moderating but not yet weak enough to remove inflation uncertainty.',
    source: 'BLS',
  },
  {
    id: 'energy',
    label: 'Energy',
    value: 'Range-bound',
    direction: 'Mixed',
    confidence: 81,
    detail:
      'Official stock, production, and utilization data are not yet directionally aligned.',
    source: 'EIA',
  },
];

export const interestOptions = [
  'Technology',
  'Macro',
  'Energy',
  'Healthcare',
  'Crypto',
  'Fixed income',
];
