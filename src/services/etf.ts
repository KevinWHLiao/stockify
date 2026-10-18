import { Platform } from 'react-native';
import { parseCapitalHoldings, parseMoneyDjHoldings, parseYuantaHoldings, type EtfConstituent } from '../lib/etfHoldings';

const cache = new Map<string, { at: number; rows: EtfConstituent[] }>();
const FRESH_MS = 6 * 60 * 60 * 1000;
let capitalIds: Promise<Map<string, string>> | null = null;

function proxyOrigin() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:8787`;
  }
  return '';
}

function moneyUrl(symbol: string) {
  const origin = proxyOrigin();
  if (origin) return `${origin}/etf?symbol=${encodeURIComponent(symbol)}`;
  return `https://www.moneydj.com/etf/x/basic/Basic0007B.xdjhtm?etfid=${encodeURIComponent(symbol)}.tw`;
}

function yuantaUrl(symbol: string) {
  const origin = proxyOrigin();
  if (origin) return `${origin}/etf?symbol=${encodeURIComponent(symbol)}&source=yuanta`;
  return `https://www.yuantaetfs.com/product/detail/${encodeURIComponent(symbol)}/ratio`;
}

function capitalListUrl() {
  const origin = proxyOrigin();
  if (origin) return `${origin}/capital/list`;
  return 'https://www.capitalfund.com.tw/CFWeb/api/etf/list';
}

function capitalBuybackUrl() {
  const origin = proxyOrigin();
  if (origin) return `${origin}/capital/buyback`;
  return 'https://www.capitalfund.com.tw/CFWeb/api/etf/buyback';
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/json',
        Referer: url.includes('capitalfund') ? 'https://www.capitalfund.com.tw/' : 'https://www.moneydj.com/',
      },
    });
    if (!response.ok) return '';
    return await response.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Referer: 'https://www.capitalfund.com.tw/',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function capitalFundIds() {
  if (!capitalIds) {
    capitalIds = postJson(capitalListUrl(), {}).then((payload) => {
      const funds = (payload as { data?: { funds?: unknown } } | null)?.data?.funds;
      const map = new Map<string, string>();
      if (Array.isArray(funds)) {
        for (const fund of funds) {
          if (!fund || typeof fund !== 'object') continue;
          const item = fund as { stockNo?: unknown; fundNo?: unknown };
          if (typeof item.stockNo !== 'string' || typeof item.fundNo !== 'string') continue;
          map.set(item.stockNo.trim(), item.fundNo.trim());
        }
      }
      if (map.size === 0) capitalIds = null;
      return map;
    });
  }
  return capitalIds;
}

async function fetchCapitalHoldings(symbol: string) {
  const fundId = (await capitalFundIds()).get(symbol);
  if (!fundId) return [];
  const payload = await postJson(capitalBuybackUrl(), { fundId, date: null });
  return parseCapitalHoldings(payload);
}

function fullest(groups: EtfConstituent[][]) {
  return groups.reduce((best, rows) => (rows.length > best.length ? rows : best), [] as EtfConstituent[]);
}

async function loadConstituents(symbol: string) {
  const [listed, yuanta, capital] = await Promise.all([
    fetchText(moneyUrl(symbol)).then((html) => parseMoneyDjHoldings(html)),
    fetchText(yuantaUrl(symbol)).then((html) => parseYuantaHoldings(html)),
    fetchCapitalHoldings(symbol),
  ]);
  // 同一檔可能只有前十大、或槓桿 ETF 幾乎全是期貨。取列數最多的那份。
  return fullest([yuanta, capital, listed]);
}

export async function fetchEtfConstituents(symbol: string): Promise<EtfConstituent[]> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.rows;
  try {
    const rows = await loadConstituents(symbol);
    if (rows.length > 0) cache.set(symbol, { at: Date.now(), rows });
    return rows.length > 0 ? rows : (cached?.rows ?? []);
  } catch {
    return cached?.rows ?? [];
  }
}
