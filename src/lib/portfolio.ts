import type { Position, PositionView, Quote, Settings, Transaction } from '../types';
import { estimatedSellCost } from './fees';

const EPS = 1e-6;

function round6(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

export function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

function blank(tx: Transaction): Position {
  return {
    symbol: tx.symbol,
    name: tx.name,
    market: tx.market,
    assetType: tx.assetType,
    shares: 0,
    totalCost: 0,
    buyNotional: 0,
    buyShares: 0,
    dividendIncome: 0,
    realized: 0,
  };
}

export function replay(transactions: Transaction[], settings: Settings): Position[] {
  const map = new Map<string, Position>();

  for (const tx of sortTransactions(transactions)) {
    const position = map.get(tx.symbol) ?? blank(tx);
    position.name = tx.name || position.name;
    position.market = tx.market;
    position.assetType = tx.assetType;

    if (tx.type === 'buy') {
      if (!(tx.shares > 0) || !(tx.price >= 0)) throw new Error('買進需要股數與價格');
      const gross = tx.shares * tx.price;
      position.shares = round6(position.shares + tx.shares);
      position.totalCost += gross + tx.fee;
      position.buyNotional += gross;
      position.buyShares = round6(position.buyShares + tx.shares);
    } else if (tx.type === 'sell') {
      if (!(tx.shares > 0)) throw new Error('賣出股數需大於 0');
      if (tx.shares > position.shares + EPS) {
        throw new Error(`${tx.symbol} ${tx.name}在 ${tx.date} 的可賣股數不足`);
      }
      const gross = tx.shares * tx.price;
      const avgCost = position.shares > 0 ? position.totalCost / position.shares : 0;
      const avgBuy = position.buyShares > 0 ? position.buyNotional / position.buyShares : 0;
      const ratio = position.shares > 0 ? tx.shares / position.shares : 0;
      const buySharesOut = position.buyShares * ratio;
      position.realized += gross - tx.fee - tx.tax - avgCost * tx.shares;
      position.totalCost = Math.max(0, position.totalCost - avgCost * tx.shares);
      position.buyNotional = Math.max(0, position.buyNotional - avgBuy * buySharesOut);
      position.buyShares = round6(position.buyShares - buySharesOut);
      position.shares = round6(position.shares - tx.shares);
      if (position.shares <= EPS) {
        position.shares = 0;
        position.totalCost = 0;
        position.buyShares = 0;
        position.buyNotional = 0;
      }
    } else if (tx.type === 'cash_dividend') {
      if (position.shares <= EPS) {
        throw new Error(`${tx.symbol} ${tx.name}在 ${tx.date} 還沒有持股，無法記股息`);
      }
      if (!(tx.amount > 0)) throw new Error('股息金額需大於 0');
      position.dividendIncome += tx.amount;
      if (settings.dividendReducesCost) {
        position.totalCost = Math.max(0, position.totalCost - tx.amount);
      }
    } else {
      if (position.shares <= EPS) {
        throw new Error(`${tx.symbol} ${tx.name}在 ${tx.date} 還沒有持股，無法記配股`);
      }
      if (!(tx.shares > 0)) throw new Error('配股股數需大於 0');
      position.shares = round6(position.shares + tx.shares);
    }

    map.set(tx.symbol, position);
  }

  return [...map.values()].filter(
    (position) => position.shares > EPS || position.dividendIncome > 0 || Math.abs(position.realized) > 0.001,
  );
}

export function ledgerError(transactions: Transaction[], settings: Settings) {
  try {
    replay(transactions, settings);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : '無法計算庫存';
  }
}

export function toView(position: Position, quote: Quote | undefined, settings: Settings): PositionView {
  const costAvg = position.shares > EPS ? position.totalCost / position.shares : null;
  const buyAvg = position.buyShares > EPS ? position.buyNotional / position.buyShares : null;
  const empty: PositionView = {
    ...position,
    name: quote?.name || position.name,
    price: null,
    previousClose: null,
    change: null,
    changePercent: null,
    quoteTime: null,
    quoteDate: null,
    marketValue: null,
    costAvg,
    buyAvg,
    sellCost: null,
    pnl: null,
    pnlPct: null,
    dailyPnl: null,
  };
  if (!quote || !(quote.price > 0) || position.shares <= EPS) return empty;

  const marketValue = position.shares * quote.price;
  const sellCost = estimatedSellCost(marketValue, position.assetType, settings);
  const pnl = marketValue - position.totalCost - sellCost;
  const base = buyAvg != null ? buyAvg * position.shares : position.totalCost;
  return {
    ...empty,
    price: quote.price,
    previousClose: quote.previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    quoteTime: quote.time,
    quoteDate: quote.date,
    marketValue,
    sellCost,
    pnl,
    pnlPct: base > EPS ? (pnl / base) * 100 : null,
    dailyPnl: quote.change * position.shares,
  };
}

export interface Summary {
  marketValue: number;
  dailyPnl: number;
  unrealized: number;
  unrealizedPct: number;
  cost: number;
  dividendIncome: number;
  realized: number;
  total: number;
  totalPct: number;
  priced: number;
  held: number;
}

export function summarize(views: PositionView[], positions: Position[]): Summary {
  const priced = views.filter((view) => view.pnl != null);
  const marketValue = priced.reduce((sum, view) => sum + (view.marketValue ?? 0), 0);
  const dailyPnl = priced.reduce((sum, view) => sum + (view.dailyPnl ?? 0), 0);
  const unrealized = priced.reduce((sum, view) => sum + (view.pnl ?? 0), 0);
  const buyBase = priced.reduce((sum, view) => sum + (view.buyAvg ?? 0) * view.shares, 0);
  const cost = views.reduce((sum, view) => sum + view.totalCost, 0);
  const dividendIncome = positions.reduce((sum, position) => sum + position.dividendIncome, 0);
  const realized = positions.reduce((sum, position) => sum + position.realized, 0);
  const total = unrealized + realized + dividendIncome;
  return {
    marketValue,
    dailyPnl,
    unrealized,
    unrealizedPct: buyBase > EPS ? (unrealized / buyBase) * 100 : 0,
    cost,
    dividendIncome,
    realized,
    total,
    totalPct: buyBase > EPS ? (total / buyBase) * 100 : 0,
    priced: priced.length,
    held: views.length,
  };
}

export function cashEffect(tx: Transaction) {
  if (tx.type === 'buy') return -(tx.shares * tx.price + tx.fee);
  if (tx.type === 'sell') return tx.shares * tx.price - tx.fee - tx.tax;
  if (tx.type === 'cash_dividend') return tx.amount;
  return 0;
}
