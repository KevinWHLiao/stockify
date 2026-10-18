import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ALL_MARKET_INDICES } from '../data/market';
import { isMarketOpen } from '../lib/time';
import { fetchQuotes, liveQuotesAvailable } from '../services/quotes';
import { useStore } from '../store/useStore';

let refreshFn: (() => Promise<void>) | null = null;

export function refreshMarketQuotes() {
  return refreshFn ? refreshFn() : Promise.resolve();
}

export function useMarketQuotes(active: boolean) {
  const watchlist = useStore((state) => state.watchlist);
  const setMarketQuotes = useStore((state) => state.setMarketQuotes);
  const setMarketError = useStore((state) => state.setMarketError);
  const setMarketSyncing = useStore((state) => state.setMarketSyncing);

  const refresh = useCallback(async () => {
    if (!liveQuotesAvailable()) {
      setMarketSyncing(false);
      setMarketError('這個免費網頁不能直接向交易所更新行情。');
      return;
    }
    const items = [
      ...ALL_MARKET_INDICES.map((item) => ({ symbol: item.symbol, market: item.market })),
      ...useStore.getState().watchlist.map((item) => ({ symbol: item.symbol, market: item.market })),
    ];
    if (items.length === 0) return;
    setMarketSyncing(true);
    try {
      const quotes = await fetchQuotes(items, (partial) => {
        if (partial.length > 0) setMarketQuotes(partial);
      });
      if (quotes.length === 0) throw new Error('empty');
      setMarketQuotes(quotes);
      setMarketError(quotes.length < items.length ? '部分標的暫時沒有報價' : null);
    } catch {
      setMarketError('暫時連不到交易所，先顯示上次行情');
    } finally {
      setMarketSyncing(false);
    }
  }, [setMarketError, setMarketQuotes, setMarketSyncing]);

  useEffect(() => {
    refreshFn = refresh;
    return () => {
      if (refreshFn === refresh) refreshFn = null;
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!active) return undefined;
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let running = false;

      const tick = async () => {
        if (running || stopped) return;
        running = true;
        try {
          await refresh();
        } finally {
          running = false;
        }
        if (stopped) return;
        timer = setTimeout(tick, isMarketOpen() ? 20000 : 180000);
      };

      void tick();
      const subscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') void tick();
      });
      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        subscription.remove();
      };
    }, [active, refresh, watchlist]),
  );
}
