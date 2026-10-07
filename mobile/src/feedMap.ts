import { stocks } from './data';
import type {
  EventPayload,
  EventTheme,
  EventTicker,
  FeedItem,
  Impact,
  NewsItem,
  Sentiment,
} from './types';

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
      const t = entry as { ticker?: string; direction?: string; score?: number; proxy?: boolean };
      return {
        ticker: String(t.ticker || ''),
        direction: asSentiment(t.direction),
        score: typeof t.score === 'number' ? t.score : 0,
        proxy: Boolean(t.proxy),
      };
    })
    .filter((t) => t.ticker)
    .sort((a, b) => b.score - a.score);

  const sources = Array.isArray(p.sources)
    ? (p.sources as Array<{ label?: string; url?: string; type?: string }>).map((s) => ({
        label: s.label || 'Source',
        url: s.url || '',
        type: (s.type as 'official' | 'company' | 'market' | 'news') || 'news',
      }))
    : [];

  const themes: EventTheme[] = Array.isArray(p.themes)
    ? (p.themes as Array<{ key?: string; label?: string }>)
        .map((t) => ({ key: String(t.key || ''), label: String(t.label || t.key || '') }))
        .filter((t) => t.key)
    : [];

  return {
    headline: String(p.headline || 'Event'),
    summary: String(p.summary || ''),
    impact: asImpact(p.impact),
    sentiment: asSentiment(p.sentiment ?? tickers[0]?.direction),
    confidence:
      typeof p.confidence === 'number' ? p.confidence : Math.round((item.confidence || 0) * 100),
    tickers: tickers.length
      ? tickers
      : item.tickers.map((t) => ({
          ticker: t,
          direction: 'neutral' as Sentiment,
          score: 0,
          proxy: false,
        })),
    bull_case: String(p.bull_case || ''),
    bear_case: String(p.bear_case || ''),
    // The pipeline sends a list; String() on it ran the items together
    // with bare commas.
    risks: Array.isArray(p.risks) ? p.risks.map(String).filter(Boolean).join('; ') : String(p.risks || ''),
    sources,
    time_horizon: String(p.time_horizon || ''),
    themes,
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
  if (payload.themes.length) {
    watch.push(`Routed via — ${payload.themes.map((t) => t.label).join(', ')}`);
  }
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
    // The pipeline has no separate "why it matters" field yet; repeating the
    // summary under a second heading read as a rendering bug.
    why: '',
    bullCase: payload.bull_case,
    bearCase: payload.bear_case,
    watch,
    sources: payload.sources,
    live: item.section === 'breaking',
    meme: payload.meme,
  };
}
