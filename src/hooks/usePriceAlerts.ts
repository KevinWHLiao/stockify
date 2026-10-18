import { useEffect } from 'react';
import { Platform } from 'react-native';
import { priceAlertHits } from '../lib/alerts';
import { replay } from '../lib/portfolio';
import { todayTaipei } from '../lib/time';
import { useStore } from '../store/useStore';

const pending = new Set<string>();
let handlerReady = false;

async function deliver(hits: { key: string; title: string; body: string }[]) {
  const Notifications = await import('expo-notifications');
  if (!handlerReady) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerReady = true;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('price-alerts', {
      name: '漲跌提醒',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === 'granted' ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return false;
  for (const hit of hits) {
    await Notifications.scheduleNotificationAsync({
      content: { title: hit.title, body: hit.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: 'price-alerts',
      },
    });
  }
  return true;
}

export function usePriceAlerts() {
  const priceAlert = useStore((state) => state.settings.priceAlert);
  const alertPercent = useStore((state) => state.settings.alertPercent);
  const quotes = useStore((state) => state.quotes);
  const marketQuotes = useStore((state) => state.marketQuotes);
  const watchlist = useStore((state) => state.watchlist);
  const transactions = useStore((state) => state.transactions);
  const settings = useStore((state) => state.settings);

  useEffect(() => {
    if (!priceAlert || Platform.OS === 'web') return undefined;
    const held = replay(transactions, settings)
      .filter((position) => position.shares > 1e-6)
      .map((position) => position.symbol);
    const symbols = new Set([...held, ...watchlist.map((item) => item.symbol)]);
    const pool = [...symbols]
      .map((symbol) => quotes[symbol] ?? marketQuotes[symbol])
      .filter((quote) => quote != null);
    const today = todayTaipei();
    const hits = priceAlertHits(pool, alertPercent, today, useStore.getState().settings.alertedKeys)
      .filter((hit) => !pending.has(hit.key))
      .slice(0, 8);
    if (hits.length === 0) return undefined;
    for (const hit of hits) pending.add(hit.key);
    let cancelled = false;
    void deliver(hits).then((sent) => {
      if (cancelled) return;
      if (!sent) {
        for (const hit of hits) pending.delete(hit.key);
        return;
      }
      const state = useStore.getState();
      const kept = state.settings.alertedKeys.filter((key) => key.startsWith(`${today}:`));
      state.updateSettings({ alertedKeys: [...kept, ...hits.map((hit) => hit.key)] });
    });
    return () => {
      cancelled = true;
    };
  }, [alertPercent, marketQuotes, priceAlert, quotes, settings, transactions, watchlist]);
}
