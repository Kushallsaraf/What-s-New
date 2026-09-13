const briefingContract = [
  {
    id: 'rates',
    cycle: 'morning',
    topic: 'macro',
    title: 'Treasury yields remain the key pressure point',
    impact: 'headwind',
    confidence: { label: 'high', score: 86 },
    freshness: { label: 'demo', delayed: true },
    evidence: [
      {
        claim: 'Ten-year yield is above its 20-session median.',
        sourceId: 'fred',
        sourceUrl: 'https://fred.stlouisfed.org/series/DGS10',
      },
    ],
    scenarios: {
      strengthening:
        'A fresh move higher in yields would strengthen the defensive scenario.',
      weakening:
        'A move back inside the prior range could ease pressure on growth assets.',
    },
    risks: ['A single macro release can reverse the relationship quickly.'],
    languagePolicy: 'research-context-only',
  },
];

export const runtime = 'edge';

export async function GET() {
  return Response.json({
    status: 'demo',
    generatedAt: new Date().toISOString(),
    items: briefingContract,
  });
}
