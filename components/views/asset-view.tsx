'use client';

import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { AssetSparkline } from '@/components/asset-sparkline';
import type { Asset, TimelineEvent } from '@/lib/product-types';

type AssetViewProps = {
  asset: Asset;
  tracked: boolean;
  onBack: () => void;
  onToggleWatchlist: () => void;
};

function ImpactPill({ impact }: { impact: TimelineEvent['impact'] }) {
  return (
    <span
      className={`rounded-lg px-2 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.08em] ${
        impact === 'Tailwind'
          ? 'bg-emerald-300/10 text-emerald-200'
          : impact === 'Headwind'
            ? 'bg-rose-300/10 text-rose-200'
            : 'bg-amber-300/10 text-amber-100'
      }`}
    >
      {impact}
    </span>
  );
}

export function AssetView({
  asset,
  tracked,
  onBack,
  onToggleWatchlist,
}: AssetViewProps) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1060px] px-4 pb-32 pt-4 sm:px-7 sm:pt-7 lg:px-10 lg:pb-16">
      <header className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={onToggleWatchlist}
          aria-pressed={tracked}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring ${
            tracked
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-white/8 text-[#cbd6cf] hover:bg-white/5'
          }`}
        >
          {tracked ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <BookmarkPlus className="size-4" aria-hidden="true" />
          )}
          {tracked ? 'Watching' : 'Add to watchlist'}
        </button>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel rounded-[1.5rem] border border-white/8 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{asset.assetClass}</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] text-[#f6f5eb] sm:text-6xl">
                {asset.symbol}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{asset.name}</p>
            </div>
            <span
              className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold ${
                asset.direction === 'up'
                  ? 'bg-emerald-300/10 text-emerald-200'
                  : asset.direction === 'down'
                    ? 'bg-rose-300/10 text-rose-200'
                    : 'bg-amber-300/10 text-amber-100'
              }`}
            >
              {asset.move}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-[0.72fr_1fr] items-end gap-5">
            <div>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                {asset.value}
              </p>
              <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.09em] text-muted-foreground">
                {asset.freshness}
              </p>
            </div>
            <AssetSparkline
              values={asset.sparkline}
              direction={asset.direction}
              className="h-24 w-full"
            />
          </div>
        </div>

        <aside className="rounded-[1.5rem] border border-primary/12 bg-primary/[0.055] p-5 sm:p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
            Current read
          </p>
          <p className="mt-4 text-sm leading-6 text-[#cbd6cf]">{asset.context}</p>
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
                Evidence confidence
              </span>
              <span className="font-mono text-primary">{asset.confidence}/100</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${asset.confidence}%` }}
              />
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.025] p-4 sm:p-5">
          <p className="eyebrow text-amber-100/75">What would strengthen the case</p>
          <p className="mt-2 text-sm leading-6 text-[#aebdb5]">{asset.scenario}</p>
        </div>
        <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.025] p-4 sm:p-5">
          <p className="eyebrow text-rose-100/75">Key risk / limitation</p>
          <p className="mt-2 text-sm leading-6 text-[#aebdb5]">{asset.risk}</p>
        </div>
      </section>

      <section className="mt-9" aria-labelledby="timeline-heading">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div>
            <p className="eyebrow">Evidence timeline</p>
            <h2 id="timeline-heading" className="mt-1 text-xl font-semibold tracking-tight text-white">
              What changed, in order
            </h2>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Newest first
          </span>
        </div>

        <ol className="relative mt-5 space-y-4 before:absolute before:bottom-8 before:left-[0.43rem] before:top-5 before:w-px before:bg-white/10">
          {asset.timeline.map((event) => (
            <li key={event.id} className="relative grid grid-cols-[0.9rem_1fr] gap-4">
              <span className="relative z-10 mt-5 size-3.5 rounded-full border-[3px] border-[#091310] bg-primary" />
              <article className="glass-panel rounded-[1.25rem] border border-white/8 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="eyebrow text-primary/75">{event.kind}</span>
                      <span className="text-[0.68rem] text-muted-foreground">{event.date}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
                      {event.title}
                    </h3>
                  </div>
                  <ImpactPill impact={event.impact} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#aebdb5]">{event.detail}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/8 pt-3">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {event.confidence}% confidence
                  </span>
                  {event.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 items-center gap-1.5 rounded text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {source.label}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mx-auto mt-9 max-w-xl border-t border-white/8 pt-5 text-center text-xs leading-5 text-muted-foreground">
        Demo values are delayed and illustrative. Analysis presents evidence and
        uncertainty; it is not a recommendation or personalized investment advice.
      </footer>
    </main>
  );
}
