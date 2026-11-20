import { isTaiwanCode } from '../data/symbols';
import type { Market, Quote } from '../types';
import { taipeiStamp } from './time';

function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const US_INDEX_IDS: Record<string, string> = {
  'us-dji': 'GI:DJI:INDEX',
  'us-spx': 'GI:INX:INDEX',
  'us-ixic': 'GI:IXIC:INDEX',
  'us-sox': 'GI:SOX:INDEX',
};

const SECTOR_IDS: Record<string, string> = {
  t01: 'TWS:TSE15:INDEX',
  t02: 'TWS:TSE16:INDEX',
  t03: 'TWS:TSE17:INDEX',
  t04: 'TWS:TSE18:INDEX',
  t05: 'TWS:TSE19:INDEX',
  t06: 'TWS:TSE20:INDEX',
  t08: 'TWS:TSE22:INDEX',
  t09: 'TWS:TSE23:INDEX',
  t10: 'TWS:TSE24:INDEX',
  t11: 'TWS:TSE25:INDEX',
  t12: 'TWS:TSE26:INDEX',
  t13: 'TWS:TSE27:INDEX',
  t14: 'TWS:TSE28:INDEX',
  t15: 'TWS:TSE29:INDEX',
  t16: 'TWS:TSE30:INDEX',
  t17: 'TWS:TSE31:INDEX',
  t18: 'TWS:TSE32:INDEX',
  t20: 'TWS:TSE33:INDEX',
  t21: 'TWS:TSE04:INDEX',
  t22: 'TWS:TSE05:INDEX',
  t23: 'TWS:TSE35:INDEX',
  t24: 'TWS:TSE36:INDEX',
  t25: 'TWS:TSE37:INDEX',
  t26: 'TWS:TSE38:INDEX',
  t27: 'TWS:TSE39:INDEX',
  t28: 'TWS:TSE40:INDEX',
  t29: 'TWS:TSE41:INDEX',
  t30: 'TWS:TSE42:INDEX',
  t31: 'TWS:TSE43:INDEX',
  IX0009: 'TWS:TSE34:INDEX',
};

export function cnyesId(symbol: string) {
  if (symbol === 't00') return 'TWS:TWII:INDEX';
  if (symbol === 'txf') return 'TWF:TXF:FUTURES';
  if (SECTOR_IDS[symbol]) return SECTOR_IDS[symbol];
  if (US_INDEX_IDS[symbol]) return US_INDEX_IDS[symbol];
  if (isTaiwanCode(symbol)) return `TWS:${symbol.toUpperCase()}:STOCK`;
  if (/^[A-Z]{1,5}$/.test(symbol)) return `USS:${symbol}:STOCK`;
  return null;
}

export function cnyesRowCode(symbol: string) {
  if (symbol === 't00') return 'TWII';
  const id = cnyesId(symbol);
  if (!id) return symbol;
  return id.split(':')[1] || symbol;
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
