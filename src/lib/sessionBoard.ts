export interface SessionMover {
  symbol: string;
  name: string;
  changePercent: number;
}

export interface SessionStrength {
  date: string;
  indexPercent: number;
  dropped: boolean;
  risers: SessionMover[];
  resilient: SessionMover[];
}

const MIN_VOLUME_SHARES = 500_000;
const DROP_THRESHOLD = -1;

function cells(row: unknown): string[] {
  return Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [];
}

function plainNumber(value: string) {
  const number = Number(value.replace(/<[^>]+>/g, '').replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
}

function direction(flag: string) {
  const plain = flag.replace(/<[^>]+>/g, '');
  if (plain.includes('-') || /green/i.test(flag)) return -1;
  if (plain.includes('+') || /red/i.test(flag)) return 1;
  return 0;
}

function tables(data: unknown) {
  const rows = (data as { tables?: unknown })?.tables;
  return Array.isArray(rows) ? (rows as { title?: unknown; fields?: unknown; data?: unknown }[]) : [];
}

export function parseTwseSession(data: unknown, date: string): Omit<SessionStrength, 'dropped' | 'risers' | 'resilient'> & { stocks: SessionMover[] } | null {
  const indexTable = tables(data).find((table) => cells(table.fields).includes('指數'));
  const indexRow = cells(indexTable?.data && Array.isArray(indexTable.data) ? (indexTable.data as unknown[]).find((row) => cells(row)[0] === '發行量加權股價指數') : undefined);
  const indexPercent = plainNumber(indexRow[4] ?? '');
  const stockTable = tables(data).find((table) => String(table.title ?? '').includes('每日收盤行情'));
  const stockRows = Array.isArray(stockTable?.data) ? stockTable.data : [];
  if (indexPercent == null || stockRows.length === 0) return null;
  const stocks: SessionMover[] = [];
  for (const raw of stockRows) {
    const row = cells(raw);
    const symbol = row[0] ?? '';
    const name = (row[1] ?? '').trim();
    if (!/^\d{4,6}$/.test(symbol)) continue;
    if (/ETF|指數|槓桿|反向/.test(name)) continue;
    const volume = plainNumber(row[2] ?? '');
    const close = plainNumber(row[8] ?? '');
    const gap = plainNumber(row[10] ?? '');
    if (volume == null || volume < MIN_VOLUME_SHARES || close == null || close <= 0 || gap == null) continue;
    const change = direction(row[9] ?? '') * Math.abs(gap);
    const previous = close - change;
    if (!(previous > 0)) continue;
    stocks.push({ symbol, name, changePercent: (change / previous) * 100 });
  }
  return { date, indexPercent, stocks };
}

export function relativeStrength(indexPercent: number, stocks: SessionMover[], date: string): SessionStrength {
  const dropped = indexPercent <= DROP_THRESHOLD;
  if (!dropped) return { date, indexPercent, dropped, risers: [], resilient: [] };
  const risers = stocks
    .filter((item) => item.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 8);
  const resilient = stocks
    .filter((item) => item.changePercent <= 0 && item.changePercent - indexPercent >= 1)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 8);
  return { date, indexPercent, dropped, risers, resilient };
}
