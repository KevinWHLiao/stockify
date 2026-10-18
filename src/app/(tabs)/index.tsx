import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HoldingRow } from '../../components/HoldingRow';
import { Logo } from '../../components/Logo';
import { T } from '../../components/Text';
import { isDemoTransaction } from '../../data/seed';
import { backupAgeDays, parseBackup, quotesFromBackup } from '../../lib/backup';
import { usePortfolio } from '../../hooks/usePortfolio';
import { refreshQuotes } from '../../hooks/useQuoteSync';
import { liveQuotesAvailable } from '../../services/quotes';
import { formatInt, formatPct } from '../../lib/format';
import { portfolioWeight, sortHoldings } from '../../lib/holdings';
import type { HoldingSort } from '../../types';
import { formatQuoteStamp, todayTaipei } from '../../lib/time';
import { useStore } from '../../store/useStore';
import { colors, pnlColor } from '../../theme';

export default function HoldingsScreen() {
  const { views, summary } = usePortfolio();
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const transactions = useStore((state) => state.transactions);
  const restoreLedger = useStore((state) => state.restoreLedger);
  const quotes = useStore((state) => state.quotes);
  const syncing = useStore((state) => state.syncing);
  const quoteError = useStore((state) => state.quoteError);
  const [pulling, setPulling] = useState(false);

  const showTotal = settings.pnlMode === 'total';
  const headline = showTotal ? summary.total : summary.unrealized;
  const headlinePct = showTotal ? summary.totalPct : summary.unrealizedPct;
  const hasPrice = summary.priced > 0;
  const latest = Object.values(quotes)[0];
  const showBanner = !settings.hideDemoBanner && transactions.some((tx) => isDemoTransaction(tx.id));
  const backupAge = backupAgeDays(settings.lastBackupAt);
  const showBackupReminder = settings.backupReminder && (backupAge === null || backupAge >= 7);
  const sorted = useMemo(() => sortHoldings(views, settings.holdingSort), [settings.holdingSort, views]);

  const openBackup = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void file.text().then((text) => {
        const parsed = parseBackup(text);
        if ('error' in parsed) {
          window.alert(parsed.error);
          return;
        }
        const problem = restoreLedger(parsed.file);
        if (problem) {
          window.alert(problem);
          return;
        }
        if (liveQuotesAvailable()) {
          void refreshQuotes();
          return;
        }
        const cached = quotesFromBackup(parsed.file);
        if (cached.length > 0) useStore.getState().setQuotes(cached);
        useStore.getState().setQuoteError(null);
      });
    };
    input.click();
  };

  const onRefresh = async () => {
    setPulling(true);
    await refreshQuotes();
    setPulling(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void onRefresh()} tintColor={colors.text} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View style={topBar}>
          <Logo />
          <Pressable accessibilityRole="button" accessibilityLabel="說明與設定" hitSlop={10} onPress={() => router.push('/settings')} style={iconButton}>
            <Ionicons name="options-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {Platform.OS === 'web' ? (
          <View style={banner}>
            <T style={bannerText}>
              {liveQuotesAvailable()
                ? showBanner
                  ? '這是電腦上的持股頁。先在手機按備份、把 JSON 存下來，再選取那個檔，畫面就會換成你的庫存。股價會在這裡重新抓。'
                  : '這是上次在這台瀏覽器打開的備份。手機有較新的檔時，可以再選一次。'
                : '選取手機備份的 JSON，就會顯示當時的持股與股價。這個免費網頁不能直接向交易所更新報價，檔案也不會上傳。'}
            </T>
            <Pressable accessibilityRole="button" onPress={openBackup}>
              <T style={bannerAction}>開啟備份檔</T>
            </Pressable>
          </View>
        ) : null}

        {showBanner ? (
          <View style={banner}>
            <T style={bannerText}>範例持股會依證交所報價重算。可以到右上角清除，再記下你自己的庫存。</T>
            <Pressable accessibilityRole="button" onPress={() => updateSettings({ hideDemoBanner: true })}>
              <T style={bannerAction}>知道了</T>
            </Pressable>
          </View>
        ) : null}

        {showBackupReminder ? (
          <Pressable accessibilityRole="button" style={banner} onPress={() => router.push('/backup')}>
            <T style={bannerText}>已超過一週沒有備份。點這裡把持股存進 Google Drive，之後重裝或換機才不會重填。</T>
          </Pressable>
        ) : null}

        <View style={hero}>
          <Pressable accessibilityRole="button" style={labelRow} onPress={() => updateSettings({ pnlMode: showTotal ? 'unrealized' : 'total' })}>
            <T style={label}>{showTotal ? '總報酬' : '累積損益'}</T>
            <Ionicons name="swap-horizontal" size={15} color="rgba(255,255,255,0.55)" />
          </Pressable>
          {showTotal ? <T style={hint}>含已實現損益與股息</T> : null}
          <View style={heroNumbers}>
            <T style={heroValue} numberOfLines={1} adjustsFontSizeToFit>
              {hasPrice ? formatInt(headline) : '—'}
            </T>
            <View style={[pctPill, { backgroundColor: hasPrice && headline < 0 ? 'rgba(15,159,110,0.18)' : 'rgba(225,29,46,0.18)' }]}>
              <T style={[heroPct, { color: hasPrice ? pnlColor(headline) : '#fff' }]}>{hasPrice ? formatPct(headlinePct) : '—'}</T>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="更新報價" onPress={() => void onRefresh()}>
            <T style={syncText}>
              {syncing && latest
                ? `更新中，先顯示 ${formatQuoteStamp(latest.date, latest.time)}`
                : syncing
                  ? '更新報價中…'
                  : latest
                    ? `報價 ${formatQuoteStamp(latest.date, latest.time)}`
                    : '尚未取得報價'}
            </T>
          </Pressable>
        </View>

        <View style={metrics}>
          <Pressable accessibilityRole="button" accessibilityLabel="持股日損益" style={metric} onPress={() => router.push({ pathname: '/day/[date]', params: { date: todayTaipei() } })}>
            <T style={metricLabel}>今日</T>
            <T style={[metricValue, { color: hasPrice ? pnlColor(summary.dailyPnl) : colors.flat }]}>{hasPrice ? formatInt(summary.dailyPnl) : '—'}</T>
          </Pressable>
          <View style={metric}>
            <T style={metricLabel}>市值</T>
            <T style={metricValue}>{hasPrice ? formatInt(summary.marketValue) : '—'}</T>
          </View>
          <View style={metric}>
            <T style={metricLabel}>股息</T>
            <T style={metricValue}>{formatInt(summary.dividendIncome)}</T>
          </View>
        </View>
        {quoteError ? <T style={errorText}>{quoteError}</T> : null}

        <View style={section}>
          <View style={sectionLead}>
            <T style={sectionTitle}>庫存 {summary.held}</T>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/analysis')}>
              <T style={sectionLink}>分析</T>
            </Pressable>
          </View>
          <T style={sectionTotal}>成本 {formatInt(summary.cost)}</T>
        </View>
        {views.length > 0 ? (
          <View style={sortRow}>
            {(
              [
                ['book', '記帳'],
                ['value', '市值'],
                ['daily', '今日'],
                ['return', '報酬'],
              ] as const
            ).map(([id, label]) => {
              const active = settings.holdingSort === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateSettings({ holdingSort: id satisfies HoldingSort })}
                  style={[sortChip, active && sortChipOn]}
                >
                  <T style={[sortChipText, active && sortChipTextOn]}>{label}</T>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {views.length === 0 ? (
          <View style={empty}>
            <T style={emptyTitle}>還沒有持股</T>
            <T style={emptyBody}>點下方加號，記下買進、股息、配息或配股。</T>
          </View>
        ) : (
          sorted.map((item) => (
            <HoldingRow
              key={item.symbol}
              item={item}
              weight={portfolioWeight(item.marketValue, summary.marketValue)}
              onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: item.symbol } })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const topBar = {
  paddingHorizontal: 20,
  paddingTop: 6,
  paddingBottom: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
};
const iconButton = {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.surface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const banner = { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.banner, borderRadius: 16, padding: 14, gap: 8 };
const bannerText = { color: colors.bannerText, fontSize: 13, lineHeight: 19 };
const bannerAction = { color: colors.blue, fontWeight: '800' as const };
const hero = {
  marginHorizontal: 16,
  backgroundColor: colors.surface,
  borderRadius: 28,
  paddingHorizontal: 20,
  paddingTop: 18,
  paddingBottom: 18,
};
const labelRow = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
const label = { fontSize: 13, color: 'rgba(255,255,255,0.62)', fontWeight: '700' as const };
const hint = { marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.45)' };
const heroNumbers = { flexDirection: 'row' as const, alignItems: 'flex-end' as const, marginTop: 8, gap: 10 };
const heroValue = { flex: 1, fontSize: 40, fontWeight: '800' as const, letterSpacing: -1.2, color: '#FFFFFF' };
const pctPill = { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 };
const heroPct = { fontSize: 14, fontWeight: '800' as const };
const syncText = { marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.45)' };
const metrics = { flexDirection: 'row' as const, gap: 8, paddingHorizontal: 16, marginTop: 12 };
const metric = { flex: 1, backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12 };
const metricLabel = { fontSize: 12, color: colors.muted, marginBottom: 6 };
const metricValue = { fontSize: 16, fontWeight: '800' as const, color: colors.text };
const errorText = { paddingHorizontal: 20, paddingTop: 8, fontSize: 12, color: colors.up };
const section = {
  marginTop: 18,
  marginBottom: 10,
  paddingHorizontal: 20,
  flexDirection: 'row' as const,
  alignItems: 'baseline' as const,
  justifyContent: 'space-between' as const,
};
const sectionLead = { flexDirection: 'row' as const, alignItems: 'baseline' as const, gap: 12 };
const sectionTitle = { fontSize: 18, fontWeight: '800' as const, color: colors.text };
const sectionLink = { fontSize: 15, fontWeight: '800' as const, color: colors.blue };
const sortRow = { flexDirection: 'row' as const, gap: 8, paddingHorizontal: 20, marginBottom: 12 };
const sortChip = { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 };
const sortChipOn = { backgroundColor: colors.blue };
const sortChipText = { color: colors.subtle, fontSize: 13, fontWeight: '700' as const };
const sortChipTextOn = { color: '#FFFFFF' };
const sectionTotal = { fontSize: 13, color: colors.muted, fontWeight: '600' as const };
const empty = { padding: 32, alignItems: 'center' as const, gap: 8 };
const emptyTitle = { fontSize: 18, fontWeight: '800' as const, color: colors.text };
const emptyBody = { fontSize: 14, color: colors.muted, textAlign: 'center' as const };
