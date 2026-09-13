'use client';

import {
  Activity,
  ArrowRight,
  CircleGauge,
  Factory,
  Landmark,
  Search,
} from 'lucide-react';

import { assets, marketDrivers } from '@/lib/demo-data';

type MarketViewProps = {
  onOpenAsset: (symbol: string) => void;
  onSearch: () => void;
};

const driverIcons = [Landmark, Activity, Factory];

export function MarketView({ onOpenAsset, onSearch }: MarketViewProps) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1060px] px-4 pb-32 pt-5 sm:px-7 sm:pt-8 lg:px-10 lg:pb-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-primary/75">Market overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f6f5eb] sm:text-5xl">
            Why is the market moving?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            A compact evidence map of the forces that currently matter — with
            competing explanations kept visible.
          </p>
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[0.035] text-muted-foreground hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Search assets"
        >
          <Search className="size-[1.1rem]" aria-hidden="true" />
        </button>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#101e19] p-5 sm:p-7">
        <div className="grid gap-7 md:grid-cols-[1fr_0.8fr] md:items-center">
          <div>
            <p className="eyebrow">Composite reading</p>
            <div className="mt-3 flex items-end gap-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Selective risk appetite
              </h2>
              <span className="mb-1 rounded-lg bg-amber-300/10 px-2 py-1 font-mono text-[0.63rem] uppercase tracking-[0.1em] text-amber-100">
                Mixed
              </span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#aebdb5]">
              Index resilience is being offset by restrictive long rates and uneven
              sector participation. The evidence supports caution, not a decisive
              directional call.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Growth', 'Firm'],
              ['Rates', 'Tight'],
              ['Breadth', 'Narrow'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/7 bg-black/10 p-3">
                <p className="font-mono text-[0.59rem] uppercase tracking-[0.09em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="drivers-heading">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <h2 id="drivers-heading" className="text-sm font-semibold text-white">
            Current evidence map
          </h2>
          <span className="font-mono text-[0.63rem] uppercase tracking-[0.1em] text-muted-foreground">
            Official sources
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {marketDrivers.map((driver, index) => {
            const Icon = driverIcons[index];
            return (
              <article
                key={driver.id}
                className="glass-panel rounded-[1.3rem] border border-white/8 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-[1.05rem]" aria-hidden="true" />
                  </span>
                  <span
                    className={`rounded-lg px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] ${
                      driver.direction === 'Headwind'
                        ? 'bg-rose-300/10 text-rose-200'
                        : 'bg-amber-300/10 text-amber-100'
                    }`}
                  >
                    {driver.direction}
                  </span>
                </div>
                <p className="eyebrow mt-5">{driver.label}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  {driver.value}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#aebdb5]">{driver.detail}</p>
                <div className="mt-4 border-t border-white/8 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{driver.source}</span>
                    <span className="font-mono text-primary">{driver.confidence}%</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="benchmarks-heading">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <h2 id="benchmarks-heading" className="text-sm font-semibold text-white">
            Key lenses
          </h2>
          <span className="text-xs text-muted-foreground">Demo · delayed</span>
        </div>
        <div className="mt-3 divide-y divide-white/8 rounded-[1.3rem] border border-white/8 bg-white/[0.025]">
          {assets
            .filter((asset) => ['SPY', 'TLT', 'XLE'].includes(asset.symbol))
            .map((asset) => (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => onOpenAsset(asset.symbol)}
                className="flex min-h-[4.6rem] w-full items-center gap-4 px-4 text-left hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring sm:px-5"
              >
                <span className="grid size-10 place-items-center rounded-xl border border-white/8 bg-white/[0.035] font-mono text-xs font-bold text-primary">
                  {asset.symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {asset.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {asset.assetClass}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold text-white">{asset.value}</span>
                  <span
                    className={`block font-mono text-[0.65rem] ${
                      asset.direction === 'up'
                        ? 'text-emerald-200'
                        : asset.direction === 'down'
                          ? 'text-rose-200'
                          : 'text-amber-100'
                    }`}
                  >
                    {asset.move}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            ))}
        </div>
      </section>

      <aside className="mt-8 flex gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 text-xs leading-5 text-muted-foreground">
        <CircleGauge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        “Why” is an evidence-ranked explanation, not proof of causation. Confidence
        falls when sources disagree, data is stale, or the move is primarily
        headline-driven.
      </aside>
    </main>
  );
}
