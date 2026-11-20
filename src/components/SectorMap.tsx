import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatPct } from '../lib/format';
import { layoutTreemap } from '../lib/treemap';
import { colors } from '../theme';
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
  if (percent == null) return colors.chip;
  const depth = Math.min(Math.abs(percent) / 8, 1);
  if (percent > 0.05) return mix('3A151C', 'FF4D5E', 0.3 + depth * 0.7);
  if (percent < -0.05) return mix('12352C', '2FBF86', 0.25 + depth * 0.75);
  return colors.chip;
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
              padding: 8,
              justifyContent: 'center',
            }}
          >
            {box.height >= 44 && box.width >= 52 ? (
              <T style={{ color: colors.text, fontWeight: '800', fontSize: box.width > 120 ? 16 : 12 }} numberOfLines={1}>
                {tile.name}
              </T>
            ) : null}
            {box.height >= 32 && box.width >= 44 ? (
              <T style={{ color: colors.text, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {tile.changePercent == null ? '—' : formatPct(tile.changePercent)}
              </T>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
