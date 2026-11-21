import { ScrollView, View } from 'react-native';
import { formatSignedInt, maskMoney } from '../lib/format';
import type { MonthPnl } from '../lib/monthlyPnl';
import { colors, pnlColor } from '../theme';
import { T } from './Text';

export function MonthTrend({ months, hidden }: { months: MonthPnl[]; hidden: boolean }) {
  if (months.length === 0) return null;
  const max = Math.max(...months.map((month) => Math.abs(month.total)), 1);
  const span = months.length === 1 ? months[0].label : `${months[0].label} – ${months[months.length - 1].label}`;
  return (
    <View style={card}>
      <T style={title}>損益月走勢</T>
      <T style={hint}>
        {span}，把每個交易日的當日損益加總。還沒更新過的月份不會出現。這是你自己的帳，不是投資建議。
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={plot}>
          {months.map((month) => (
            <View key={month.month} style={column}>
              <T style={[amount, { color: hidden ? colors.muted : pnlColor(month.total) }]} numberOfLines={1}>
                {maskMoney(hidden, formatSignedInt(month.total))}
              </T>
              <View
                style={{
                  width: 28,
                  height: hidden ? 10 : Math.max(10, (Math.abs(month.total) / max) * 88),
                  borderRadius: 6,
                  marginTop: 6,
                  backgroundColor: hidden ? colors.line : pnlColor(month.total),
                }}
              />
              <T style={monthLabel}>{month.label}</T>
              <T style={dayCount}>{month.days} 日</T>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const card = {
  marginHorizontal: 16,
  marginTop: 12,
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 12,
  borderRadius: 16,
  backgroundColor: colors.surface,
};
const title = { fontSize: 16, fontWeight: '800' as const, color: colors.text };
const hint = { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 18 };
const plot = { flexDirection: 'row' as const, alignItems: 'flex-end' as const, height: 168, gap: 10, paddingTop: 12 };
const column = { width: 72, alignItems: 'center' as const, justifyContent: 'flex-end' as const };
const amount = { fontSize: 11, fontWeight: '700' as const };
const monthLabel = { marginTop: 6, fontSize: 12, fontWeight: '700' as const, color: colors.subtle };
const dayCount = { marginTop: 2, fontSize: 11, color: colors.muted };
