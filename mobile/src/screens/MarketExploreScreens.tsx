import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Landmark, LineChart, Search, Star } from 'lucide-react-native';

import { majorIndices, stocks, sectors, initialQuotes } from '../data';
import { colors, fonts, hitSlop, radius, tabular } from '../theme';
import type { MarketRowData, Quote, Stock } from '../types';
import { ChangePill, ChoiceChip, ScreenHeader, StockAvatar } from '../components/Ui';

const globalMarkets: MarketRowData[] = [
  { name: 'STOXX Europe 600', value: '586.40', change: 0.2 },
  { name: 'Nikkei 225', value: '44,106.20', change: -0.3 },
  { name: 'Hang Seng', value: '26,185.10', change: 0.4 },
];

const macroRows: MarketRowData[] = [
  { name: 'U.S. 10-year yield', value: '4.12%', change: 0.06 },
  { name: 'WTI crude', value: '$91.20', change: 0.2 },
  { name: 'Dollar index', value: '102.41', change: 0.1 },
];

function MarketRow({ row, bps = false }: { row: MarketRowData; bps?: boolean }) {
  return (
    <View style={styles.marketRow}>
      <Text style={styles.marketName}>{row.name}</Text>
      <View style={styles.marketQuote}>
        <Text style={styles.marketValue}>{row.value}</Text>
        {bps ? (
          <Text style={[styles.bps, { color: row.change > 0 ? colors.bear : colors.bull }]}>{row.change > 0 ? '+' : ''}{Math.round(row.change * 100)} bps</Text>
        ) : (
          <ChangePill value={row.change} />
        )}
      </View>
    </View>
  );
}

