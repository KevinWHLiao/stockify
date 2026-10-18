import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findMarketIndex } from '../../data/market';
import { findSymbol, inferAssetType } from '../../data/symbols';
import { usePortfolio } from '../../hooks/usePortfolio';
import { isTaiwanSymbol, type EtfConstituent } from '../../lib/etfHoldings';
import { formatInt, formatMove, formatQuotePrice, formatVolume } from '../../lib/format';
import { fetchEtfConstituents } from '../../services/etf';
import { fetchQuotes } from '../../services/quotes';
import type { Quote } from '../../types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { T } from '../../components/Text';
import { formatQuoteStamp } from '../../lib/time';
import { useStore } from '../../store/useStore';
import { colors, pnlColor } from '../../theme';

export default function QuoteScreen() {
  const params = useLocalSearchParams<{ symbol: string }>();
  const code = Array.isArray(params.symbol) ? params.symbol[0] : params.symbol;
  const marketQuotes = useStore((state) => state.marketQuotes);
  const holdingsQuotes = useStore((state) => state.quotes);
  const watchlist = useStore((state) => state.watchlist);
  const addWatch = useStore((state) => state.addWatch);
  const removeWatch = useStore((state) => state.removeWatch);
  const { views } = usePortfolio();
  const held = views.find((item) => item.symbol === code);

  const quote = (code && (marketQuotes[code] ?? holdingsQuotes[code])) || undefined;
  const indexMeta = code ? findMarketIndex(code) : undefined;
  const known = code ? findSymbol(code) : undefined;
  const watched = watchlist.find((item) => item.symbol === code);
  const name = quote?.name || indexMeta?.name || known?.name || code || '行情';
  const market = quote?.market ?? watched?.market ?? indexMeta?.market ?? known?.market ?? 'tse';
  const tone = pnlColor(quote?.change);
  const isIndex = Boolean(indexMeta) || Boolean(code && /^[to]\d+$/i.test(code));
  const isEtf = !isIndex && inferAssetType(code || '', name) === 'etf';
  const [constituents, setConstituents] = useState<EtfConstituent[]>([]);
  const [constituentQuotes, setConstituentQuotes] = useState<Record<string, Quote>>({});
  const [constituentState, setConstituentState] = useState<'idle' | 'loading' | 'ready' | 'empty'>('idle');

  useEffect(() => {
    if (!isEtf || !code) return undefined;
    let cancelled = false;
    setConstituentState('loading');
    void fetchEtfConstituents(code).then((rows) => {
      if (cancelled) return;
      setConstituents(rows);
      setConstituentState(rows.length > 0 ? 'ready' : 'empty');
    });
    return () => {
      cancelled = true;
    };
  }, [code, isEtf]);

  const constituentKey = constituents.map((item) => item.symbol).join('|');
  useEffect(() => {
    const requests = constituents
      .filter((item) => isTaiwanSymbol(item.symbol))
      .map((item) => ({ symbol: item.symbol, market: 'tse' as const }));
    if (requests.length === 0) return undefined;
    let cancelled = false;
    void fetchQuotes(requests).then((quotes) => {
      if (cancelled) return;
      const next: Record<string, Quote> = {};
      for (const item of quotes) next[item.symbol] = item;
      setConstituentQuotes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [constituentKey, constituents]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScreenHeader title={indexMeta?.shortName ?? name} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <T style={{ color: colors.muted }}>{indexMeta?.name ?? code}</T>
          <T style={[big, { color: quote ? tone : colors.flat }]}>{quote ? formatQuotePrice(quote.price) : '—'}</T>
          <T style={{ color: quote ? tone : colors.flat, fontWeight: '700' }}>
            {quote ? formatMove(quote.change, quote.changePercent) : '尚無報價'}
          </T>
          {quote?.time ? <T style={stamp}>更新 {formatQuoteStamp(quote.date, quote.time)}</T> : null}
        </View>

        <View style={grid}>
          <Stat label="昨收" value={quote ? formatQuotePrice(quote.previousClose) : '—'} />
          <Stat label="開盤" value={quote?.open == null ? '—' : formatQuotePrice(quote.open)} />
          <Stat label="最高" value={quote?.high == null ? '—' : formatQuotePrice(quote.high)} />
          <Stat label="最低" value={quote?.low == null ? '—' : formatQuotePrice(quote.low)} />
          {!isIndex ? <Stat label="成交量" value={formatVolume(quote?.volume)} /> : null}
          <Stat label="市場" value={market === 'otc' ? '上櫃' : '上市'} />
        </View>

        {isEtf ? (
          <View style={basket}>
            <T style={basketTitle}>成分股</T>
            <T style={basketHint}>
              {constituentState === 'loading'
                ? '讀取公布的持股比重…'
                : constituentState === 'empty'
                  ? '這檔 ETF 的成分股目前讀不到。'
                  : constituents.some((item) => item.weight > 100)
                    ? `依權重排序，共 ${constituents.length} 檔。槓桿 ETF 主要持有期貨，權重可以超過 100%，不是把指數成分股全部買進。`
                    : `依權重排序，共 ${constituents.length} 檔。`}
            </T>
            {constituents.map((item) => {
              const listed = isTaiwanSymbol(item.symbol);
              const live = constituentQuotes[item.symbol];
              const exposure = held?.marketValue != null ? (held.marketValue * item.weight) / 100 : null;
              return (
                <Pressable
                  key={item.symbol}
                  accessibilityRole="button"
                  disabled={!listed}
                  onPress={() => router.push({ pathname: '/quote/[symbol]', params: { symbol: item.symbol } })}
                  style={basketRow}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <T style={basketName}>{listed ? `${item.name} ${item.symbol}` : item.name}</T>
                    <T style={[basketMove, { color: live ? pnlColor(live.change) : colors.muted }]}>
                      {live ? formatMove(live.change, live.changePercent) : listed ? '報價更新中' : '非台股現股'}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T style={basketWeight}>{item.weight.toFixed(2)}%</T>
                    {exposure != null ? <T style={basketExposure}>曝險 {formatInt(exposure)}</T> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!isIndex ? (
          <View style={actions}>
            <Pressable
              accessibilityRole="button"
              style={actionButton}
              onPress={() => {
                if (!code) return;
                if (watched) {
                  removeWatch(code);
                  return;
                }
                addWatch({
                  symbol: code,
                  name,
                  market,
                });
              }}
            >
              <T style={actionText}>{watched ? '移除自選' : '加入自選'}</T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[actionButton, actionPrimary]}
              onPress={() => router.push({ pathname: '/add', params: { type: 'buy', symbol: code } })}
            >
              <T style={[actionText, { color: '#fff' }]}>記一筆</T>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={cell}>
      <T style={cellLabel}>{label}</T>
      <T style={cellValue}>{value}</T>
    </View>
  );
}

const big = { fontSize: 40, fontWeight: '800' as const, marginTop: 4 };
const stamp = { marginTop: 8, color: colors.muted, fontSize: 12 };
const grid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, paddingHorizontal: 12, marginTop: 16 };
const cell = { width: '50%' as const, paddingHorizontal: 8, paddingVertical: 10 };
const cellLabel = { color: colors.muted, fontSize: 12 };
const cellValue = { marginTop: 4, fontSize: 16, fontWeight: '700' as const, color: colors.text };
const actions = { flexDirection: 'row' as const, gap: 8, paddingHorizontal: 16, marginTop: 12 };
const actionButton = {
  flex: 1,
  backgroundColor: colors.blueSoft,
  borderRadius: 14,
  paddingVertical: 12,
  alignItems: 'center' as const,
};
const actionPrimary = { backgroundColor: colors.blue };
const actionText = { color: colors.blue, fontWeight: '800' as const };
const basket = { marginTop: 8, paddingHorizontal: 16 };
const basketTitle = { color: colors.text, fontSize: 18, fontWeight: '800' as const };
const basketHint = { marginTop: 6, marginBottom: 8, color: colors.muted, fontSize: 13, lineHeight: 19 };
const basketRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  backgroundColor: colors.surface,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  marginBottom: 8,
};
const basketName = { color: colors.text, fontWeight: '700' as const };
const basketMove = { marginTop: 3, fontSize: 12, fontWeight: '700' as const };
const basketWeight = { color: colors.text, fontWeight: '800' as const };
const basketExposure = { marginTop: 3, color: colors.muted, fontSize: 12 };
