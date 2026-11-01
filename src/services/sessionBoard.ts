import { parseTwseSession, relativeStrength, type SessionStrength } from '../lib/sessionBoard';
import { isWeekendDate, shiftDate, todayTaipei } from '../lib/time';

async function getJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`收盤表回應 ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLatestSession(now = new Date()): Promise<SessionStrength | null> {
  let date = todayTaipei(now);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!isWeekendDate(date)) {
      try {
        const data = await getJson(
          `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${date.replace(/-/g, '')}&type=ALLBUT0999&response=json`,
        );
        const parsed = parseTwseSession(data, date);
        if (parsed && parsed.stocks.length > 0) return relativeStrength(parsed.indexPercent, parsed.stocks, parsed.date);
      } catch {
        // 假日或尚未收盤時改看前一個日期。
      }
    }
    date = shiftDate(date, -1);
  }
  return null;
}
