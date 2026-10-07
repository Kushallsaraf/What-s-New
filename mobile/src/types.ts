export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export type Impact = 'High' | 'Medium' | 'Low';

export type AppTab = 'new' | 'markets' | 'explore' | 'watchlist' | 'profile';

export type Stock = {
  ticker: string;
  name: string;
  sector: string;
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
  type: 'official' | 'company' | 'market' | 'news';
};

export type NewsItem = {
  id: string;
  ticker: string;
  name: string;
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

export type FeedCardType = 'event' | 'prediction' | 'sector' | 'outcome' | 'report';

/** One ticker the pipeline judged affected by an event, with its own read. */
export type EventTicker = {
  ticker: string;
  direction: Sentiment;
  score: number;
  /** True when a market theme routed the event here rather than the story
   *  naming this instrument. A proxy is where to look, not a reference. */
  proxy: boolean;
};

/**
 * Shape of `feed_items.payload` for card_type 'event', as written by
 * jobs/news_ingest.py. An event is a cluster of articles about one
 * happening, so it carries many tickers and many sources.
 */
/** A market theme the pipeline used to route an untickered story to a sector.
 *  The label travels with the key so the app keeps no copy of the taxonomy. */
export type EventTheme = {
  key: string;
  label: string;
};

export type EventPayload = {
  headline: string;
  summary: string;
  impact: Impact;
  sentiment: Sentiment;
  confidence: number;
  tickers: EventTicker[];
  bull_case: string;
  bear_case: string;
  risks: string;
  sources: EvidenceLink[];
  time_horizon: string;
  themes: EventTheme[];
  meme?: string;
};

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
  /** Rows came from a dry pipeline run, not the database. */
  preview?: boolean;
};
