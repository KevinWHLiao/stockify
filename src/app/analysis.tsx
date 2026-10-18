import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { T } from '../components/Text';
import { analyzeHoldings, lookThrough, type Exposure } from '../lib/analysis';
import { isTaiwanSymbol, type EtfConstituent } from '../lib/etfHoldings';
import { usePortfolio } from '../hooks/usePortfolio';
import { fetchEtfConstituents } from '../services/etf';
import { colors } from '../theme';

export default function AnalysisScreen() {
  const { views, summary } = usePortfolio();
  const notes = useMemo(() => analyzeHoldings(views, summary), [views, summary]);
  const etfKey = useMemo(
    () =>
      views
        .filter((view) => view.assetType === 'etf' && (view.marketValue ?? 0) > 0)
        .map((view) => view.symbol)
        .join('|'),
    [views],
  );
  const [baskets, setBaskets] = useState<Record<string, EtfConstituent[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const symbols = etfKey.split('|').filter(Boolean);
    if (symbols.length === 0) return undefined;
    let cancelled = false;
    setLoading(true);
    void Promise.all(
      symbols.map(async (symbol) => {
        const rows = await fetchEtfConstituents(symbol);
        return [symbol, rows] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, EtfConstituent[]> = {};
      for (const [symbol, rows] of pairs) next[symbol] = rows;
      setBaskets(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [etfKey]);

  const exposures = useMemo(() => lookThrough(views, baskets, summary.marketValue), [baskets, summary.marketValue, views]);
  const loaded = Object.values(baskets).some((rows) => rows.length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScreenHeader title="持股分析" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        {notes.map((note) => (
          <View key={note.title} style={card}>
            <T style={cardTitle}>{note.title}</T>
            <T style={cardBody}>{note.body}</T>
          </View>
        ))}

        <T style={heading}>實際曝險</T>
        <T style={hint}>
          {loading ? '正在讀取 ETF 成分股…' : loaded ? '已把讀得到的 ETF 成分股換算成佔整體市值的比重。' : 'ETF 成分股還沒讀到，下面先用你直接持有的標的。'}
        </T>
        {exposures.map((item) => (
          <ExposureRow key={item.symbol} item={item} />
        ))}
        <T style={disclaimer}>這些是根據你記的帳，以及發行公司公布的持股比重整理的觀察，不是買賣建議。</T>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExposureRow({ item }: { item: Exposure }) {
  const open = isTaiwanSymbol(item.symbol);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!open}
      onPress={() => router.push({ pathname: '/quote/[symbol]', params: { symbol: item.symbol } })}
      style={row}
    >
      <View style={{ flex: 1 }}>
        <T style={rowTitle}>
          {item.name} {item.symbol}
        </T>
        <T style={rowMeta}>{item.via.length > 0 ? `來自 ${item.via.join('、')}` : '直接持有'}</T>
      </View>
      <T style={rowWeight}>{item.weight.toFixed(1)}%</T>
    </Pressable>
  );
}

const card = { backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 10 };
const cardTitle = { color: colors.text, fontSize: 16, fontWeight: '800' as const };
const cardBody = { marginTop: 6, color: colors.subtle, fontSize: 14, lineHeight: 21 };
const heading = { marginTop: 18, color: colors.text, fontSize: 18, fontWeight: '800' as const };
const hint = { marginTop: 6, marginBottom: 10, color: colors.muted, fontSize: 13, lineHeight: 19 };
const row = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: colors.surface,
  borderRadius: 16,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginBottom: 8,
};
const rowTitle = { color: colors.text, fontWeight: '700' as const };
const rowMeta = { marginTop: 3, color: colors.muted, fontSize: 12 };
const rowWeight = { color: colors.text, fontWeight: '800' as const, fontSize: 16 };
const disclaimer = { marginTop: 16, color: colors.muted, fontSize: 12, lineHeight: 18 };
