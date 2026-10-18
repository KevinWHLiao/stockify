import type { PositionView } from '../types';
import { isTaiwanSymbol, type EtfConstituent } from './etfHoldings';
import { formatInt } from './format';
import type { Summary } from './portfolio';

export interface AnalysisNote {
  title: string;
  body: string;
}

export interface Exposure {
  symbol: string;
  name: string;
  weight: number;
  via: string[];
}

export function analyzeHoldings(views: PositionView[], summary: Summary): AnalysisNote[] {
  const priced = views.filter((view) => view.marketValue != null && view.marketValue > 0);
  if (priced.length === 0 || summary.marketValue <= 0) {
    return [{ title: '還沒有可分析的市值', body: '等報價更新後，這裡會依持股比重、損益和股息整理觀察。' }];
  }

  const notes: AnalysisNote[] = [];
  const ranked = [...priced].sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));
  const top = ranked[0];
  const topPct = ((top.marketValue ?? 0) / summary.marketValue) * 100;
  notes.push({
    title: `${top.name} 佔市值 ${topPct.toFixed(1)}%`,
    body: topPct >= 40 ? '單一標的比重偏高，它一波動，整體損益就會跟著大幅變動。' : '這是目前最大的部位。',
  });

  if (priced.length <= 2) {
    notes.push({ title: '持股檔數少', body: `目前只有 ${priced.length} 檔有市值，漲跌會比較集中。` });
  }

  const byDay = [...priced].sort((a, b) => (a.dailyPnl ?? 0) - (b.dailyPnl ?? 0));
  const drag = byDay[0];
  const lift = byDay[byDay.length - 1];
  if ((drag.dailyPnl ?? 0) < 0) {
    notes.push({ title: `今天拖累最多的是 ${drag.name}`, body: `約 ${formatInt(drag.dailyPnl ?? 0)} 元。` });
  }
  if (lift.symbol !== drag.symbol && (lift.dailyPnl ?? 0) > 0) {
    notes.push({ title: `今天貢獻最多的是 ${lift.name}`, body: `約 +${formatInt(lift.dailyPnl ?? 0)} 元。` });
  }

  const underwater = priced.filter((view) => (view.pnl ?? 0) < 0);
  if (underwater.length > 0) {
    const names = underwater
      .slice(0, 4)
      .map((view) => view.name)
      .join('、');
    notes.push({
      title: `${underwater.length} 檔仍低於成本`,
      body: `${names}${underwater.length > 4 ? ' 等' : ''}。這是帳上數字，還沒賣出。`,
    });
  } else {
    notes.push({ title: '有報價的持股目前都在成本之上', body: '未實現損益還沒賣出，還不是入袋的獲利。' });
  }

  if (summary.dividendIncome > 0) {
    const yieldPct = (summary.dividendIncome / summary.marketValue) * 100;
    notes.push({
      title: `已入帳股息約當市值 ${yieldPct.toFixed(1)}%`,
      body: '這是你記過的現金股息，不是預估的未來配息率。',
    });
  }

  const etfs = priced.filter((view) => view.assetType === 'etf');
  if (etfs.length > 0) {
    notes.push({
      title: `${etfs.length} 檔是 ETF`,
      body: '若多檔 ETF 都含同一家公司，實際曝險會比檔數看起來更高。下方會把讀得到的成分股換算進來。',
    });
  }
  return notes;
}

export function lookThrough(views: PositionView[], baskets: Record<string, EtfConstituent[]>, marketValue: number): Exposure[] {
  if (marketValue <= 0) return [];
  const bucket = new Map<string, Exposure>();
  const add = (symbol: string, name: string, value: number, via: string | null) => {
    const current = bucket.get(symbol) ?? { symbol, name, weight: 0, via: [] };
    current.weight += (value / marketValue) * 100;
    if (via && !current.via.includes(via)) current.via.push(via);
    if (name) current.name = name;
    bucket.set(symbol, current);
  };

  for (const view of views) {
    const value = view.marketValue ?? 0;
    if (value <= 0) continue;
    const basket = view.assetType === 'etf' ? baskets[view.symbol] : undefined;
    const stocks = basket?.filter((item) => isTaiwanSymbol(item.symbol)) ?? [];
    if (stocks.length > 0) {
      for (const item of stocks) add(item.symbol, item.name, value * (item.weight / 100), view.symbol);
      continue;
    }
    add(view.symbol, view.name, value, null);
  }

  return [...bucket.values()].sort((a, b) => b.weight - a.weight).slice(0, 8);
}
