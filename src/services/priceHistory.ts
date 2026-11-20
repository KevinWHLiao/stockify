import { cnyesId } from '../lib/cnyesQuote';
import { latestSessionCloses, parseTwseDailyBars, parseTwseIndexBars, type DailyBar } from '../lib/priceHistory';
import { todayTaipei } from '../lib/time';

async function getJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`走勢回應 ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function monthKeys(count: number) {
  const [year, month] = todayTaipei().split('-').map(Number);
  const keys: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(year, month - 1 - offset, 1);
    keys.push(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}01`);
  }
  return keys;
}

export async function fetchIntradayCloses(symbol: string) {
  const id = cnyesId(symbol);
  if (!id) return [];
  const now = Math.floor(Date.now() / 1000);
  try {
    const data = await getJson(
      `https://ws.api.cnyes.com/ws/api/v1/charting/history?symbol=${encodeURIComponent(id)}&resolution=5&from=${now - 86400 * 4}&to=${now}`,
    );
    const times = Array.isArray(data?.data?.t) ? (data.data.t as number[]) : [];
    const closes = Array.isArray(data?.data?.c) ? (data.data.c as number[]) : [];
    return latestSessionCloses(times, closes);
  } catch {
    return [];
  }
}

export async function fetchDailyBars(symbol: string): Promise<DailyBar[]> {
  const index = symbol === 't00';
  const stock = /^\d{4,6}$/.test(symbol);
  if (!index && !stock) return [];
  const batches = await Promise.all(
    monthKeys(3).map(async (date) => {
      const url = index
        ? `https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?date=${date}&response=json`
        : `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${date}&stockNo=${symbol}&response=json`;
      try {
        const data = await getJson(url);
        return index ? parseTwseIndexBars(data) : parseTwseDailyBars(data);
      } catch {
        return [];
      }
    }),
  );
  const byDate = new Map<string, DailyBar>();
  for (const bar of batches.flat()) byDate.set(bar.date, bar);
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-60);
}
