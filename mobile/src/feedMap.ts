import type { FeedItem, NewsItem, Sentiment, Impact } from './types';

const COLORS = ['#6C7BFF', '#33D690', '#F5B54C', '#FF5A6E', '#8792A3'];

function asSentiment(value: unknown): Sentiment {
  const raw = String(value || 'neutral').toLowerCase().replace(/\s+/g, '_');
  if (raw.includes('bull')) return 'bullish';
  if (raw.includes('bear')) return 'bearish';
  return 'neutral';
}

function asImpact(value: unknown): Impact {
  const raw = String(value || 'Medium');
  if (raw === 'High' || raw === 'Low' || raw === 'Medium') return raw;
  return 'Medium';
}

/** Map a live event feed card into the existing NewsItem shape for DetailModal. */
export function feedEventToNewsItem(item: FeedItem): NewsItem | null {
  if (item.card_type !== 'event') return null;
  const p = item.payload;
  const tickers = (Array.isArray(p.tickers) ? p.tickers : []) as Array<{ ticker?: string; direction?: string; score?: number }>;
  const primary = tickers[0]?.ticker || item.tickers[0] || 'SPY';
  const sources = Array.isArray(p.sources)
    ? (p.sources as Array<{ label?: string; url?: string; type?: string }>).map((s) => ({
        label: s.label || 'Source',
        url: s.url || '',
        type: (s.type as 'official' | 'company' | 'market') || 'company',
      }))
    : [];

  return {
    id: item.id,
    ticker: primary,
    name: primary,
    color: COLORS[primary.charCodeAt(0) % COLORS.length],
    sector: 'Markets',
    headline: String(p.headline || 'Event'),
    source: sources[0]?.label || 'Pipeline',
    time: new Date(item.created_at).toLocaleString(),
    sentiment: asSentiment(p.sentiment || tickers[0]?.direction),
    impact: asImpact(p.impact),
    confidence: typeof p.confidence === 'number' ? p.confidence : Math.round((item.confidence || 0) * 100),
    summary: String(p.summary || ''),
    why: String(p.summary || ''),
    bullCase: String(p.bull_case || ''),
    bearCase: String(p.bear_case || ''),
    watch: item.tickers,
    sources,
    live: item.section === 'breaking',
  };
}
