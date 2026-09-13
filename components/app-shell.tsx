'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  ChartNoAxesCombined,
  LayoutList,
  ListFilter,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react';

import { AssetView } from '@/components/views/asset-view';
import { MarketView } from '@/components/views/market-view';
import { SettingsView } from '@/components/views/settings-view';
import { WatchlistView } from '@/components/views/watchlist-view';
import { MorningBriefing } from '@/components/morning-briefing';
import { SearchOverlay } from '@/components/search-overlay';
import { assets, defaultWatchlist } from '@/lib/demo-data';
import type { AppView, UserSettings } from '@/lib/product-types';

const defaultSettings: UserSettings = {
  morningBrief: true,
  eventAlerts: true,
  watchlistDigest: true,
  endOfDay: false,
  reducedMotion: false,
  interests: ['Technology', 'Macro', 'Energy'],
};

const navItems = [
  { id: 'brief' as const, label: 'Brief', icon: LayoutList },
  { id: 'watchlist' as const, label: 'Watchlist', icon: ListFilter },
  { id: 'markets' as const, label: 'Markets', icon: ChartNoAxesCombined },
  { id: 'settings' as const, label: 'Settings', icon: Settings2 },
];

export function AppShell() {
  const [view, setView] = useState<AppView>('brief');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [watchlist, setWatchlist] = useState(defaultWatchlist);
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedWatchlist = window.localStorage.getItem('whats-new-watchlist');
        const savedSettings = window.localStorage.getItem('whats-new-settings');
        if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
        if (savedSettings) setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch {
        // The app remains usable when storage is unavailable or contains invalid data.
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem('whats-new-watchlist', JSON.stringify(watchlist));
    window.localStorage.setItem('whats-new-settings', JSON.stringify(settings));
  }, [ready, settings, watchlist]);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.symbol === selectedSymbol) ?? null,
    [selectedSymbol],
  );

  const openAsset = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const switchView = useCallback((nextView: AppView) => {
    setSelectedSymbol(null);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist((current) =>
      current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : [...current, symbol],
    );
  }, []);

  return (
    <div className={settings.reducedMotion ? 'motion-reduce' : ''}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-white/8 bg-[#08120f]/94 px-4 py-6 backdrop-blur-xl lg:flex">
        <button
          type="button"
          onClick={() => switchView('brief')}
          className="flex items-center gap-2.5 rounded-xl px-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
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
        </button>

        <nav className="mt-10 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = view === item.id && !selectedAsset;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-[#92a39a] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="size-[1.05rem]" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mt-5 flex min-h-11 items-center gap-3 rounded-xl border border-white/8 px-3 text-sm text-muted-foreground hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Search className="size-[1.05rem]" aria-hidden="true" />
          Search assets
          <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 font-mono text-[0.62rem] text-muted-foreground">
            /
          </kbd>
        </button>

        <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
          <p className="flex items-center gap-2 text-xs font-medium text-white">
            <BellRing className="size-3.5 text-primary" aria-hidden="true" />
            Research alerts
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            {settings.eventAlerts ? 'Event-driven alerts are on.' : 'Alerts are currently paused.'}
          </p>
        </div>
      </aside>

      <div className="lg:pl-56">
        {selectedAsset ? (
          <AssetView
            asset={selectedAsset}
            tracked={watchlist.includes(selectedAsset.symbol)}
            onBack={() => setSelectedSymbol(null)}
            onToggleWatchlist={() => toggleWatchlist(selectedAsset.symbol)}
          />
        ) : view === 'brief' ? (
          <MorningBriefing
            alertOn={settings.eventAlerts}
            onToggleAlerts={() =>
              setSettings((current) => ({
                ...current,
                eventAlerts: !current.eventAlerts,
              }))
            }
            onSearch={() => setSearchOpen(true)}
          />
        ) : view === 'watchlist' ? (
          <WatchlistView
            assets={assets.filter((asset) => watchlist.includes(asset.symbol))}
            onOpenAsset={openAsset}
            onRemove={toggleWatchlist}
            onSearch={() => setSearchOpen(true)}
          />
        ) : view === 'markets' ? (
          <MarketView onOpenAsset={openAsset} onSearch={() => setSearchOpen(true)} />
        ) : (
          <SettingsView settings={settings} onChange={setSettings} />
        )}
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07110e]/94 px-2 pt-2 shadow-[0_-20px_45px_rgb(0_0_0/25%)] backdrop-blur-xl lg:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {navItems.map((item) => {
            const active = view === item.id && !selectedAsset;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[0.64rem] font-medium focus-visible:outline-2 focus-visible:outline-ring ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="size-[1.1rem]" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <SearchOverlay
        open={searchOpen}
        assets={assets}
        watchlist={watchlist}
        onClose={() => setSearchOpen(false)}
        onOpenAsset={openAsset}
        onToggleWatchlist={toggleWatchlist}
      />
    </div>
  );
}
