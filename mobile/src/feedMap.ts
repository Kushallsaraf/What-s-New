import { stocks } from './data';
import type { EventPayload, EventTicker, FeedItem, Impact, NewsItem, Sentiment } from './types';

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

/** Company name and sector for a ticker, falling back for anything outside
 *  the bundled universe rather than dropping the row. */
export function stockMeta(ticker: string) {
  const known = stocks.find((s) => s.ticker === ticker);
  return {
    name: known?.name ?? ticker,
    sector: known?.sector ?? 'Markets',
    known: Boolean(known),
  };
}

/** Read a feed row's event payload, normalising the fields the pipeline sends. */
export function eventPayloadOf(item: FeedItem): EventPayload | null {
  if (item.card_type !== 'event') return null;
  const p = item.payload;
  const rawTickers = Array.isArray(p.tickers) ? p.tickers : [];

  const tickers: EventTicker[] = rawTickers
    .map((entry) => {
      const t = entry as { ticker?: string; direction?: string; score?: number };
      return {
        ticker: String(t.ticker || ''),
        direction: asSentiment(t.direction),
        score: typeof t.score === 'number' ? t.score : 0,
      };
    })
    .filter((t) => t.ticker)
    .sort((a, b) => b.score - a.score);

  const sources = Array.isArray(p.sources)
    ? (p.sources as Array<{ label?: string; url?: string; type?: string }>).map((s) => ({
        label: s.label || 'Source',
        url: s.url || '',
        type: (s.type as 'official' | 'company' | 'market') || 'company',
      }))
    : [];

  return {
    headline: String(p.headline || 'Event'),
    summary: String(p.summary || ''),
    impact: asImpact(p.impact),
    sentiment: asSentiment(p.sentiment ?? tickers[0]?.direction),
    confidence:
      typeof p.confidence === 'number' ? p.confidence : Math.round((item.confidence || 0) * 100),
    tickers: tickers.length ? tickers : item.tickers.map((t) => ({ ticker: t, direction: 'neutral' as Sentiment, score: 0 })),
    bull_case: String(p.bull_case || ''),
    bear_case: String(p.bear_case || ''),
    risks: String(p.risks || ''),
    sources,
    time_horizon: String(p.time_horizon || ''),
    meme: typeof p.meme === 'string' ? p.meme : undefined,
  };
}

/** Relative age of a feed row, matching the "12m ago" style of the seed fixtures. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Flatten an event into the single-ticker NewsItem shape DetailModal expects.
 * The event's other affected tickers, risks and horizon are folded into
 * `watch` so nothing the pipeline produced is silently dropped.
 */
export function feedEventToNewsItem(item: FeedItem): NewsItem | null {
  const payload = eventPayloadOf(item);
  if (!payload) return null;

  const lead = payload.tickers[0];
  const primary = lead?.ticker || item.tickers[0] || 'SPY';
  const meta = stockMeta(primary);
  const others = payload.tickers.slice(1);

  const watch: string[] = [];
  if (payload.time_horizon) watch.push(`Horizon — ${payload.time_horizon}`);
  if (payload.risks) watch.push(`Risks — ${payload.risks}`);
  if (others.length) {
    watch.push(
      `Also affected — ${others.map((t) => `${t.ticker} (${t.direction}, ${t.score})`).join(', ')}`,
    );
  }

  return {
    id: item.id,
    ticker: primary,
    name: meta.name,
    sector: meta.sector,
    headline: payload.headline,
    source: payload.sources[0]?.label || 'Pipeline',
    time: timeAgo(item.created_at),
    sentiment: payload.sentiment,
    impact: payload.impact,
    confidence: payload.confidence,
    summary: payload.summary,
    why: payload.summary,
    bullCase: payload.bull_case,
    bearCase: payload.bear_case,
    watch,
    sources: payload.sources,
    live: item.section === 'breaking',
    meme: payload.meme,
  };
}
