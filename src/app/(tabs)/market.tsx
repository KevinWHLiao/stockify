import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MARKET_INDICES, SECTOR_GROUP_LABEL, SECTOR_HEADLINES, SECTOR_INDICES, type SectorGroup } from '../../data/market';
import { refreshMarketQuotes, useMarketQuotes } from '../../hooks/useMarketQuotes';
import { formatMove, formatQuotePrice, formatVolume } from '../../lib/format';
import { formatQuoteStamp } from '../../lib/time';
import { searchSymbols } from '../../services/quotes';
import { useStore } from '../../store/useStore';
import type { Quote, SymbolInfo, WatchItem } from '../../types';
import { colors, pnlColor } from '../../theme';
import { FieldInput, T } from '../../components/Text';

export default function MarketScreen() {
  useMarketQuotes(true);
  const watchlist = useStore((state) => state.watchlist);
  const marketQuotes = useStore((state) => state.marketQuotes);
  const marketSyncing = useStore((state) => state.marketSyncing);
  const marketError = useStore((state) => state.marketError);
  const addWatch = useStore((state) => state.addWatch);
  const removeWatch = useStore((state) => state.removeWatch);
  const [pulling, setPulling] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [sectorFilter, setSectorFilter] = useState<'all' | SectorGroup>('all');

  const indices = useMemo(
    () =>
      MARKET_INDICES.map((item) => ({
        meta: item,
        quote: marketQuotes[item.symbol],
      })),
    [marketQuotes],
  );

  const headlines = useMemo(
    () =>
      SECTOR_HEADLINES.map((item) => ({
        meta: item,
        quote: marketQuotes[item.symbol],
      })),
    [marketQuotes],
  );

  const sectorGroups = useMemo(() => {
    const groups: SectorGroup[] = sectorFilter === 'all' ? ['electronics', 'traditional'] : [sectorFilter];
    return groups
      .map((group) => {
        const details = SECTOR_INDICES.filter((item) => item.group === group);
        const items = details.length > 0 ? details : SECTOR_HEADLINES.filter((item) => item.group === group);
        const rows = items
          .map((item) => ({ meta: item, quote: marketQuotes[item.symbol] }))
          .sort((a, b) => (b.quote?.changePercent ?? Number.NEGATIVE_INFINITY) - (a.quote?.changePercent ?? Number.NEGATIVE_INFINITY));
        return { group, label: SECTOR_GROUP_LABEL[group], rows };
      })
      .filter((group) => group.rows.length > 0);
  }, [marketQuotes, sectorFilter]);

  const rows = useMemo(
    () =>
      watchlist.map((item) => ({
        item,
        quote: marketQuotes[item.symbol],
      })),
    [marketQuotes, watchlist],
  );

  const stamp = useMemo(() => {
    const quotes = Object.values(marketQuotes);
    const withTime = quotes.find((quote) => quote.time);
    return withTime ? formatQuoteStamp(withTime.date, withTime.time) : '';
  }, [marketQuotes]);

  useEffect(() => {
    if (!picking) return;
    let cancelled = false;
    void searchSymbols(query).then((items) => {
      if (!cancelled) setResults(items);
    });
    return () => {
      cancelled = true;
    };
  }, [picking, query]);

  const onRefresh = async () => {
    setPulling(true);
    await refreshMarketQuotes();
    setPulling(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={colors.text} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View style={header}>
          <View style={{ flex: 1 }}>
            <T style={title}>行情</T>
            <T style={subtitle}>{marketSyncing ? '更新行情中…' : stamp ? `行情 ${stamp}` : '下拉可更新大盤與自選'}</T>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="加入自選" onPress={() => setPicking(true)} style={iconButton}>
            <Ionicons name="add" size={22} color={colors.text} />
          </Pressable>
        </View>

        {marketError ? <T style={errorText}>{marketError}</T> : null}

        <T style={section}>大盤走勢</T>
        <View style={indexGrid}>
          {indices.map(({ meta, quote }) => (
            <IndexCard
              key={meta.symbol}
              shortName={meta.shortName}
              quote={quote}
              onPress={() => router.push({ pathname: '/quote/[symbol]', params: { symbol: meta.symbol } })}
            />
          ))}
        </View>

        <View style={sectionRow}>
          <T style={sectionTitle}>類股表現</T>
          <T style={sectionHint}>電子、金融、傳產</T>
        </View>
        <T style={sectorNote}>傳產是未含金融、電子的類股。點進去可看指數明細。</T>
        <View style={headlineRow}>
          {headlines.map(({ meta, quote }) => {
            const tone = pnlColor(quote?.change);
            return (
              <Pressable
                key={meta.symbol}
                accessibilityRole="button"
                accessibilityLabel={meta.name}
                onPress={() => router.push({ pathname: '/quote/[symbol]', params: { symbol: meta.symbol } })}
                style={headlineCard}
              >
                <T style={indexLabel}>{meta.shortName}</T>
                <T style={[headlinePrice, { color: quote ? tone : colors.flat }]} numberOfLines={1} adjustsFontSizeToFit>
                  {quote ? formatQuotePrice(quote.price) : '—'}
                </T>
                <T style={[indexMove, { color: quote ? tone : colors.flat }]} numberOfLines={1} adjustsFontSizeToFit>
                  {quote ? formatMove(quote.change, quote.changePercent) : '尚無報價'}
                </T>
              </Pressable>
            );
          })}
        </View>
        <View style={chipRow}>
          {(
            [
              ['all', '全部'],
              ['electronics', '電子'],
              ['finance', '金融'],
              ['traditional', '傳產'],
            ] as const
          ).map(([id, label]) => {
            const active = sectorFilter === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSectorFilter(id)}
                style={[chip, active && chipActive]}
              >
                <T style={[chipText, active && chipTextActive]}>{label}</T>
              </Pressable>
            );
          })}
        </View>
        {sectorGroups.map((group) => (
          <View key={group.group}>
            <T style={groupLabel}>{group.label}</T>
            {group.group === 'finance' ? <T style={groupHint}>證交所沒有再把金融拆成銀行、保險、證券。</T> : null}
            {group.rows.map(({ meta, quote }) => (
              <Pressable
                key={meta.symbol}
                accessibilityRole="button"
                accessibilityLabel={meta.name}
                onPress={() => router.push({ pathname: '/quote/[symbol]', params: { symbol: meta.symbol } })}
                style={sectorRow}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <T style={rowName}>{meta.shortName}</T>
                  <T style={rowMeta}>{meta.name}</T>
                </View>
                <View style={{ alignItems: 'flex-end', minWidth: 108 }}>
                  <T style={[watchPrice, { color: quote ? colors.text : colors.flat }]}>
                    {quote ? formatQuotePrice(quote.price) : '—'}
                  </T>
                  <T style={[watchMove, { color: quote ? pnlColor(quote.change) : colors.flat }]}>
                    {quote ? formatMove(quote.change, quote.changePercent) : '尚無報價'}
                  </T>
                </View>
              </Pressable>
            ))}
          </View>
        ))}

        <View style={sectionRow}>
          <T style={sectionTitle}>自選行情</T>
          <T style={sectionHint}>{watchlist.length} 檔</T>
        </View>
        {rows.length === 0 ? (
          <View style={empty}>
            <T style={emptyTitle}>還沒有自選股</T>
            <T style={emptyBody}>點右上角加號，搜尋代號或名稱加入觀察。</T>
          </View>
        ) : (
          rows.map(({ item, quote }) => (
            <WatchRow
              key={item.symbol}
              item={item}
              quote={quote}
              onPress={() => router.push({ pathname: '/quote/[symbol]', params: { symbol: item.symbol } })}
              onRemove={() => removeWatch(item.symbol)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={pickerHead}>
            <T style={title}>加入自選</T>
            <Pressable accessibilityRole="button" onPress={() => setPicking(false)}>
              <T style={closeText}>完成</T>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <FieldInput value={query} onChangeText={setQuery} placeholder="搜尋代號或名稱，例如 2330、台積電" autoFocus />
          </View>
          <FlatList
            data={results}
            keyExtractor={(item) => item.symbol}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const watched = watchlist.some((watch) => watch.symbol === item.symbol);
              return (
                <Pressable
                  accessibilityRole="button"
                  style={pickerRow}
                  onPress={() => {
                    if (watched) {
                      removeWatch(item.symbol);
                      return;
                    }
                    addWatch({ symbol: item.symbol, name: item.name, market: item.market });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <T style={rowName}>
                      {item.symbol} {item.name}
                    </T>
                    <T style={rowMeta}>{item.market === 'otc' ? '上櫃' : '上市'}・{item.assetType === 'etf' ? 'ETF' : '股票'}</T>
                  </View>
                  <T style={[pickerAction, watched && { color: colors.danger }]}>{watched ? '移除' : '加入'}</T>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function IndexCard({ shortName, quote, onPress }: { shortName: string; quote?: Quote; onPress: () => void }) {
  const tone = pnlColor(quote?.change);
  return (
    <View style={indexCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={shortName} onPress={onPress} style={indexInner}>
        <T style={indexLabel}>{shortName}</T>
        <T style={[indexPrice, { color: quote ? tone : colors.flat }]} numberOfLines={1} adjustsFontSizeToFit>
          {quote ? formatQuotePrice(quote.price) : '—'}
        </T>
        <T style={[indexMove, { color: quote ? tone : colors.flat }]}>
          {quote ? formatMove(quote.change, quote.changePercent) : '尚無報價'}
        </T>
      </Pressable>
    </View>
  );
}

function WatchRow({
  item,
  quote,
  onPress,
  onRemove,
}: {
  item: WatchItem;
  quote?: Quote;
  onPress: () => void;
  onRemove: () => void;
}) {
  const tone = pnlColor(quote?.change);
  return (
    <View style={watchCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={onPress} style={watchMain}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <T style={rowName} numberOfLines={1}>
            {item.name}
          </T>
          <T style={rowMeta}>
            {item.symbol}
            {quote?.volume != null ? ` · ${formatVolume(quote.volume)}` : ''}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end', minWidth: 96 }}>
          <T style={[watchPrice, { color: quote ? colors.text : colors.flat }]}>
            {quote ? formatQuotePrice(quote.price) : '—'}
          </T>
          <T style={[watchMove, { color: quote ? tone : colors.flat }]}>
            {quote ? formatMove(quote.change, quote.changePercent) : '尚無報價'}
          </T>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="移除自選" hitSlop={8} onPress={onRemove} style={removeButton}>
        <Ionicons name="close" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const header = {
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 8,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
};
const title = { fontSize: 28, fontWeight: '800' as const, color: colors.text };
const subtitle = { marginTop: 4, color: colors.muted, fontSize: 13 };
const iconButton = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.surface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const errorText = { paddingHorizontal: 20, paddingBottom: 8, fontSize: 12, color: colors.up };
const section = { marginTop: 10, marginHorizontal: 20, marginBottom: 10, fontSize: 16, fontWeight: '800' as const, color: colors.text };
const sectionRow = {
  marginTop: 14,
  marginHorizontal: 20,
  marginBottom: 10,
  flexDirection: 'row' as const,
  alignItems: 'baseline' as const,
  justifyContent: 'space-between' as const,
};
const sectionTitle = { fontSize: 16, fontWeight: '800' as const, color: colors.text };
const sectionHint = { color: colors.muted, fontSize: 13, fontWeight: '600' as const };
const sectorNote = { marginHorizontal: 20, marginTop: -4, marginBottom: 10, color: colors.muted, fontSize: 12, lineHeight: 18 };
const headlineRow = { flexDirection: 'row' as const, paddingHorizontal: 16, gap: 8 };
const headlineCard = {
  flex: 1,
  backgroundColor: colors.surface,
  borderRadius: 18,
  paddingHorizontal: 10,
  paddingVertical: 12,
};
const headlinePrice = { marginTop: 8, fontSize: 16, fontWeight: '800' as const };
const chipRow = { flexDirection: 'row' as const, paddingHorizontal: 16, marginTop: 12, gap: 8 };
const chip = { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.chip };
const chipActive = { backgroundColor: colors.blue };
const chipText = { color: colors.subtle, fontSize: 13, fontWeight: '700' as const };
const chipTextActive = { color: '#fff' };
const groupLabel = { marginTop: 14, marginHorizontal: 20, marginBottom: 8, color: colors.text, fontSize: 14, fontWeight: '800' as const };
const groupHint = { marginHorizontal: 20, marginTop: -4, marginBottom: 8, color: colors.muted, fontSize: 12 };
const sectorRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  marginHorizontal: 16,
  marginBottom: 8,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 18,
  backgroundColor: colors.surface,
};
const indexGrid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, paddingHorizontal: 16, justify: -4 };
const indexCard = {
  width: '50%' as const,
  padding: 4,
  backgroundColor: 'transparent',
};
const indexInner = {
  backgroundColor: colors.surface,
  borderRadius: 18,
  paddingHorizontal: 14,
  paddingVertical: 14,
};
const indexLabel = { fontSize: 12, color: colors.muted, fontWeight: '700' as const };
const indexPrice = { marginTop: 8, fontSize: 22, fontWeight: '800' as const };
const indexMove = { marginTop: 4, fontSize: 12, fontWeight: '700' as const };
const watchCard = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  marginHorizontal: 16,
  marginBottom: 8,
  paddingLeft: 14,
  paddingRight: 8,
  paddingVertical: 6,
  borderRadius: 18,
  backgroundColor: colors.surface,
  gap: 4,
};
const watchMain = {
  flex: 1,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  paddingVertical: 8,
};
const rowName = { fontSize: 16, fontWeight: '800' as const, color: colors.text };
const rowMeta = { marginTop: 3, fontSize: 12, color: colors.muted };
const watchPrice = { fontSize: 17, fontWeight: '800' as const };
const watchMove = { marginTop: 3, fontSize: 12, fontWeight: '700' as const };
const removeButton = {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: colors.chip,
  marginLeft: 4,
};
const empty = { marginHorizontal: 16, padding: 28, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center' as const, gap: 8 };
const emptyTitle = { fontSize: 17, fontWeight: '800' as const, color: colors.text };
const emptyBody = { fontSize: 13, color: colors.muted, textAlign: 'center' as const, lineHeight: 19 };
const pickerHead = {
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
};
const closeText = { color: colors.blue, fontWeight: '800' as const, fontSize: 16 };
const pickerRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  marginHorizontal: 16,
  marginBottom: 8,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderRadius: 16,
  backgroundColor: colors.surface,
  gap: 12,
};
const pickerAction = { color: colors.blue, fontWeight: '800' as const };
