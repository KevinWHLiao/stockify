import { Platform } from 'react-native';
import { findSymbol, inferAssetType, searchListedNames, SYMBOLS } from '../data/symbols';
import { parseTpexSuggestions, parseTwseSuggestions, rankSymbols } from '../lib/symbolSearch';
import { quoteFromMis, type MisRow } from '../lib/misQuote';
import { cnyesId, quoteFromCnyes } from '../lib/cnyesQuote';
import { quoteFromYahoo, type YahooMeta } from '../lib/yahooQuote';
import type { Market, Quote, SymbolInfo } from '../types';

function localProxyHost() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function liveQuotesAvailable() {
  return true;
}

export function browserQuotesOnly() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && !localProxyHost();
}

function apiOrigin() {
  if (localProxyHost()) return `http://${window.location.hostname}:8787`;
  return '';
}

function misUrl(exCh: string) {
  const query = `ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0&_=${Date.now()}`;
  const origin = apiOrigin();
  if (origin) return `${origin}/mis?${query}`;
  return `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?${query}`;
}

function searchUrl(query: string) {
  const encoded = `query=${encodeURIComponent(query)}`;
  const origin = apiOrigin();
  if (origin) return `${origin}/search?${encoded}`;
  return `https://www.twse.com.tw/rwd/zh/api/codeQuery?${encoded}`;
}

function tpexSearchUrl(query: string) {
  const encoded = `query=${encodeURIComponent(query)}`;
  const origin = apiOrigin();
  if (origin) return `${origin}/search-otc?${encoded}`;
  return `https://www.tpex.org.tw/www/zh-tw/api/codeQuery?${encoded}`;
}

const BROWSER = {
  Accept: 'application/json',
  'Cache-Control': 'no-cache',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
};

async function getJson(url: string, extraHeaders: Record<string, string> = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { ...BROWSER, ...extraHeaders },
    });
    if (!response.ok) throw new Error(`報價服務回應 ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRow(row: MisRow): Quote | null {
  const quote = quoteFromMis(row);
  if (!quote) return null;
  return { ...quote, name: row.n?.trim() || findSymbol(quote.symbol)?.name || quote.symbol };
}

async function fetchBatch(items: { symbol: string; market: Market }[]) {
  if (items.length === 0) return { quotes: [] as Quote[], seen: new Set<string>() };
  const exCh = items.map((item) => `${item.market}_${item.symbol}.tw`).join('|');
  const data = await getJson(misUrl(exCh), { Referer: 'https://mis.twse.com.tw/stock/index.jsp' });
  const rows = Array.isArray(data?.msgArray) ? (data.msgArray as MisRow[]) : [];
  const seen = new Set(rows.map((row) => String(row.c ?? '').trim()).filter(Boolean));
  const quotes = rows.map(parseRow).filter((quote): quote is Quote => quote != null);
  return { quotes, seen };
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

async function fetchBatchRetry(items: { symbol: string; market: Market }[]) {
  let last = { quotes: [] as Quote[], seen: new Set<string>() };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      last = await fetchBatch(items);
      if (last.quotes.length > 0 || last.seen.size > 0) return last;
    } catch {
      last = { quotes: [] as Quote[], seen: new Set<string>() };
    }
    if (attempt === 0) await delay(600);
  }
  return last;
}

async function fetchYahooQuote(item: { symbol: string; market: Market }): Promise<Quote | null> {
  if (!/^\d{4,6}$/.test(item.symbol)) return null;
  const suffixes = item.market === 'otc' ? ['TWO', 'TW'] : ['TW', 'TWO'];
  for (const suffix of suffixes) {
    try {
      const data = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${item.symbol}.${suffix}?interval=1m&range=1d&_=${Date.now()}`);
      const quote = quoteFromYahoo(item.symbol, item.market, data?.chart?.result?.[0]?.meta as YahooMeta | undefined);
      if (!quote) continue;
      return { ...quote, name: findSymbol(item.symbol)?.name || quote.name };
    } catch {
      // 這個後綴沒有報價時改試另一個市場。
    }
  }
  return null;
}

async function fetchWave(items: { symbol: string; market: Market }[]) {
  const batches = await Promise.all(chunk(items, 20).map((group) => fetchBatchRetry(group)));
  const quotes: Quote[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    quotes.push(...batch.quotes);
    for (const symbol of batch.seen) seen.add(symbol);
  }
  return { quotes, seen };
}

