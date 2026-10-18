import { Pressable, View } from 'react-native';
import { formatAvg, formatInt, formatMove, formatPct, formatPrice } from '../lib/format';
import type { PositionView } from '../types';
import { colors, pnlColor } from '../theme';
import { T } from './Text';

export function HoldingTable({
  items,
  weights,
  onPress,
}: {
  items: PositionView[];
  weights: Record<string, number | null>;
  onPress: (symbol: string) => void;
}) {
  return (
    <View style={table}>
      <View style={tableHead}>
        {COLUMNS.map((column) => (
          <T key={column.key} style={[headCell, { flex: column.flex }, column.align === 'right' && alignRight]}>
            {column.label}
          </T>
        ))}
      </View>
      {items.map((item) => {
        const weight = weights[item.symbol];
        return (
          <Pressable key={item.symbol} accessibilityRole="button" accessibilityLabel={item.name} onPress={() => onPress(item.symbol)} style={tableRow}>
            <View style={{ flex: 2.2 }}>
              <T style={name} numberOfLines={1}>
                {item.name}
              </T>
              <T style={meta}>{item.symbol}</T>
            </View>
            <T style={[cell, { flex: 1 }]}>{formatInt(item.shares)}</T>
            <T style={[cell, { flex: 0.8 }]}>{weight == null ? '—' : `${weight.toFixed(1)}%`}</T>
            <T style={[cell, { flex: 1, color: item.price == null ? colors.flat : colors.text }]}>{item.price == null ? '—' : formatPrice(item.price)}</T>
            <T style={[cell, { flex: 1.3, color: pnlColor(item.change) }]}>
              {item.change == null || item.changePercent == null ? '尚無報價' : formatMove(item.change, item.changePercent)}
            </T>
            <T style={[cell, { flex: 1.2 }]}>{item.marketValue == null ? '—' : formatInt(item.marketValue)}</T>
            <T style={[cell, { flex: 1.2, color: pnlColor(item.pnl) }]}>{item.pnl == null ? '—' : formatInt(item.pnl)}</T>
            <T style={[cell, { flex: 0.9, color: pnlColor(item.pnlPct) }]}>{item.pnlPct == null ? '—' : formatPct(item.pnlPct)}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const COLUMNS: { key: string; label: string; flex: number; align?: 'right' }[] = [
  { key: 'name', label: '名稱', flex: 2.2 },
  { key: 'shares', label: '股數', flex: 1, align: 'right' },
  { key: 'weight', label: '佔比', flex: 0.8, align: 'right' },
  { key: 'price', label: '現價', flex: 1, align: 'right' },
  { key: 'daily', label: '今日', flex: 1.3, align: 'right' },
  { key: 'value', label: '市值', flex: 1.2, align: 'right' },
  { key: 'pnl', label: '損益', flex: 1.2, align: 'right' },
  { key: 'return', label: '報酬', flex: 0.9, align: 'right' },
];

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

const table = { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' as const };
const tableHead = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.line,
};
const tableRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: colors.line,
};
const headCell = { fontSize: 12, color: colors.muted, fontWeight: '700' as const };
const cell = { fontSize: 14, fontWeight: '700' as const, color: colors.text, textAlign: 'right' as const };
const alignRight = { textAlign: 'right' as const };
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
