import { initialQuotes, morningBriefing } from '../data';
import type { Briefing, Quote } from '../types';

type AssetsResponse = {
  status: string;
  delayed: boolean;
  assets: Array<{ symbol: string; value: string; move: string; freshness: string }>;
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
};

export const bundledSnapshot: ResearchSnapshot = {
  briefing: morningBriefing,
  quotes: initialQuotes,
  mode: 'bundled-demo',
};

function parseNumber(value: string) {
  return Number(value.replace(/[$,%+,]/g, ''));
}

export async function loadResearchSnapshot(signal?: AbortSignal): Promise<ResearchSnapshot> {
  const configuredBase = process.env.EXPO_PUBLIC_RESEARCH_API_URL?.trim();
  if (!configuredBase) return bundledSnapshot;

  const base = configuredBase.replace(/\/$/, '');
  try {
    const [assetsResponse, briefingsResponse] = await Promise.all([
      fetch(`${base}/api/assets`, { signal }),
      fetch(`${base}/api/briefings`, { signal }),
    ]);
    if (!assetsResponse.ok || !briefingsResponse.ok) return bundledSnapshot;

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
    if (!remoteBrief) return bundledSnapshot;

    return {
      briefing: {
        eyebrow: 'MORNING BRIEF · LATEST REFRESH',
        title: remoteBrief.title,
        summary: remoteBrief.evidence.map((item) => item.claim).join(' '),
        confidence: remoteBrief.confidence.score,
        scenarios: remoteBrief.scenarios.weakening,
        risks: remoteBrief.risks.join(' '),
      },
      quotes: { ...initialQuotes, ...remoteQuotes },
      mode: 'remote-delayed',
    };
  } catch {
    return bundledSnapshot;
  }
}
