import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../components/Text';
import { formatDateLabel } from '../../lib/time';
import { cashEffect } from '../../lib/portfolio';
import { formatAvg, formatInt, formatPrice } from '../../lib/format';
import { useStore } from '../../store/useStore';
import type { Transaction, TxType } from '../../types';
import { colors, pnlColor } from '../../theme';

const FILTERS: { id: 'all' | TxType; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'buy', label: '買進' },
  { id: 'sell', label: '賣出' },
  { id: 'cash_dividend', label: '股息' },
  { id: 'stock_dividend', label: '配股' },
];

const TYPE_LABEL: Record<TxType, string> = {
  buy: '買進',
  sell: '賣出',
  cash_dividend: '股息',
  stock_dividend: '配股',
};

export default function RecordsScreen() {
  const transactions = useStore((state) => state.transactions);
  const snapshots = useStore((state) => state.snapshots);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [mode, setMode] = useState<'ledger' | 'daily'>('ledger');

  const sections = useMemo(() => {
    const filtered = transactions.filter((tx) => filter === 'all' || tx.type === filter);
    const sorted = [...filtered].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    const groups = new Map<string, Transaction[]>();
    for (const tx of sorted) {
      const list = groups.get(tx.date) ?? [];
      list.push(tx);
      groups.set(tx.date, list);
    }
    return [...groups.entries()].map(([date, data]) => ({ title: date, data }));
  }, [transactions, filter]);

  const days = useMemo(
    () => Object.values(snapshots).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [snapshots],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={header}>
        <T style={title}>記錄</T>
        <T style={subtitle}>交易、股息與每日損益都按日期排列</T>
      </View>
      <View style={modeRow}>
        <ModeButton label="交易紀錄" active={mode === 'ledger'} onPress={() => setMode('ledger')} />
        <ModeButton label="每日損益" active={mode === 'daily'} onPress={() => setMode('daily')} />
      </View>

      {mode === 'ledger' ? (
        <>
          <View style={filters}>
            {FILTERS.map((item) => (
              <Pressable key={item.id} onPress={() => setFilter(item.id)} style={[chip, filter === item.id && chipOn]}>
                <T style={[chipText, filter === item.id && chipTextOn]}>{item.label}</T>
              </Pressable>
            ))}
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={empty}>
                <T style={emptyTitle}>這段還沒有紀錄</T>
                <T style={emptyBody}>用下方加號補記買進、賣出、股息或配股。</T>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View style={dateHead}>
                <T style={dateText}>{formatDateLabel(section.title)}</T>
              </View>
            )}
            renderItem={({ item }) => <RecordRow item={item} />}
          />
        </>
      ) : (
        <SectionList
          sections={[{ title: 'days', data: days }]}
          keyExtractor={(item) => item.date}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={empty}>
              <T style={emptyTitle}>還沒有每日損益</T>
              <T style={emptyBody}>連線更新後，會從今天開始留下每天的持股損益。</T>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={dayRow} onPress={() => router.push({ pathname: '/day/[date]', params: { date: item.date } })}>
              <View>
                <T style={dayDate}>{formatDateLabel(item.date)}</T>
                <T style={dayMeta}>市值 {formatInt(item.totalMarketValue)}</T>
              </View>
              <T style={[dayPnl, { color: pnlColor(item.totalDailyPnl) }]}>{formatInt(item.totalDailyPnl)}</T>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[modeButton, active && modeButtonOn]}>
      <T style={[modeText, active && modeTextOn]}>{label}</T>
    </Pressable>
  );
}

function RecordRow({ item }: { item: Transaction }) {
  const cash = cashEffect(item);
  const detail =
    item.type === 'stock_dividend'
      ? `配股 ${formatInt(item.shares)} 股`
      : item.type === 'cash_dividend'
        ? `股息 ${formatInt(item.amount)}${item.price > 0 ? `・每股 ${formatAvg(item.price)}` : ''}`
        : `${TYPE_LABEL[item.type]} ${formatInt(item.shares)} 股・${formatPrice(item.price)}`;
  return (
    <Pressable style={record} onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}>
      <View style={{ flex: 1 }}>
        <T style={recordName}>
          {item.symbol} {item.name}
        </T>
        <T style={recordDetail}>{detail}</T>
      </View>
      <View style={badgeWrap}>
        <T style={badge}>{TYPE_LABEL[item.type]}</T>
        {item.type === 'stock_dividend' ? (
          <T style={recordCash}>+{formatInt(item.shares)}股</T>
        ) : (
          <T style={[recordCash, { color: item.type === 'cash_dividend' ? colors.up : colors.text }]}>
            {cash > 0 ? '+' : ''}
            {formatInt(cash)}
          </T>
        )}
      </View>
    </Pressable>
  );
}

const header = { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 };
const title = { fontSize: 28, fontWeight: '800' as const, color: colors.text };
const subtitle = { marginTop: 4, color: colors.muted, fontSize: 13 };
const modeRow = { flexDirection: 'row' as const, marginHorizontal: 16, backgroundColor: colors.chip, borderRadius: 12, padding: 4 };
const modeButton = { flex: 1, alignItems: 'center' as const, paddingVertical: 8, borderRadius: 10 };
const modeButtonOn = { backgroundColor: colors.surface };
const modeText = { color: colors.muted, fontWeight: '600' as const };
const modeTextOn = { color: colors.text };
const filters = { flexDirection: 'row' as const, gap: 8, paddingHorizontal: 16, paddingVertical: 12 };
const chip = { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.chip };
const chipOn = { backgroundColor: colors.blueSoft };
const chipText = { color: colors.subtle, fontSize: 13 };
const chipTextOn = { color: colors.blue, fontWeight: '700' as const };
const dateHead = { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 };
const dateText = { color: colors.subtle, fontWeight: '700' as const, fontSize: 13 };
const record = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  marginHorizontal: 16,
  marginBottom: 8,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 16,
  backgroundColor: colors.surface,
  gap: 12,
};
const recordName = { fontSize: 16, fontWeight: '700' as const, color: colors.text };
const recordDetail = { marginTop: 3, color: colors.muted, fontSize: 13 };
const badgeWrap = { alignItems: 'flex-end' as const, gap: 4 };
const badge = { fontSize: 12, color: colors.blue, backgroundColor: colors.blueSoft, overflow: 'hidden' as const, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 };
const recordCash = { fontSize: 15, fontWeight: '700' as const };
const empty = { padding: 40, alignItems: 'center' as const, gap: 8 };
const emptyTitle = { fontSize: 18, fontWeight: '700' as const };
const emptyBody = { color: colors.muted, textAlign: 'center' as const, lineHeight: 20 };
const dayRow = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  marginHorizontal: 16,
  marginBottom: 8,
  paddingHorizontal: 16,
  paddingVertical: 16,
  borderRadius: 16,
  backgroundColor: colors.surface,
};
const dayDate = { fontSize: 16, fontWeight: '700' as const, color: colors.text };
const dayMeta = { marginTop: 4, color: colors.muted, fontSize: 13 };
const dayPnl = { fontSize: 18, fontWeight: '800' as const };
