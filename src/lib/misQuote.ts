import type { Market, Quote } from '../types';

export interface MisRow {
  c?: string;
  n?: string;
  z?: string;
  y?: string;
  pz?: string;
  o?: string;
  h?: string;
  l?: string;
  v?: string;
  t?: string;
  d?: string;
  ex?: string;
}

function priceOf(value: string | undefined) {
  const text = value?.trim() ?? '';
  if (!text || text === '-' || text === '—') return null;
  const price = Number(text);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function volumeOf(value: string | undefined) {
  const text = value?.trim() ?? '';
  if (!text || text === '-' || text === '—') return null;
  const volume = Number(text);
  return Number.isFinite(volume) && volume >= 0 ? volume : null;
}

export function quoteFromMis(row: MisRow): Quote | null {
  const symbol = row.c?.trim();
  if (!symbol) return null;
  const price = priceOf(row.z) ?? priceOf(row.pz);
  const previousClose = priceOf(row.y);
  if (price == null || previousClose == null) return null;
  const change = price - previousClose;
  const market: Market = row.ex === 'otc' ? 'otc' : 'tse';
  return {
    symbol,
    name: row.n?.trim() || symbol,
    price,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    open: priceOf(row.o),
    high: priceOf(row.h),
    low: priceOf(row.l),
    volume: volumeOf(row.v),
    time: row.t ?? '',
    date: row.d ?? '',
    market,
  };
}
