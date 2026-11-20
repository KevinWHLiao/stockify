export interface InstitutionalFlow {
  date: string;
  foreign: number;
  trust: number;
  dealer: number;
  total: number;
}

function amount(value: unknown) {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

export function parseInstitutional(data: unknown): InstitutionalFlow | null {
  const rows = (data as { data?: unknown; date?: unknown })?.data;
  if (!Array.isArray(rows)) return null;
  const amounts = new Map<string, number>();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 4) continue;
    const value = amount(row[3]);
    if (value == null) continue;
    amounts.set(String(row[0]), value);
  }
  const foreign = amounts.get('外資及陸資(不含外資自營商)');
  const trust = amounts.get('投信');
  const total = amounts.get('合計');
  if (foreign == null || trust == null || total == null) return null;
  const dealer = (amounts.get('自營商(自行買賣)') ?? 0) + (amounts.get('自營商(避險)') ?? 0);
  return {
    date: typeof (data as { date?: unknown }).date === 'string' ? (data as { date: string }).date : '',
    foreign,
    trust,
    dealer,
    total,
  };
}
