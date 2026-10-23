import type { Market, Quote } from '../types';
import { taipeiStamp } from './time';

function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function cnyesId(symbol: string) {
  if (symbol === 't00') return 'TWS:TWII:INDEX';
  if (/^\d{4,6}$/.test(symbol)) return `TWS:${symbol}:STOCK`;
  return null;
}

export function quoteFromCnyes(symbol: string, market: Market, row: Record<string, unknown> | null | undefined): Quote | null {
  const price = num(row?.['6']);
  const previousClose = num(row?.['21']);
  if (!row || price == null || price <= 0 || previousClose == null || previousClose <= 0) return null;
  const change = num(row['11']) ?? price - previousClose;
  const changePercent = num(row['56']) ?? (change / previousClose) * 100;
  const stamp = taipeiStamp(new Date((num(row['200007']) ?? Date.now() / 1000) * 1000));
  const name = typeof row['200009'] === 'string' && row['200009'].trim() ? row['200009'].trim() : symbol;
  return {
    symbol,
    name,
    price,
    previousClose,
    change,
    changePercent,
    open: num(row['19']),
    high: num(row['12']),
    low: num(row['13']),
    volume: null,
    time: stamp.time,
    date: stamp.date,
    market,
  };
}
