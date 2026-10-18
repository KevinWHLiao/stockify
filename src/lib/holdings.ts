import type { HoldingSort, PositionView } from '../types';

export function sortHoldings(views: PositionView[], sort: HoldingSort) {
  if (sort === 'book') return views;
  const valueOf = (view: PositionView) => {
    if (sort === 'value') return view.marketValue;
    if (sort === 'daily') return view.dailyPnl;
    return view.pnlPct;
  };
  return [...views].sort((left, right) => {
    const a = valueOf(left);
    const b = valueOf(right);
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return b - a;
  });
}

export function portfolioWeight(marketValue: number | null, total: number) {
  if (marketValue == null || !(total > 0)) return null;
  return (marketValue / total) * 100;
}
