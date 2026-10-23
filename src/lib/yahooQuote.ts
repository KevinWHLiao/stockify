import type { Market, Quote } from '../types';
import { taipeiStamp } from './time';

export interface YahooMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketTime?: number;
  regularMarketVolume?: number;
}

function priceOf(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function quoteFromYahoo(symbol: string, market: Market, meta: YahooMeta | null | undefined): Quote | null {
  const price = priceOf(meta?.regularMarketPrice);
  const previousClose = priceOf(meta?.chartPreviousClose) ?? priceOf(meta?.previousClose);
  if (!symbol || price == null || previousClose == null) return null;
  const change = price - previousClose;
  const stamp = taipeiStamp(new Date((meta?.regularMarketTime ?? Date.now() / 1000) * 1000));
  const volume = meta?.regularMarketVolume;
  return {
    symbol,
    name: symbol,
    price,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    open: null,
    high: null,
    low: null,
    volume: typeof volume === 'number' && Number.isFinite(volume) && volume >= 0 ? volume : null,
    time: stamp.time,
    date: stamp.date,
    market,
  };
}
