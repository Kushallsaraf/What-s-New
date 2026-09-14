export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export type Impact = 'High' | 'Medium' | 'Low';

export type AppTab = 'new' | 'markets' | 'explore' | 'watchlist' | 'profile';

export type Stock = {
  ticker: string;
  name: string;
  sector: string;
  color: string;
  base: number;
};

export type Quote = {
  price: number;
  change: number;
  freshness: string;
};

export type EvidenceLink = {
  label: string;
  url: string;
  type: 'official' | 'company' | 'market';
};

export type NewsItem = {
  id: string;
  ticker: string;
  name: string;
  color: string;
  sector: string;
  headline: string;
  source: string;
  time: string;
  sentiment: Sentiment;
  impact: Impact;
  confidence: number;
  summary: string;
  why: string;
  bullCase: string;
  bearCase: string;
  watch: string[];
  sources: EvidenceLink[];
  live?: boolean;
  meme?: string;
};

export type MarketRowData = {
  name: string;
  value: string;
  change: number;
};

export type Briefing = {
  eyebrow: string;
  title: string;
  summary: string;
  confidence: number;
  risks: string;
  scenarios: string;
};

export type FeedCardType = 'event' | 'prediction' | 'sector' | 'outcome' | 'report' | 'watchlist';

export type FeedItem = {
  id: string;
  card_type: FeedCardType | string;
  payload: Record<string, unknown>;
  importance: number;
  confidence: number;
  tickers: string[];
  section: string;
  created_at: string;
  feed_score?: number;
};

export type FeedResponse = {
  items: FeedItem[];
  sections?: Record<string, FeedItem[]>;
  quiet: boolean;
  message?: string | null;
};
