import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { T } from '../../components/Text';
import { usePortfolio } from '../../hooks/usePortfolio';
import { breakEvenPrice } from '../../lib/fees';
import { formatAvg, formatInt, formatMove, formatPct, formatPrice } from '../../lib/format';
import { portfolioWeight } from '../../lib/holdings';
import { useStore } from '../../store/useStore';
import { colors, pnlColor } from '../../theme';
import type { TxType } from '../../types';

const ACTIONS: { type: TxType; label: string }[] = [
  { type: 'buy', label: '買進' },
  { type: 'sell', label: '賣出' },
  { type: 'cash_dividend', label: '股息' },
  { type: 'stock_dividend', label: '配股' },
];

export default function StockScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const code = Array.isArray(symbol) ? symbol[0] : symbol;
  const { views, positions, summary } = usePortfolio();
  const settings = useStore((state) => state.settings);
  const transactions = useStore((state) => state.transactions);
  const view = views.find((item) => item.symbol === code);
  const position = positions.find((item) => item.symbol === code);
  const history = transactions.filter((tx) => tx.symbol === code).sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!view && !position) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="持股" />
        <T style={{ padding: 24, color: colors.muted }}>找不到這檔股票。</T>
      </SafeAreaView>
    );
  }

  const name = view?.name ?? position?.name ?? code;
  const shares = view?.shares ?? position?.shares ?? 0;
  const totalCost = view?.totalCost ?? position?.totalCost ?? 0;
  const assetType = view?.assetType ?? position?.assetType ?? 'stock';
  const even = breakEvenPrice(shares, totalCost, assetType, settings);
  const weight = portfolioWeight(view?.marketValue ?? null, summary.marketValue);
  const openAdd = (type: TxType) => router.push({ pathname: '/add', params: { type, symbol: code } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScreenHeader title={name} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <T style={{ color: colors.muted }}>{code}</T>
          <T style={[big, { color: pnlColor(view?.change) }]}>{view?.price == null ? '—' : formatPrice(view.price)}</T>
          <T style={{ color: pnlColor(view?.change), fontWeight: '700' }}>
            {view?.change == null || view.changePercent == null ? '尚無報價' : formatMove(view.change, view.changePercent)}
          </T>
        </View>
        <View style={grid}>
          <Stat label="持股" value={`${formatInt(shares)} 股`} />
          <Stat label="佔組合" value={weight == null ? '—' : `${weight.toFixed(1)}%`} />
          <Stat label="市值" value={view?.marketValue == null ? '—' : formatInt(view.marketValue)} />
          <Stat label="損益兩平價" value={even == null ? '—' : formatPrice(even)} />
          <Stat label="成本均價" value={formatAvg(view?.costAvg ?? null)} />
          <Stat label="買進均價" value={formatAvg(view?.buyAvg ?? null)} />
          <Stat label="持股成本" value={formatInt(view?.totalCost ?? position?.totalCost ?? 0)} />
          <Stat label="預估賣出費用" value={view?.sellCost == null ? '—' : formatInt(view.sellCost)} />
          <Stat label="未實現損益" value={view?.pnl == null ? '—' : formatInt(view.pnl)} color={pnlColor(view?.pnl)} />
          <Stat label="報酬率" value={view?.pnlPct == null ? '—' : formatPct(view.pnlPct)} color={pnlColor(view?.pnl)} />
          <Stat label="今日損益" value={view?.dailyPnl == null ? '—' : formatInt(view.dailyPnl)} color={pnlColor(view?.dailyPnl)} />
          <Stat label="累計股息" value={formatInt(position?.dividendIncome ?? 0)} />
          <Stat label="已實現損益" value={formatInt(position?.realized ?? 0)} color={pnlColor(position?.realized)} />
        </View>
        <View style={actions}>
          {ACTIONS.map((action) => (
            <Pressable key={action.type} style={actionButton} onPress={() => openAdd(action.type)}>
              <T style={actionText}>{action.label}</T>
            </Pressable>
          ))}
        </View>
        <T style={section}>相關紀錄</T>
        {history.length === 0 ? <T style={empty}>還沒有紀錄</T> : null}
        {history.map((tx) => (
          <Pressable key={tx.id} style={row} onPress={() => router.push({ pathname: '/add', params: { id: tx.id } })}>
            <View>
              <T style={rowTitle}>
                {tx.date}・{labelOf(tx.type)}
              </T>
              <T style={rowSub}>{describe(tx)}</T>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function labelOf(type: TxType) {
  if (type === 'buy') return '買進';
  if (type === 'sell') return '賣出';
  if (type === 'cash_dividend') return '股息';
  return '配股';
}

function describe(tx: { type: TxType; shares: number; price: number; amount: number; fee: number; tax: number }) {
  if (tx.type === 'cash_dividend') return `金額 ${formatInt(tx.amount)}`;
  if (tx.type === 'stock_dividend') return `${formatInt(tx.shares)} 股`;
  return `${formatInt(tx.shares)} 股・${formatPrice(tx.price)}・手續費 ${formatInt(tx.fee)}${tx.tax ? `・稅 ${formatInt(tx.tax)}` : ''}`;
}

function Stat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={cell}>
      <T style={cellLabel}>{label}</T>
      <T style={[cellValue, { color }]}>{value}</T>
    </View>
  );
}

const big = { fontSize: 40, fontWeight: '800' as const, marginTop: 4 };
const grid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, paddingHorizontal: 12, marginTop: 16 };
const cell = { width: '50%' as const, paddingHorizontal: 8, paddingVertical: 8 };
const cellLabel = { color: colors.muted, fontSize: 12 };
const cellValue = { marginTop: 4, fontSize: 16, fontWeight: '700' as const };
const actions = { flexDirection: 'row' as const, gap: 8, paddingHorizontal: 16, marginTop: 8 };
const actionButton = { flex: 1, backgroundColor: colors.blueSoft, borderRadius: 12, paddingVertical: 10, alignItems: 'center' as const };
const actionText = { color: colors.blue, fontWeight: '800' as const };
const section = { marginTop: 20, marginHorizontal: 20, fontSize: 16, fontWeight: '800' as const };
const empty = { margin: 20, color: colors.muted };
const row = { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line };
const rowTitle = { fontWeight: '700' as const, color: colors.text };
const rowSub = { marginTop: 3, color: colors.muted };
