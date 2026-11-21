import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

function openQuote(symbol: string) {
  router.push({ pathname: '/quote/[symbol]', params: { symbol } });
}

function TileCanvas({
  tiles,
  height,
  onTile,
}: {
  tiles: SectorTile[];
  height: number;
  onTile?: (symbol: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const boxes = width > 0 ? layoutTreemap(tiles.map((tile) => tile.weight), width, height) : [];
  return (
    <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {boxes.map((box, index) => {
        const tile = tiles[index];
        if (!tile || box.width < 8 || box.height < 8) return null;
        const gap = 3;
        const showName = box.height >= 28 && box.width >= 48;
        const showPercent = box.height >= 22 && box.width >= 40;
        return (
          <Pressable
            key={tile.symbol}
            accessibilityRole="button"
            accessibilityLabel={`${tile.name} ${tile.changePercent == null ? '尚無漲跌' : formatPct(tile.changePercent)}`}
            disabled={!onTile}
            onPress={() => onTile?.(tile.symbol)}
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
            {showName ? (
              <T style={{ color: colors.text, fontWeight: '800', fontSize: box.width > 140 ? 16 : 13 }} numberOfLines={1}>
                {tile.name}
              </T>
            ) : null}
            {showPercent ? (
              <T
                style={{ color: tile.changePercent == null ? colors.subtle : pnlColor(tile.changePercent), fontSize: 13, fontWeight: '700', marginTop: 2 }}
                numberOfLines={1}
              >
                {tile.changePercent == null ? '—' : formatPct(tile.changePercent)}
              </T>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectorMap({ tiles }: { tiles: SectorTile[] }) {
  const [zoom, setZoom] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const zoomHeight = Math.max(420, Math.min(640, Math.round(windowHeight * 0.48)));
  const ranked = [...tiles].sort((a, b) => b.weight - a.weight);

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="放大類股圖" onPress={() => setZoom(true)} style={{ marginHorizontal: 16 }}>
        <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
          <TileCanvas tiles={tiles} height={340} />
        </View>
      </Pressable>
      <T style={hint}>點圖放大。比例很小的類股，放大後的名單才看得到名稱。</T>
      <Modal visible={zoom} animationType="slide" onRequestClose={() => setZoom(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
          <View style={zoomHead}>
            <View style={{ flex: 1 }}>
              <T style={zoomTitle}>類股表現</T>
              <T style={zoomMeta}>大致比例，紅漲綠跌。點名稱可看該指數。</T>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="關閉放大" onPress={() => setZoom(false)} style={closeButton}>
              <T style={closeText}>關閉</T>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            <View style={{ marginHorizontal: 16 }}>
              <TileCanvas
                tiles={tiles}
                height={zoomHeight}
                onTile={(symbol) => {
                  setZoom(false);
                  openQuote(symbol);
                }}
              />
            </View>
            <T style={listTitle}>全部類股</T>
            {ranked.map((tile) => (
              <Pressable
                key={tile.symbol}
                accessibilityRole="button"
                accessibilityLabel={`${tile.name} ${tile.changePercent == null ? '尚無漲跌' : formatPct(tile.changePercent)}`}
                onPress={() => {
                  setZoom(false);
                  openQuote(tile.symbol);
                }}
                style={row}
              >
                <View style={[swatch, { backgroundColor: tileColor(tile.changePercent) }]} />
                <T style={rowName}>{tile.name}</T>
                <T style={[rowPct, { color: tile.changePercent == null ? colors.subtle : pnlColor(tile.changePercent) }]}>
                  {tile.changePercent == null ? '—' : formatPct(tile.changePercent)}
                </T>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const hint = { marginHorizontal: 16, marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 };
const zoomHead = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 };
const zoomTitle = { fontSize: 22, fontWeight: '800' as const, color: colors.text };
const zoomMeta = { marginTop: 4, color: colors.muted, fontSize: 13 };
const closeButton = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.chip };
const closeText = { color: colors.text, fontWeight: '700' as const };
const listTitle = { marginHorizontal: 16, marginTop: 16, marginBottom: 8, color: colors.subtle, fontWeight: '700' as const };
const row = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  marginHorizontal: 16,
  marginBottom: 8,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 14,
  backgroundColor: colors.surface,
  gap: 10,
};
const swatch = { width: 14, height: 14, borderRadius: 4 };
const rowName = { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' as const };
const rowPct = { fontSize: 16, fontWeight: '800' as const };
