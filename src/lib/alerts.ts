export interface AlertQuote {
  symbol: string;
  name: string;
  change: number;
  changePercent: number;
}

export interface AlertHit {
  key: string;
  title: string;
  body: string;
}

export function priceAlertHits(quotes: AlertQuote[], threshold: number, today: string, already: string[]): AlertHit[] {
  if (!(threshold > 0)) return [];
  const seen = new Set(already);
  const hits: AlertHit[] = [];
  for (const quote of quotes) {
    if (!Number.isFinite(quote.changePercent) || Math.abs(quote.changePercent) < threshold) continue;
    const side = quote.changePercent > 0 ? 'up' : 'down';
    const key = `${today}:${quote.symbol}:${side}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const verb = side === 'up' ? '上漲' : '下跌';
    const move = `${quote.change > 0 ? '+' : ''}${quote.change.toFixed(2)}`;
    hits.push({
      key,
      title: `${quote.name} ${verb} ${Math.abs(quote.changePercent).toFixed(2)}%`,
      body: `${quote.symbol} 今日 ${move}`,
    });
  }
  return hits;
}
