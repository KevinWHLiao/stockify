import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { replay, summarize, toView } from '../lib/portfolio';
import { isMarketOpen, todayTaipei } from '../lib/time';
import { fetchQuotes, liveQuotesAvailable } from '../services/quotes';
import { useStore } from '../store/useStore';

let refreshFn: (() => Promise<void>) | null = null;

export function refreshQuotes() {
  return refreshFn ? refreshFn() : Promise.resolve();
}

export function useQuoteSync() {
  const transactions = useStore((state) => state.transactions);
  const settings = useStore((state) => state.settings);
  const hydrated = useStore((state) => state.hydrated);
  const setSyncing = useStore((state) => state.setSyncing);
  const setQuotes = useStore((state) => state.setQuotes);
  const setQuoteError = useStore((state) => state.setQuoteError);
  const recordSnapshot = useStore((state) => state.recordSnapshot);

  const key = useMemo(() => {
    return replay(transactions, settings)
      .filter((position) => position.shares > 0)
      .map((position) => `${position.market}:${position.symbol}:${position.assetType}`)
      .join('|');
  }, [transactions, settings]);

  const refresh = useCallback(async () => {
    if (!liveQuotesAvailable()) {
      setSyncing(false);
      return;
    }
    const state = useStore.getState();
    const positions = replay(state.transactions, state.settings).filter((position) => position.shares > 0);
    if (positions.length === 0) {
      setSyncing(false);
      setQuoteError(null);
      return;
    }
    setSyncing(true);
    try {
      const requests = positions.map((position) => ({ symbol: position.symbol, market: position.market }));
      const quotes = await fetchQuotes(requests, (partial) => {
        if (partial.length > 0) setQuotes(partial);
      });
      if (quotes.length === 0) throw new Error('empty');
      setQuotes(quotes);
      setQuoteError(quotes.length < positions.length ? '部分股票暫時沒有報價' : null);
      const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
      const all = replay(state.transactions, state.settings);
      const views = positions.map((position) => toView(position, quoteMap.get(position.symbol), state.settings));
      const summary = summarize(views, all);
      recordSnapshot({
        date: todayTaipei(),
        updatedAt: new Date().toISOString(),
        totalDailyPnl: summary.dailyPnl,
        totalMarketValue: summary.marketValue,
        totalPnl: summary.unrealized,
        dividendIncome: summary.dividendIncome,
        items: views
          .filter((view) => view.price != null)
          .map((view) => ({
            symbol: view.symbol,
            name: view.name,
            shares: view.shares,
            price: view.price ?? 0,
            change: view.change ?? 0,
            dailyPnl: view.dailyPnl ?? 0,
            pnl: view.pnl ?? 0,
            marketValue: view.marketValue ?? 0,
          })),
      });
    } catch {
      setQuoteError('暫時連不到交易所，先顯示最後一次報價');
    } finally {
      setSyncing(false);
    }
  }, [recordSnapshot, setQuoteError, setQuotes, setSyncing]);

  useEffect(() => {
    refreshFn = refresh;
    return () => {
      if (refreshFn === refresh) refreshFn = null;
    };
  }, [refresh]);

  useEffect(() => {
    if (!hydrated) return undefined;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    const tick = async () => {
      if (running) return;
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
  }, [hydrated, key, refresh]);
}
