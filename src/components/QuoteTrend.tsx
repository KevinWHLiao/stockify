import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { DailyBar } from '../lib/priceHistory';
import { fetchDailyBars, fetchIntradayCloses } from '../services/priceHistory';
import { colors } from '../theme';
import { T } from './Text';
import { TrendChart } from './TrendChart';

export function QuoteTrend({ symbol }: { symbol: string }) {
  const [mode, setMode] = useState<'today' | 'daily'>('today');
  const [points, setPoints] = useState<number[]>([]);
  const [bars, setBars] = useState<DailyBar[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'empty'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    void Promise.all([fetchIntradayCloses(symbol), fetchDailyBars(symbol)]).then(([intraday, daily]) => {
      if (cancelled) return;
      setPoints(intraday);
      setBars(daily);
      const hasToday = intraday.length > 1;
      const hasDaily = daily.length > 1;
      setMode(hasToday ? 'today' : 'daily');
      setState(hasToday || hasDaily ? 'ready' : 'empty');
    });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Chip label="今日走勢" active={mode === 'today'} onPress={() => setMode('today')} />
        {bars.length > 1 ? <Chip label="日K" active={mode === 'daily'} onPress={() => setMode('daily')} /> : null}
      </View>
      {state === 'loading' ? <T style={note}>讀取走勢…</T> : null}
      {state === 'empty' ? <T style={note}>這段走勢暫時讀不到。</T> : null}
      {state === 'ready' && mode === 'today' && points.length > 1 ? <TrendChart points={points} /> : null}
      {state === 'ready' && mode === 'daily' ? <TrendChart bars={bars} /> : null}
      {state === 'ready' ? (
        <T style={note}>{mode === 'today' ? '盤中每五分鐘的價格。' : '最近約三個月的收盤。個股日K有開高低收，加權日K只有收盤價。'}</T>
      ) : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? colors.blueSoft : colors.chip }}>
      <T style={{ color: active ? colors.blue : colors.subtle, fontWeight: '700', fontSize: 13 }}>{label}</T>
    </Pressable>
  );
}

const note = { marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 };
