import { initialQuotes, morningBriefing } from '../data';
import type { Briefing, FeedItem, FeedResponse, Quote } from '../types';

type AssetsResponse = {
  status: string;
  delayed: boolean;
  assets: Array<{ symbol: string; value: string | number; move: string | number; freshness: string }>;
};

type BriefingsResponse = {
  items: Array<{
    title: string;
    confidence: { score: number };
    evidence: Array<{ claim: string }>;
    scenarios: { strengthening: string; weakening: string };
    risks: string[];
  }>;
};

export type ResearchSnapshot = {
  briefing: Briefing;
  quotes: Record<string, Quote>;
  mode: 'bundled-demo' | 'remote-delayed';
  feedItems: FeedItem[];
  quiet: boolean;
  quietMessage?: string | null;
};

export const bundledSnapshot: ResearchSnapshot = {
  briefing: morningBriefing,
  quotes: initialQuotes,
  mode: 'bundled-demo',
  feedItems: [],
  quiet: false,
  quietMessage: null,
};

function parseNumber(value: string | number) {
  if (typeof value === 'number') return value;
  return Number(String(value).replace(/[$,%+,]/g, ''));
}

function apiBase() {
  return process.env.EXPO_PUBLIC_RESEARCH_API_URL?.trim().replace(/\/$/, '') || '';
}

export async function loadFeed(watchlist: string[] = [], signal?: AbortSignal): Promise<FeedResponse> {
  const base = apiBase();
  if (!base) {
    return { items: [], quiet: true, message: 'Point EXPO_PUBLIC_RESEARCH_API_URL at the FastAPI backend for live feed cards.' };
  }
  const qs = watchlist.length ? `?watchlist=${encodeURIComponent(watchlist.join(','))}&limit=50` : '?limit=50';
  const response = await fetch(`${base}/api/feed${qs}`, { signal });
  if (!response.ok) throw new Error(`feed ${response.status}`);
  return response.json() as Promise<FeedResponse>;
}

export async function loadResearchSnapshot(
  watchlist: string[] = [],
  signal?: AbortSignal,
): Promise<ResearchSnapshot> {
  const configuredBase = apiBase();
  if (!configuredBase) return bundledSnapshot;

  try {
    const [assetsResponse, briefingsResponse, feed] = await Promise.all([
      fetch(`${configuredBase}/api/assets`, { signal }),
      fetch(`${configuredBase}/api/briefings`, { signal }),
      loadFeed(watchlist, signal).catch(() => ({ items: [], quiet: true, message: null }) as FeedResponse),
    ]);
    if (!assetsResponse.ok || !briefingsResponse.ok) {
      return { ...bundledSnapshot, feedItems: feed.items, quiet: feed.quiet, quietMessage: feed.message };
    }

    const assets = await assetsResponse.json() as AssetsResponse;
    const briefings = await briefingsResponse.json() as BriefingsResponse;
    const remoteQuotes = Object.fromEntries(
      assets.assets.map((asset) => [
        asset.symbol,
        {
          price: parseNumber(asset.value),
          change: parseNumber(asset.move),
          freshness: asset.freshness,
        },
      ]),
    );
    const remoteBrief = briefings.items[0];
    if (!remoteBrief) {
      return { ...bundledSnapshot, quotes: { ...initialQuotes, ...remoteQuotes }, mode: 'remote-delayed', feedItems: feed.items, quiet: feed.quiet, quietMessage: feed.message };
    }

    return {
      briefing: {
        eyebrow: 'MORNING BRIEF · LATEST REFRESH',
        title: remoteBrief.title,
        summary: remoteBrief.evidence.map((item) => item.claim).join(' '),
        confidence: Math.round(remoteBrief.confidence.score * (remoteBrief.confidence.score <= 1 ? 100 : 1)),
        scenarios: remoteBrief.scenarios.weakening,
        risks: remoteBrief.risks.join(' '),
      },
      quotes: { ...initialQuotes, ...remoteQuotes },
      mode: 'remote-delayed',
      feedItems: feed.items,
      quiet: feed.quiet,
      quietMessage: feed.message,
    };
  } catch {
    return bundledSnapshot;
  }
}

export async function syncWatchlist(tickers: string[], accessToken: string): Promise<string[]> {
  const base = apiBase();
  if (!base || !accessToken) return tickers;
  const response = await fetch(`${base}/api/watchlist`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tickers }),
  });
  if (!response.ok) return tickers;
  const data = await response.json() as { tickers: string[] };
  return data.tickers;
}

export async function fetchServerWatchlist(accessToken: string): Promise<string[] | null> {
  const base = apiBase();
  if (!base || !accessToken) return null;
  const response = await fetch(`${base}/api/watchlist`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = await response.json() as { tickers: string[] };
  return data.tickers;
}

export async function registerPushToken(pushToken: string, accessToken: string): Promise<void> {
  const base = apiBase();
  if (!base || !accessToken) return;
  await fetch(`${base}/api/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ push_token: pushToken }),
  });
}
