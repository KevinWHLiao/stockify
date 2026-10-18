import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { T } from '../../components/Text';
import { usePortfolio } from '../../hooks/usePortfolio';
import { formatInt, formatMove, formatPrice } from '../../lib/format';
import { formatDateLabel, todayTaipei } from '../../lib/time';
import { useStore } from '../../store/useStore';
import { colors, pnlColor } from '../../theme';

export default function DayScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const snapshot = useStore((state) => (date ? state.snapshots[date] : undefined));
  const allTransactions = useStore((state) => state.transactions);
  const transactions = useMemo(
    () => allTransactions.filter((tx) => tx.date === date),
    [allTransactions, date],
  );
  const { summary, views } = usePortfolio();
  const live = date === todayTaipei();
  const items = live
    ? views
        .filter((view) => view.price != null)
        .map((view) => ({
          symbol: view.symbol,
          name: view.name,
          shares: view.shares,
          price: view.price ?? 0,
          change: view.change ?? 0,
          dailyPnl: view.dailyPnl ?? 0,
          pnl: view.pnl ?? 0,
          marketValue: view.marketValue ?? 0,
          changePercent: view.changePercent ?? 0,
        }))
    : (snapshot?.items ?? []).map((item) => ({ ...item, changePercent: item.price - item.change > 0 ? (item.change / (item.price - item.change)) * 100 : 0 }));
  const totalDaily = live ? summary.dailyPnl : (snapshot?.totalDailyPnl ?? 0);
  const totalValue = live ? summary.marketValue : (snapshot?.totalMarketValue ?? 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScreenHeader title="單日損益" />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <T style={{ color: colors.muted }}>{formatDateLabel(date)}</T>
          <T style={[hero, { color: items.length ? pnlColor(totalDaily) : colors.flat }]}>{items.length ? formatInt(totalDaily) : '—'}</T>
          <T style={{ color: colors.muted }}>{items.length ? `收盤市值 ${formatInt(totalValue)}` : '這天沒有行情快照'}</T>
        </View>
        <T style={section}>持股當日損益</T>
        {items.length === 0 ? <T style={empty}>連線更新後才會留下當天股價。手動紀錄仍會列在下面。</T> : null}
        {items.map((item) => (
          <View key={item.symbol} style={row}>
            <View style={{ flex: 1 }}>
              <T style={name}>{item.name}</T>
              <T style={sub}>
                {formatPrice(item.price)} {formatMove(item.change, item.changePercent)}・{formatInt(item.shares)}股
              </T>
            </View>
            <T style={[pnl, { color: pnlColor(item.dailyPnl) }]}>{formatInt(item.dailyPnl)}</T>
          </View>
        ))}
        <T style={section}>當天手動紀錄</T>
        {transactions.length === 0 ? <T style={empty}>這天沒有買進、賣出、股息或配股。</T> : null}
        {transactions.map((tx) => (
          <View key={tx.id} style={row}>
            <View>
              <T style={name}>
                {tx.symbol} {tx.name}
              </T>
              <T style={sub}>
                {tx.type === 'cash_dividend'
                  ? `股息 ${formatInt(tx.amount)}`
                  : tx.type === 'stock_dividend'
                    ? `配股 ${formatInt(tx.shares)} 股`
                    : `${tx.type === 'buy' ? '買進' : '賣出'} ${formatInt(tx.shares)} 股・${formatPrice(tx.price)}`}
              </T>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const hero = { fontSize: 40, fontWeight: '800' as const, marginVertical: 6 };
const section = { marginTop: 22, marginHorizontal: 20, marginBottom: 8, fontSize: 16, fontWeight: '800' as const };
const empty = { marginHorizontal: 20, color: colors.muted, lineHeight: 20 };
const row = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  gap: 12,
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.line,
};
const name = { fontWeight: '700' as const, color: colors.text };
const sub = { marginTop: 3, color: colors.muted, fontSize: 13 };
const pnl = { fontSize: 16, fontWeight: '800' as const };
