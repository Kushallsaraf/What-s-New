'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';

import type { Asset } from '@/lib/product-types';

type SearchOverlayProps = {
  open: boolean;
  assets: Asset[];
  watchlist: string[];
  onClose: () => void;
  onOpenAsset: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
};

export function SearchOverlay({
  open,
  assets,
  watchlist,
  onClose,
  onOpenAsset,
  onToggleWatchlist,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose, open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return assets;
    return assets.filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(normalized) ||
        asset.name.toLowerCase().includes(normalized) ||
        asset.assetClass.toLowerCase().includes(normalized),
    );
  }, [assets, query]);

  if (!open) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-start justify-center border-0 bg-[#020705]/80 px-3 pt-3 text-foreground backdrop-blur-md sm:px-6 sm:pt-[8vh]"
      aria-label="Search assets"
    >
      <div className="glass-panel max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-[1.4rem] border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/8 px-4 sm:px-5">
          <Search className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company, ETF, or theme"
            className="min-h-14 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(88dvh-3.5rem)] overflow-y-auto p-2 sm:p-3">
          {results.length ? (
            results.map((asset) => {
              const tracked = watchlist.includes(asset.symbol);
              return (
                <div
                  key={asset.symbol}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.045]"
                >
                  <button
                    type="button"
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => onOpenAsset(asset.symbol)}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[0.045] font-mono text-[0.68rem] font-bold text-primary">
                      {asset.symbol.slice(0, 3)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">
                        {asset.symbol} · {asset.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {asset.assetClass}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleWatchlist(asset.symbol)}
                    aria-label={
                      tracked
                        ? `Remove ${asset.symbol} from watchlist`
                        : `Add ${asset.symbol} to watchlist`
                    }
                    className={`grid size-10 shrink-0 place-items-center rounded-xl border focus-visible:outline-2 focus-visible:outline-ring ${
                      tracked
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-white/8 text-muted-foreground hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    {tracked ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-14 text-center">
              <p className="font-medium text-white">No demo assets match “{query}”.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The live symbol directory arrives with the market-data adapter.
              </p>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
