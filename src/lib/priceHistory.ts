export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function amount(value: unknown) {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

export function rocToIso(text: string) {
  const [year, month, day] = text.split('/').map(Number);
  if (!year || !month || !day) return '';
  return `${year + 1911}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseTwseDailyBars(data: unknown): DailyBar[] {
  const rows = (data as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const bars: DailyBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 7) continue;
    const date = rocToIso(String(row[0]));
    const open = amount(row[3]);
    const high = amount(row[4]);
    const low = amount(row[5]);
    const close = amount(row[6]);
    if (!date || open == null || high == null || low == null || close == null || close <= 0) continue;
    bars.push({ date, open, high, low, close });
  }
  return bars;
}

export function parseTwseIndexBars(data: unknown): DailyBar[] {
  const rows = (data as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return [];
  const bars: DailyBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const date = rocToIso(String(row[0]));
    const close = amount(row[4]);
    if (!date || close == null || close <= 0) continue;
    bars.push({ date, open: close, high: close, low: close, close });
  }
  return bars;
}

/** Cnyes 走勢由新到舊，而且可能含前一個交易日。只留下最後一段連續盤。 */
export function latestSessionCloses(times: number[], closes: number[]) {
  const pairs = times
    .map((time, index) => ({ time, close: closes[index] }))
    .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.close) && item.close > 0)
    .sort((a, b) => a.time - b.time);
  let start = 0;
  for (let index = 1; index < pairs.length; index += 1) {
    if (pairs[index].time - pairs[index - 1].time > 6 * 3600) start = index;
  }
  return pairs.slice(start).map((item) => item.close);
}
