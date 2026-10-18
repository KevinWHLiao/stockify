import { Pressable, View } from 'react-native';
import { formatAvg, formatInt, formatMove, formatPct, formatPrice } from '../lib/format';
import type { PositionView } from '../types';
import { colors, pnlColor } from '../theme';
import { T } from './Text';

export function HoldingRow({ item, weight, onPress }: { item: PositionView; weight?: number | null; onPress: () => void }) {
  const priceColor = pnlColor(item.change);
  const totalColor = pnlColor(item.pnl);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={onPress} style={card}>
      <View style={top}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <T style={name} numberOfLines={1}>
            {item.name}
          </T>
          <T style={meta}>
            {item.symbol} · {formatInt(item.shares)} 股{weight == null ? '' : ` · 佔 ${weight.toFixed(1)}%`}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T style={[price, { color: item.price == null ? colors.flat : colors.text }]}>
            {item.price == null ? '—' : formatPrice(item.price)}
          </T>
          <T style={[move, { color: priceColor }]}>
            {item.change == null || item.changePercent == null ? '尚無報價' : formatMove(item.change, item.changePercent)}
          </T>
        </View>
      </View>
      <View style={stats}>
        <Stat label="成本均" value={formatAvg(item.costAvg)} />
        <Stat label="買均" value={formatAvg(item.buyAvg)} />
        <Stat label="損益" value={item.pnl == null ? '—' : formatInt(item.pnl)} color={totalColor} hint={item.pnlPct == null ? '' : formatPct(item.pnlPct)} />
      </View>
    </Pressable>
  );
}

function Stat({ label, value, color = colors.text, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <View style={stat}>
      <T style={statLabel}>{label}</T>
      <T style={[statValue, { color }]} numberOfLines={1}>
        {value}
      </T>
      {hint ? (
        <T style={[statHint, { color }]} numberOfLines={1}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const card = {
  marginHorizontal: 16,
  marginBottom: 10,
  backgroundColor: colors.surface,
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 14,
};
const top = { flexDirection: 'row' as const, alignItems: 'flex-start' as const };
const name = { fontSize: 17, fontWeight: '800' as const, color: colors.text };
const meta = { marginTop: 3, fontSize: 12, color: colors.muted };
const price = { fontSize: 18, fontWeight: '800' as const };
const move = { marginTop: 3, fontSize: 12, fontWeight: '700' as const };
const stats = {
  flexDirection: 'row' as const,
  marginTop: 14,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: colors.line,
};
const stat = { flex: 1 };
const statLabel = { fontSize: 11, color: colors.muted, letterSpacing: 0.3 };
const statValue = { marginTop: 3, fontSize: 15, fontWeight: '800' as const };
const statHint = { marginTop: 1, fontSize: 12, fontWeight: '700' as const };