function MarketGroup({ title, rows, bps = false }: { title: string; rows: MarketRowData[]; bps?: boolean }) {
  const Icon = bps ? Landmark : LineChart;
  return (
    <View style={styles.group}>
      <View style={styles.groupTitleRow}>
        <Icon size={13} color={colors.textFaint} />
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      <View style={styles.groupCard}>
        {rows.map((row, index) => (
          <View key={row.name}>
            <MarketRow row={row} bps={bps} />
            {index < rows.length - 1 ? <View style={styles.rowDivider} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function MarketsScreen({ quotes }: { quotes: Record<string, Quote> }) {
  const movers = stocks
    .map((stock) => ({ stock, quote: quotes[stock.ticker] ?? initialQuotes[stock.ticker] }))
    .sort((a, b) => Math.abs(b.quote.change) - Math.abs(a.quote.change))
    .slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Markets" subtitle="Delayed context from free and official sources" />
      <LinearGradient colors={[colors.brandDim, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.driverCard}>
        <Text style={styles.driverQuestion}>Why is the market moving?</Text>
        <Text style={styles.driverAnswer}>
          The evidence map points to restrictive long yields, resilient AI capital spending, and narrow index breadth as today’s main drivers.
        </Text>
        <View style={styles.moverRow}>
          {movers.map(({ stock, quote }) => (
            <Text key={stock.ticker} style={[styles.mover, { color: quote.change >= 0 ? colors.bull : colors.bear, backgroundColor: quote.change >= 0 ? colors.bullDim : colors.bearDim }]}>
              {stock.ticker} {quote.change > 0 ? '+' : ''}{quote.change.toFixed(1)}%
            </Text>
          ))}
        </View>
      </LinearGradient>

      <MarketGroup title="Major indices" rows={majorIndices} />
      <MarketGroup title="Global markets" rows={globalMarkets} />
      <MarketGroup title="Rates, energy & FX" rows={macroRows} bps />

      <Text style={styles.sectionLabel}>Market leaders by sector</Text>
      {sectors.map((sector) => {
        const leaders = stocks
          .filter((stock) => stock.sector === sector)
          .map((stock) => ({ stock, quote: quotes[stock.ticker] }))
          .filter((item) => item.quote)
          .sort((a, b) => Math.abs(b.quote.change) - Math.abs(a.quote.change))
          .slice(0, 3);
        if (!leaders.length) return null;
        return (
          <View key={sector} style={styles.sectorBlock}>
            <Text style={styles.sectorLabel}>{sector}</Text>
            {leaders.map(({ stock, quote }) => (
              <MarketRow key={stock.ticker} row={{ name: stock.name, value: `$${quote.price.toFixed(2)}`, change: quote.change }} />
            ))}
          </View>
        );
      })}

      <Text style={styles.sectionLabel}>What the evidence says</Text>
      <View style={styles.evidenceCard}>
        <View style={styles.evidenceHeader}>
          <View>
            <Text style={styles.evidenceName}>U.S. Treasury & FRED</Text>
            <Text style={styles.evidenceRole}>Official rates data</Text>
          </View>
          <Text style={styles.factTag}>FACT</Text>
        </View>
        <Text style={styles.evidenceText}>“Long yields remain above their recent median.”</Text>
        <Text style={styles.evidenceMeta}>Mixed · Rates · 86% confidence</Text>
      </View>
      <View style={styles.evidenceCard}>
        <View style={styles.evidenceHeader}>
          <View>
            <Text style={styles.evidenceName}>Research interpretation</Text>
            <Text style={styles.evidenceRole}>Scenario, not a forecast</Text>
          </View>
          <Text style={styles.scenarioTag}>SCENARIO</Text>
        </View>
        <Text style={styles.evidenceText}>“Broader participation would improve the quality of the index move.”</Text>
        <Text style={styles.evidenceMeta}>Neutral · Breadth · 76% confidence</Text>
      </View>
    </ScrollView>
  );
}

export function AssetRow({ stock, quote, watching, onToggleWatch }: { stock: Stock; quote: Quote; watching: boolean; onToggleWatch: (ticker: string) => void }) {
  return (
    <View style={styles.assetRow}>
      <View style={styles.assetIdentity}>
        <StockAvatar ticker={stock.ticker} sector={stock.sector} size={28} />
        <View style={styles.assetCopy}>
          <Text style={styles.assetTicker}>${stock.ticker}</Text>
          <Text style={styles.assetName} numberOfLines={1}>{stock.name}</Text>
        </View>
      </View>
      <View style={styles.assetQuote}>
        <View style={styles.assetPriceBlock}>
          <Text style={styles.assetPrice}>${quote.price.toFixed(2)}</Text>
          <ChangePill value={quote.change} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${watching ? 'Remove' : 'Add'} ${stock.ticker} ${watching ? 'from' : 'to'} watchlist`} hitSlop={hitSlop} onPress={() => onToggleWatch(stock.ticker)}>
          <Star size={16} color={watching ? colors.amber : colors.textFaint} fill={watching ? colors.amber : 'transparent'} />
        </Pressable>
      </View>
    </View>
  );
}

export function ExploreScreen({ quotes, watchlist, onToggleWatch }: { quotes: Record<string, Quote>; watchlist: string[]; onToggleWatch: (ticker: string) => void }) {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('All');
  const filtered = useMemo(
    () => stocks.filter((stock) => {
      const needle = query.trim().toLowerCase();
      const matchesQuery = !needle || stock.ticker.toLowerCase().includes(needle) || stock.name.toLowerCase().includes(needle);
      return matchesQuery && (sector === 'All' || stock.sector === sector);
    }),
    [query, sector],
  );

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Explore" subtitle={`${stocks.length} assets across ${sectors.length} themes · delayed prices`} />
      <View style={styles.searchBox}>
        <Search size={15} color={colors.textFaint} />
        <TextInput
          accessibilityLabel="Search ticker or company"
          autoCapitalize="characters"
          onChangeText={setQuery}
          placeholder="Search ticker or company..."
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          value={query}
        />
      </View>
      <ScrollView horizontal contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false}>
        {['All', ...sectors].map((item) => (
          <ChoiceChip key={item} label={item} selected={sector === item} onPress={() => setSector(item)} />
        ))}
      </ScrollView>

      {sector === 'All' && !query ? (
        sectors.map((item) => {
          const rows = stocks.filter((stock) => stock.sector === item);
          return (
            <View key={item} style={styles.exploreGroup}>
              <View style={styles.exploreGroupHeader}>
                <Text style={styles.exploreGroupTitle}>{item}</Text>
                <Text style={styles.exploreCount}>{rows.length} assets</Text>
              </View>
              {rows.map((stock) => (
                <AssetRow key={stock.ticker} stock={stock} quote={quotes[stock.ticker]} watching={watchlist.includes(stock.ticker)} onToggleWatch={onToggleWatch} />
              ))}
            </View>
          );
        })
      ) : filtered.length ? (
        filtered.map((stock) => (
          <AssetRow key={stock.ticker} stock={stock} quote={quotes[stock.ticker]} watching={watchlist.includes(stock.ticker)} onToggleWatch={onToggleWatch} />
        ))
      ) : (
        <Text style={styles.empty}>No matches. Try another ticker or company name.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 112, paddingHorizontal: 16, paddingTop: 14 },
  driverCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: 20, marginTop: 14, padding: 16 },
  driverQuestion: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, marginBottom: 4 },
  driverAnswer: { color: colors.text, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, marginBottom: 10 },
  moverRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mover: { borderRadius: radius.sm, fontFamily: fonts.mono, fontSize: 11, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 , ...tabular },
  group: { marginBottom: 20 },
  groupTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 8 },
  groupTitle: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  groupCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 13 },
  marketRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, paddingVertical: 9 },
  marketName: { color: colors.text, flex: 1, fontFamily: fonts.semiBold, fontSize: 12.5, paddingRight: 10 },
  marketQuote: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  marketValue: { color: colors.text, fontFamily: fonts.mono, fontSize: 11.5 , ...tabular },
  bps: { fontFamily: fonts.monoSemiBold, fontSize: 10.5, minWidth: 48, textAlign: 'right' , ...tabular },
  rowDivider: { backgroundColor: colors.border, height: 1 },
  sectionLabel: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
  sectorBlock: { marginBottom: 14 },
  sectorLabel: { color: colors.textFaint, fontFamily: fonts.bold, fontSize: 11.5, marginBottom: 3 },
  evidenceCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: 10, padding: 13 },
  evidenceHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  evidenceName: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  evidenceRole: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
  factTag: { backgroundColor: colors.brandDim, borderRadius: 6, color: colors.brand, fontFamily: fonts.extraBold, fontSize: 9.5, letterSpacing: 0.5, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2 },
  scenarioTag: { backgroundColor: colors.amberDim, borderRadius: 6, color: colors.amber, fontFamily: fonts.extraBold, fontSize: 9.5, letterSpacing: 0.5, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2 },
  evidenceText: { color: colors.text, fontFamily: fonts.regular, fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginBottom: 8 },
  evidenceMeta: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11 },
  searchBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 14, paddingHorizontal: 12 },
  searchInput: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 13.5, height: 42 },
  chips: { gap: 7, paddingBottom: 16 },
  exploreGroup: { marginBottom: 22 },
  exploreGroupHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  exploreGroupTitle: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 13 },
  exploreCount: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 10.5 },
  assetRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 58, paddingVertical: 9 },
  assetIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 9 },
  assetCopy: { flex: 1 },
  assetTicker: { color: colors.text, fontFamily: fonts.monoSemiBold, fontSize: 12.5 },
  assetName: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 10.5, marginTop: 2 },
  assetQuote: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  assetPriceBlock: { alignItems: 'flex-end', gap: 3 },
  assetPrice: { color: colors.text, fontFamily: fonts.mono, fontSize: 11.5 , ...tabular },
  empty: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, padding: 30, textAlign: 'center' },
});
