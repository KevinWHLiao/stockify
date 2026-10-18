import { Platform } from 'react-native';
import { findSymbol, inferAssetType, isListedSymbol, SYMBOLS } from '../data/symbols';
import { quoteFromMis, type MisRow } from '../lib/misQuote';
import type { Market, Quote, SymbolInfo } from '../types';

export function liveQuotesAvailable() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function apiOrigin() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && liveQuotesAvailable()) {
    return `http://${window.location.hostname}:8787`;
  }
  return '';
}

function misUrl(exCh: string) {
  const query = `ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0`;
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

async function getJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`報價服務回應 ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function parseRow(row: MisRow): Quote | null {
  const quote = quoteFromMis(row);
  if (!quote) return null;
  return { ...quote, name: row.n?.trim() || findSymbol(quote.symbol)?.name || quote.symbol };
}

async function fetchBatch(items: { symbol: string; market: Market }[]) {
  if (items.length === 0) return { quotes: [] as Quote[], seen: new Set<string>() };
  const exCh = items.map((item) => `${item.market}_${item.symbol}.tw`).join('|');
  const data = await getJson(misUrl(exCh));
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

async function fetchWave(items: { symbol: string; market: Market }[]) {
  const batches = await Promise.all(
    chunk(items, 20).map(async (group) => {
      try {
        return await fetchBatch(group);
      } catch {
        return { quotes: [] as Quote[], seen: new Set<string>() };
      }
    }),
  );
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

export async function fetchQuotes(
  requests: { symbol: string; market: Market }[],
  onUpdate?: (quotes: Quote[]) => void,
) {
  const unique = new Map<string, { symbol: string; market: Market }>();
  for (const request of requests) unique.set(request.symbol, request);
  const items = [...unique.values()];
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
  return quotes;
}

const NICKNAMES: Record<string, string> = {
  正二: '006208',
  正2: '006208',
};

export async function searchSymbols(query: string): Promise<SymbolInfo[]> {
  const text = query.trim();
  const nickname = findSymbol(NICKNAMES[text.replace(/\s/g, '')] ?? '');
  const local = SYMBOLS.filter((item) => {
    if (!text) return true;
    return item.symbol.includes(text) || item.name.toLowerCase().includes(text.toLowerCase());
  });
  const remote: SymbolInfo[] = [];
  if (text) {
    try {
      const data = await getJson(searchUrl(text));
      const suggestions = Array.isArray(data?.suggestions) ? (data.suggestions as string[]) : [];
      for (const suggestion of suggestions) {
        const [symbol = '', name = ''] = suggestion.split('\t');
        if (!isListedSymbol(symbol, name)) continue;
        const known = findSymbol(symbol);
        remote.push(
          known ?? {
            symbol,
            name,
            market: 'tse',
            assetType: inferAssetType(symbol, name),
          },
        );
      }
    } catch {
      // 離線時仍可用內建清單與手動代號。
    }
  }
  const merged = new Map<string, SymbolInfo>();
  if (nickname) merged.set(nickname.symbol, nickname);
  for (const item of [...local, ...remote]) {
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
  return [...merged.values()].slice(0, 40);
}
