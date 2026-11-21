export interface MonthPnl {
  month: string;
  label: string;
  total: number;
  days: number;
}

export function monthlyPnl(days: { date: string; totalDailyPnl: number }[]): MonthPnl[] {
  const groups = new Map<string, { total: number; days: number }>();
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) continue;
    const month = day.date.slice(0, 7);
    const current = groups.get(month) ?? { total: 0, days: 0 };
    current.total += day.totalDailyPnl;
    current.days += 1;
    groups.set(month, current);
  }
  const entries = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return entries.map(([month, value], index) => {
    const year = month.slice(0, 4);
    const previousYear = entries[index - 1]?.[0].slice(0, 4);
    const monthNumber = Number(month.slice(5));
    return {
      month,
      label: !previousYear || previousYear !== year ? `${year.slice(2)}/${monthNumber}` : `${monthNumber}月`,
      total: value.total,
      days: value.days,
    };
  });
}
