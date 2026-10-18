import { useMemo } from 'react';
import { replay, summarize, toView } from '../lib/portfolio';
import { useStore } from '../store/useStore';

export function usePortfolio() {
  const transactions = useStore((state) => state.transactions);
  const settings = useStore((state) => state.settings);
  const quotes = useStore((state) => state.quotes);

  return useMemo(() => {
    const positions = replay(transactions, settings);
    const order = new Map<string, number>();
    transactions.forEach((tx, index) => {
      if (!order.has(tx.symbol)) order.set(tx.symbol, index);
    });
    const views = positions
      .filter((position) => position.shares > 1e-6)
      .map((position) => toView(position, quotes[position.symbol], settings))
      .sort((a, b) => (order.get(a.symbol) ?? 0) - (order.get(b.symbol) ?? 0));
    return { positions, views, summary: summarize(views, positions) };
  }, [transactions, settings, quotes]);
}
