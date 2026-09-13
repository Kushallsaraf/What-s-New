'use client';

import { ChevronRight, Plus, Search, Trash2 } from 'lucide-react';

import { AssetSparkline } from '@/components/asset-sparkline';
import type { Asset } from '@/lib/product-types';

type WatchlistViewProps = {
  assets: Asset[];
  onOpenAsset: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onSearch: () => void;
};

export function WatchlistView({
  assets,
  onOpenAsset,
  onRemove,
  onSearch,
}: WatchlistViewProps) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1060px] px-4 pb-32 pt-5 sm:px-7 sm:pt-8 lg:px-10 lg:pb-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-primary/75">Personal monitor</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f6f5eb] sm:text-5xl">
            Your watchlist
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Periodic updates ranked by what changed, the strength of the evidence,
            and what could matter next.
          </p>
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[0.035] text-muted-foreground hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Search and add assets"
        >
          <Search className="size-[1.1rem]" aria-hidden="true" />
        </button>
      </header>

      <div className="mt-8 flex items-center justify-between border-b border-white/8 pb-3">
        <p className="text-xs font-medium text-[#cbd6cf]">
          {assets.length} tracked {assets.length === 1 ? 'asset' : 'assets'}
        </p>
        <p className="font-mono text-[0.63rem] uppercase tracking-[0.1em] text-muted-foreground">
          Demo · delayed
        </p>
      </div>

      {assets.length ? (
        <section className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Tracked assets">
          {assets.map((asset) => (
            <article
              key={asset.symbol}
              className="glass-panel group relative overflow-hidden rounded-[1.3rem] border border-white/8 p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => onOpenAsset(asset.symbol)}
                  aria-label={`Open ${asset.symbol} research timeline`}
                  className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-mono text-base font-bold tracking-tight text-white">
                        {asset.symbol}
                      </h2>
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold ${
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
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {asset.name}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRemove(asset.symbol)}
                    aria-label={`Remove ${asset.symbol} from watchlist`}
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground opacity-80 hover:bg-rose-300/10 hover:text-rose-200 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                  <ChevronRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenAsset(asset.symbol)}
                className="mt-5 w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="grid grid-cols-[1fr_132px] items-end gap-4">
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.03em] text-white">
                      {asset.value}
                    </p>
                    <p className="mt-1 font-mono text-[0.61rem] uppercase tracking-[0.08em] text-muted-foreground">
                      {asset.freshness}
                    </p>
                  </div>
                  <AssetSparkline
                    values={asset.sparkline}
                    direction={asset.direction}
                    className="h-14 w-full opacity-85"
                  />
                </div>

                <div className="mt-4 border-t border-white/8 pt-3">
                  <p className="line-clamp-2 text-xs leading-5 text-[#aebdb5]">
                    {asset.context}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${asset.confidence}%` }}
                      />
                    </span>
                    <span className="font-mono text-[0.63rem] text-muted-foreground">
                      {asset.confidence}% confidence
                    </span>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-[1.35rem] border border-dashed border-white/12 bg-white/[0.025] px-5 py-16 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-semibold text-white">Build a focused watchlist</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Add a few companies or ETFs. The goal is useful changes, not another
            stream of every headline.
          </p>
          <button
            type="button"
            onClick={onSearch}
            className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Find assets
          </button>
        </section>
      )}

      <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-5 text-muted-foreground">
        Prices in this prototype are fixed examples, clearly delayed, and must not
        be used to place trades.
      </p>
    </main>
  );
}
