export type AppView = 'brief' | 'watchlist' | 'markets' | 'settings';

export type EvidenceSource = {
  label: string;
  url: string;
  kind: 'official' | 'company' | 'market';
};

export type TimelineEvent = {
  id: string;
  date: string;
  kind: 'Filing' | 'Macro' | 'Earnings' | 'Research';
  title: string;
  detail: string;
  impact: 'Tailwind' | 'Headwind' | 'Mixed';
  confidence: number;
  sources: EvidenceSource[];
};

export type Asset = {
  symbol: string;
  name: string;
  assetClass: string;
  value: string;
  move: string;
  direction: 'up' | 'down' | 'flat';
  freshness: string;
  sparkline: number[];
  context: string;
  scenario: string;
  risk: string;
  confidence: number;
  timeline: TimelineEvent[];
};

export type UserSettings = {
  morningBrief: boolean;
  eventAlerts: boolean;
  watchlistDigest: boolean;
  endOfDay: boolean;
  reducedMotion: boolean;
  interests: string[];
};