function mergeQuotes(current: Quote[], extra: Quote[]) {
  const next = new Map(current.map((quote) => [quote.symbol, quote]));
  for (const quote of extra) next.set(quote.symbol, quote);
  return [...next.values()];
}

async function getPublicJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`報價服務回應 ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHostedQuotes(items: { symbol: string; market: Market }[], onUpdate?: (quotes: Quote[]) => void) {
  const wanted = items.flatMap((item) => {
    const id = cnyesId(item.symbol);
    return id ? [{ ...item, id }] : [];
  });
  if (wanted.length === 0) return [];
  const quotes: Quote[] = [];
  for (const group of chunk(wanted, 20)) {
    try {
      const data = await getPublicJson(`https://ws.api.cnyes.com/ws/api/v1/quote/quotes/${group.map((item) => item.id).join(',')}`);
      const rows = Array.isArray(data?.data) ? (data.data as Record<string, unknown>[]) : [];
      const byCode = new Map(rows.map((row) => [String(row['200010'] ?? ''), row]));
      for (const item of group) {
        const row = item.symbol === 't00' ? rows.find((entry) => entry['200010'] === 'TWII') : byCode.get(item.symbol);
        const quote = quoteFromCnyes(item.symbol, item.market, row);
        if (!quote) continue;
        quotes.push({ ...quote, name: findSymbol(item.symbol)?.name || quote.name });
      }
    } catch {
      // 這一批失敗時繼續下一批，已拿到的報價仍會顯示。
    }
  }
  if (quotes.length > 0) onUpdate?.(quotes);
  return quotes;
}

export async function fetchQuotes(
  requests: { symbol: string; market: Market }[],
  onUpdate?: (quotes: Quote[]) => void,
) {
  const unique = new Map<string, { symbol: string; market: Market }>();
  for (const request of requests) unique.set(request.symbol, request);
  const items = [...unique.values()];
  if (browserQuotesOnly()) return fetchHostedQuotes(items, onUpdate);
  const first = await fetchWave(items);
  let quotes = first.quotes;
  if (quotes.length > 0) onUpdate?.(quotes);
  const missing = items
    .filter((item) => !first.seen.has(item.symbol))
    .map((item) => ({ ...item, market: item.market === 'tse' ? 'otc' : 'tse' }) as { symbol: string; market: Market });
  if (missing.length > 0) {
    const second = await fetchWave(missing);
    quotes = mergeQuotes(quotes, second.quotes);
    if (quotes.length > 0) onUpdate?.(quotes);
  }
  const found = new Set(quotes.map((quote) => quote.symbol));
  const unresolved = items.filter((item) => !found.has(item.symbol));
  if (unresolved.length > 0) {
    const extra = (await Promise.all(unresolved.map((item) => fetchYahooQuote(item)))).filter((quote): quote is Quote => quote != null);
    quotes = mergeQuotes(quotes, extra);
    if (extra.length > 0) onUpdate?.(quotes);
  }
  return quotes;
}

const NICKNAMES: Record<string, string> = {
  正二: '006208',
  正2: '006208',
};

async function searchRemote(url: string, parse: (data: unknown) => SymbolInfo[]) {
  try {
    return parse(await getPublicJson(url)).map((item) => findSymbol(item.symbol) ?? item);
  } catch {
    return [];
  }
}

export async function searchSymbols(query: string): Promise<SymbolInfo[]> {
  const text = query.trim();
  const nickname = findSymbol(NICKNAMES[text.replace(/\s/g, '')] ?? '');
  const local = SYMBOLS.filter((item) => {
    if (!text) return true;
    return item.symbol.includes(text) || item.name.toLowerCase().includes(text.toLowerCase());
  });
  const listed = text ? searchListedNames(text) : [];
  const remote = text
    ? (await Promise.all([searchRemote(searchUrl(text), parseTwseSuggestions), searchRemote(tpexSearchUrl(text), parseTpexSuggestions)])).flat()
    : [];
  const merged = new Map<string, SymbolInfo>();
  if (nickname) merged.set(nickname.symbol, nickname);
  for (const item of [...local, ...listed, ...remote]) {
    if (!merged.has(item.symbol)) merged.set(item.symbol, item);
  }
  if (/^\d{4,6}$/.test(text) && !merged.has(text)) {
    merged.set(text, {
      symbol: text,
      name: '自訂代碼',
      market: 'tse',
      assetType: inferAssetType(text, ''),
    });
  }
  const items = [...merged.values()];
  return (text ? rankSymbols(items, text) : items).slice(0, 40);
}
