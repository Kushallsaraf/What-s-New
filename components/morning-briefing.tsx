'use client';

import { useMemo, useState } from 'react';
import {
  Bell,
  Bookmark,
  ChevronDown,
  CircleGauge,
  Clock3,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
  Sunrise,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Topic = 'All' | 'Watchlist' | 'Macro';

type BriefingItem = {
  id: string;
  topic: Exclude<Topic, 'All'>;
  label: string;
  time: string;
  title: string;
  summary: string;
  impact: 'Tailwind' | 'Headwind' | 'Mixed';
  confidence: 'High' | 'Medium';
  confidenceScore: number;
  evidence: string[];
  scenario: string;
  risk: string;
  source: string;
  sourceUrl: string;
};

const briefingItems: BriefingItem[] = [
  {
    id: 'rates',
    topic: 'Macro',
    label: 'Rates & policy',
    time: '7:18 ET',
    title: 'Treasury yields remain the key pressure point',
    summary:
      'Long-duration assets may stay sensitive while the 10-year yield holds above its recent range. Today’s inflation expectations data is the next useful confirmation.',
    impact: 'Headwind',
    confidence: 'High',
    confidenceScore: 86,
    evidence: [
      '10-year yield is above its 20-session median',
      'Rate-sensitive sectors lagged in the latest complete session',
      'Treasury and FRED series agree on direction',
    ],
    scenario:
      'If yields settle back inside the prior range, pressure on growth assets could ease. A fresh move higher would strengthen the defensive scenario.',
    risk:
      'A single macro release can reverse this relationship quickly; the signal is contextual, not a price forecast.',
    source: 'U.S. Treasury · FRED',
    sourceUrl: 'https://fred.stlouisfed.org/series/DGS10',
  },
  {
    id: 'nvda',
    topic: 'Watchlist',
    label: 'NVDA · Watchlist',
    time: '6:52 ET',
    title: 'AI demand narrative is intact, but expectations are crowded',
    summary:
      'Recent filings support durable data-center demand. The near-term risk is less about the theme and more about whether results can clear already-high expectations.',
    impact: 'Mixed',
    confidence: 'Medium',
    confidenceScore: 72,
    evidence: [
      'Latest company filing emphasizes data-center demand',
      'Semiconductor peer commentary points in the same direction',
      'Valuation context increases sensitivity to small misses',
    ],
    scenario:
      'Broader customer diversification would support the upside case. Softer capex commentary from large customers would weaken it.',
    risk:
      'Company guidance and filing language can be backward-looking; no alternative-data confirmation is included yet.',
    source: 'SEC EDGAR · company filing',
    sourceUrl: 'https://www.sec.gov/edgar/search/',
  },
  {
    id: 'energy',
    topic: 'Macro',
    label: 'Energy',
    time: '6:35 ET',
    title: 'Inventory data keeps the oil picture balanced',
    summary:
      'Official inventory data does not yet confirm a strong shortage or glut. Energy exposure may remain driven by headlines until the physical data breaks directionally.',
    impact: 'Mixed',
    confidence: 'High',
    confidenceScore: 81,
    evidence: [
      'Weekly commercial inventory change is within its recent band',
      'Production and refinery utilization point in different directions',
      'The assessment uses finalized EIA data rather than social sentiment',
    ],
    scenario:
      'A multi-week inventory draw would improve the demand case. Rising stocks alongside soft utilization would increase downside risk.',
    risk:
      'Geopolitical events can overwhelm inventory signals, especially between official releases.',
    source: 'U.S. EIA',
    sourceUrl: 'https://www.eia.gov/petroleum/supply/weekly/',
  },
];

const topicOptions: Topic[] = ['All', 'Watchlist', 'Macro'];

type MorningBriefingProps = {
  alertOn: boolean;
  onToggleAlerts: () => void;
  onSearch: () => void;
};

function ImpactBadge({ impact }: { impact: BriefingItem['impact'] }) {
  const className =
    impact === 'Tailwind'
      ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
      : impact === 'Headwind'
        ? 'border-rose-300/20 bg-rose-300/10 text-rose-200'
        : 'border-amber-300/20 bg-amber-300/10 text-amber-100';

  return (
    <Badge variant="outline" className={className}>
      {impact === 'Tailwind' ? (
        <TrendingUp aria-hidden="true" />
      ) : impact === 'Headwind' ? (
        <TrendingDown aria-hidden="true" />
      ) : (
        <CircleGauge aria-hidden="true" />
      )}
      {impact}
    </Badge>
  );
}

function ConfidenceMeter({ score }: { score: number }) {
  return (
    <progress
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/8 accent-primary"
      aria-label={`Confidence score ${score} out of 100`}
      value={score}
      max={100}
    />
  );
}

function BriefingCard({ item }: { item: BriefingItem }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="glass-panel overflow-hidden rounded-[1.35rem] border border-white/8">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1.5 text-primary/75">{item.label}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {item.time}
            </p>
          </div>
          <ImpactBadge impact={item.impact} />
        </div>

        <h2 className="max-w-xl text-[1.08rem] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-xl">
          {item.title}
        </h2>
        <p className="mt-2.5 text-sm leading-6 text-[#b7c4bd]">{item.summary}</p>

        <div className="mt-4 rounded-xl border border-white/7 bg-black/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#dce7df]">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              {item.confidence} confidence
            </span>
            <span className="font-mono text-[0.68rem] text-muted-foreground">
              {item.confidenceScore}/100
            </span>
          </div>
          <ConfidenceMeter score={item.confidenceScore} />
        </div>

        {expanded ? (
          <div className="mt-4 space-y-4 border-t border-white/8 pt-4 text-sm">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#dce7df]">
                Evidence
              </h3>
              <ul className="space-y-2 text-[#aebdb5]">
                {item.evidence.map((point) => (
                  <li key={point} className="flex gap-2.5 leading-5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/80" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <section className="rounded-xl bg-white/[0.035] p-3.5">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
                  Scenario
                </h3>
                <p className="leading-5 text-[#aebdb5]">{item.scenario}</p>
              </section>
              <section className="rounded-xl bg-white/[0.035] p-3.5">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-100">
                  Risk / limit
                </h3>
                <p className="leading-5 text-[#aebdb5]">{item.risk}</p>
              </section>
            </div>

            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {item.source}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        ) : null}
      </div>

      <footer className="flex border-t border-white/8">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 text-xs font-semibold text-[#cbd6cf] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring"
        >
          {expanded ? 'Show less' : 'View reasoning'}
          <ChevronDown
            className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={() => setSaved((value) => !value)}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved research' : 'Save to research'}
          className="flex min-h-12 w-14 items-center justify-center border-l border-white/8 text-[#92a39a] transition-colors hover:bg-white/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring"
        >
          <Bookmark className={`size-4 ${saved ? 'fill-primary text-primary' : ''}`} />
        </button>
      </footer>
    </article>
  );
}

export function MorningBriefing({
  alertOn,
  onToggleAlerts,
  onSearch,
}: MorningBriefingProps) {
  const [topic, setTopic] = useState<Topic>('All');

  const filteredItems = useMemo(
    () =>
      topic === 'All'
        ? briefingItems
        : briefingItems.filter((item) => item.topic === topic),
    [topic],
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1180px] px-4 pb-32 pt-4 sm:px-7 sm:pt-6 lg:px-10 lg:pb-16">
      <header className="flex items-center justify-between gap-4">
        <a
          href="#briefing"
          className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:invisible"
        >
          <span className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <Sparkles className="size-[1.05rem]" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight text-white">
              what&apos;s new
            </span>
            <span className="block font-mono text-[0.58rem] uppercase tracking-[0.13em] text-muted-foreground">
              market context
            </span>
          </span>
        </a>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search briefings"
            className="rounded-xl text-muted-foreground hover:bg-white/7 hover:text-white"
            onClick={onSearch}
          >
            <Search aria-hidden="true" />
          </Button>
          <Button
            variant={alertOn ? 'default' : 'ghost'}
            size="icon"
            aria-label={alertOn ? 'Turn research alerts off' : 'Turn research alerts on'}
            aria-pressed={alertOn}
            className="rounded-xl"
            onClick={onToggleAlerts}
          >
            <Bell className={alertOn ? 'fill-current' : ''} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <section
        id="briefing"
        className="grid gap-6 pb-6 pt-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.65fr)] lg:items-end lg:gap-10 lg:pb-8 lg:pt-16"
      >
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
              <Sunrise aria-hidden="true" />
              Morning brief
            </Badge>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Demo data · Updated 7:30 ET
            </span>
          </div>
          <h1 className="max-w-3xl text-[clamp(2.15rem,7vw,4.9rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#f6f5eb]">
            Start with what
            <span className="text-primary"> changed.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#aebdb5] sm:text-base sm:leading-7">
            Three developments worth understanding before the day begins — with
            the evidence, uncertainty, and conditions that could change the view.
          </p>
        </div>

        <aside className="relative overflow-hidden rounded-[1.35rem] border border-white/8 bg-[#111f1a] p-4 sm:p-5">
          <div className="absolute -right-8 -top-10 size-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Morning pulse</p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-white">
                Cautious, selective
              </p>
            </div>
            <span className="rounded-lg bg-amber-300/10 px-2 py-1 font-mono text-[0.63rem] font-medium uppercase tracking-[0.1em] text-amber-100">
              Mixed
            </span>
          </div>
          <svg
            viewBox="0 0 320 74"
            className="mt-4 h-[74px] w-full"
            aria-label="Illustrative mixed market pulse line"
          >
            <defs>
              <linearGradient id="pulse-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b9ed72" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#b9ed72" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 58 C35 54, 42 29, 75 36 S123 54, 153 42 S197 14, 230 28 S282 47, 320 16 L320 74 L0 74 Z"
              fill="url(#pulse-fill)"
            />
            <path
              d="M0 58 C35 54, 42 29, 75 36 S123 54, 153 42 S197 14, 230 28 S282 47, 320 16"
              fill="none"
              stroke="#b9ed72"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Rates are the clearest macro headwind; company-level signals are less
            uniform. This is a context summary, not a trading instruction.
          </p>
        </aside>
      </section>

      {alertOn ? (
        <output
          className="mb-5 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.07] px-3.5 py-3 text-xs text-primary"
        >
          <Bell className="size-3.5 fill-current" aria-hidden="true" />
          Demo research alerts are on for this session.
        </output>
      ) : null}

      <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div
          id="topic-filters"
          tabIndex={-1}
          className="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.035] p-1 focus:outline-none"
          aria-label="Filter briefing topics"
        >
          {topicOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTopic(option)}
              aria-pressed={topic === option}
              className={`min-h-9 shrink-0 rounded-lg px-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                topic === option
                  ? 'bg-[#e7f5d5] text-[#122018]'
                  : 'text-muted-foreground hover:bg-white/6 hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {filteredItems.length} relevant updates
        </span>
      </div>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Briefing updates">
        {filteredItems.map((item, index) => (
          <div key={item.id} className={index === 0 ? 'lg:col-span-2' : ''}>
            <BriefingCard item={item} />
          </div>
        ))}
      </section>

      <footer className="safe-bottom mx-auto mt-10 max-w-xl border-t border-white/8 pt-5 text-center text-xs leading-5 text-muted-foreground">
        Research context only. Nothing here is personalized investment advice or a
        recommendation to buy or sell any security.
      </footer>
    </main>
  );
}
