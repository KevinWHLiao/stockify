/** 證交所 2026 年沒有交易的平日，加上 10/23 薔琵颱風休市。開始交易日不算在內。 */
const SCHEDULED = [
  '2026-01-01',
  '2026-02-12',
  '2026-02-13',
  '2026-02-15',
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-02-19',
  '2026-02-20',
  '2026-02-27',
  '2026-02-28',
  '2026-04-03',
  '2026-04-04',
  '2026-04-05',
  '2026-04-06',
  '2026-05-01',
  '2026-06-19',
  '2026-09-25',
  '2026-09-28',
  '2026-10-09',
  '2026-10-10',
  '2026-10-23',
  '2026-10-25',
  '2026-10-26',
  '2026-12-25',
];

const scheduled = new Set(SCHEDULED);
const extra = new Set<string>();

export function isClosureDate(iso: string) {
  return scheduled.has(iso) || extra.has(iso);
}

export function rememberClosures(dates: string[]) {
  for (const date of dates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) extra.add(date);
  }
}

export function closureDatesFromSchedule(data: unknown) {
  const rows = Array.isArray((data as { data?: unknown })?.data) ? ((data as { data: unknown[] }).data) : [];
  const dates: string[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const date = String(row[0] ?? '');
    const text = `${row[1] ?? ''}${row[2] ?? ''}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (text.includes('開始交易') || text.includes('最後交易')) continue;
    if (text.includes('放假') || text.includes('無交易') || text.includes('休市') || text.includes('補假')) dates.push(date);
  }
  return dates;
}
