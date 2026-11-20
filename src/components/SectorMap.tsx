import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatPct } from '../lib/format';
import { layoutTreemap } from '../lib/treemap';
import { colors, pnlColor } from '../theme';
import { T } from './Text';

export interface SectorTile {
  symbol: string;
  name: string;
  weight: number;
  changePercent: number | null;
}

function mix(from: string, to: string, amount: number) {
  const channel = (hex: string, index: number) => parseInt(hex.slice(index, index + 2), 16);
  const value = (index: number) => Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * amount);
  return `#${[1, 3, 5].map((index) => value(index).toString(16).padStart(2, '0')).join('')}`;
}

function tileColor(percent: number | null) {
  if (percent == null || Math.abs(percent) <= 0.05) return '#1B1E26';
  const depth = Math.min(Math.abs(percent) / 10, 1);
  if (percent > 0) return mix('241418', '4A222B', 0.25 + depth * 0.75);
  return mix('10201C', '163E32', 0.25 + depth * 0.75);
}

export function SectorMap({ tiles }: { tiles: SectorTile[] }) {
  const [width, setWidth] = useState(0);
  const height = 340;
  const boxes = width > 0 ? layoutTreemap(tiles.map((tile) => tile.weight), width, height) : [];

  return (
    <View style={{ marginHorizontal: 16, height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {boxes.map((box, index) => {
        const tile = tiles[index];
        if (!tile || box.width < 8 || box.height < 8) return null;
        const gap = 3;
        return (
          <Pressable
            key={tile.symbol}
            accessibilityRole="button"
            accessibilityLabel={`${tile.name} ${tile.changePercent == null ? '尚無漲跌' : formatPct(tile.changePercent)}`}
            onPress={() => router.push({ pathname: '/quote/[symbol]', params: { symbol: tile.symbol } })}
            style={{
              position: 'absolute',
              left: box.x + gap / 2,
              top: box.y + gap / 2,
              width: box.width - gap,
              height: box.height - gap,
              backgroundColor: tileColor(tile.changePercent),
              borderRadius: 8,
              borderWidth: 1,
              borderColor: tile.changePercent == null ? colors.line : pnlColor(tile.changePercent),
              padding: 6,
              justifyContent: 'center',
            }}
          >
            {box.height >= 28 && box.width >= 42 ? (
              <T style={{ color: colors.text, fontWeight: '800', fontSize: box.width > 120 ? 15 : 11 }} numberOfLines={1}>
                {tile.name}
              </T>
            ) : null}
            {box.height >= 22 && box.width >= 36 ? (
              <T style={{ color: tile.changePercent == null ? colors.subtle : pnlColor(tile.changePercent), fontSize: 12, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                {tile.changePercent == null ? '—' : formatPct(tile.changePercent)}
              </T>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
