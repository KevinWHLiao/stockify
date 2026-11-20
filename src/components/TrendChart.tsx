import { useState } from 'react';
import { View } from 'react-native';
import type { DailyBar } from '../lib/priceHistory';
import { pnlColor } from '../theme';

function scale(value: number, min: number, max: number) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

export function TrendChart({ points, bars }: { points?: number[]; bars?: DailyBar[] }) {
  const [width, setWidth] = useState(0);
  const candle = bars != null && bars.some((bar) => bar.high !== bar.low);
  const values = candle ? [] : points && points.length > 1 ? points : (bars ?? []).map((bar) => bar.close);
  const height = 168;

  if (candle && bars) {
    const min = Math.min(...bars.map((bar) => bar.low));
    const max = Math.max(...bars.map((bar) => bar.high));
    return (
      <View style={{ height, width: '100%' }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0
          ? bars.map((bar, index) => {
              const tone = pnlColor(bar.close - bar.open);
              const top = (1 - scale(Math.max(bar.open, bar.close), min, max)) * height;
              const bottom = (1 - scale(Math.min(bar.open, bar.close), min, max)) * height;
              const wickTop = (1 - scale(bar.high, min, max)) * height;
              const wickBottom = (1 - scale(bar.low, min, max)) * height;
              const slot = width / bars.length;
              return (
                <View key={bar.date} style={{ position: 'absolute', left: slot * index, width: slot, height }}>
                  <View style={{ position: 'absolute', left: slot / 2, width: 1, top: wickTop, height: Math.max(1, wickBottom - wickTop), backgroundColor: tone }} />
                  <View
                    style={{
                      position: 'absolute',
                      left: Math.max(1, slot * 0.2),
                      width: Math.max(2, slot * 0.6),
                      top,
                      height: Math.max(2, bottom - top),
                      backgroundColor: tone,
                      borderRadius: 1,
                    }}
                  />
                </View>
              );
            })
          : null}
      </View>
    );
  }

  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const tone = pnlColor(values[values.length - 1] - values[0]);
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
      {values.map((value, index) => (
        <View key={`${index}-${value}`} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
          <View style={{ height: `${Math.max(6, scale(value, min, max) * 100)}%`, backgroundColor: tone, opacity: 0.85, borderRadius: 1 }} />
        </View>
      ))}
    </View>
  );
}
