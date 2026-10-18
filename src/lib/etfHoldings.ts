export interface EtfConstituent {
  symbol: string;
  name: string;
  weight: number;
}

interface WeightRow {
  code?: unknown;
  name?: unknown;
  weights?: unknown;
  ym?: unknown;
}

function weightOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const weight = Number(value.replace(/,/g, ''));
    if (Number.isFinite(weight)) return weight;
  }
  return null;
}

function asRows(value: unknown): EtfConstituent[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const rows: EtfConstituent[] = [];
  for (const item of value as WeightRow[]) {
    if (!item || typeof item !== 'object') return [];
    const weight = weightOf(item.weights);
    if (typeof item.code !== 'string' || typeof item.name !== 'string' || weight == null) continue;
    // ym 有值時多半是歷史月份，不是目前持股。期貨月份改由另一份持股表讀取。
    if (item.ym) continue;
    rows.push({ symbol: item.code.trim(), name: item.name.trim(), weight });
  }
  if (rows.length < 1) return [];
  return rows.sort((a, b) => b.weight - a.weight);
}

function findWeights(value: unknown): EtfConstituent[] {
  let best: EtfConstituent[] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || depth > 8) return;
    if (Array.isArray(node)) {
      const rows = asRows(node);
      if (rows.length > best.length) best = rows;
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node === 'object') {
      for (const item of Object.values(node)) walk(item, depth + 1);
    }
  };
  walk(value, 0);
  return best;
}

function parseVisibleRows(html: string): EtfConstituent[] {
  const codes = [...html.matchAll(/商品代碼<\/span>\s*<span[^>]*>([^<]+)<\/span>/g)].map((match) => match[1].trim());
  const names = [...html.matchAll(/商品名稱<\/span>\s*<span[^>]*>([^<]+)<\/span>/g)].map((match) => match[1].trim());
  const weights = [...html.matchAll(/商品權重<\/span>\s*<span[^>]*>([^<]+)<\/span>/g)].map((match) => Number(match[1]));
  const rows: EtfConstituent[] = [];
  for (let index = 0; index < codes.length; index += 1) {
    const weight = weights[index];
    if (!codes[index] || !names[index] || !Number.isFinite(weight)) continue;
    rows.push({ symbol: codes[index], name: names[index], weight });
  }
  return rows.sort((a, b) => b.weight - a.weight);
}

export function parseYuantaHoldings(html: string): EtfConstituent[] {
  const start = html.indexOf('window.__NUXT__=');
  const end = start >= 0 ? html.indexOf('</script>', start) : -1;
  if (start >= 0 && end > start) {
    try {
      const script = html.slice(start, end);
      const run = new Function('window', `${script}; return window.__NUXT__;`) as (holder: object) => unknown;
      const rows = findWeights(run({}));
      if (rows.length > 0) return rows;
    } catch {
      // 發行公司頁面格式變了時，改讀畫面上已列出的列。
    }
  }
  return parseVisibleRows(html);
}

export function parseMoneyDjHoldings(html: string): EtfConstituent[] {
  const start = html.search(/id="ctl00_ctl00_MainContent_MainContent_stable3"/);
  if (start < 0) return [];
  const end = html.indexOf('</table>', start);
  const table = html.slice(start, end > start ? end : undefined);
  const rows: EtfConstituent[] = [];
  const pattern =
    /<td class="col05">\s*(?:<a\b[^>]*>)?([^<]+?)(?:<\/a>)?\s*<\/td>\s*<td class="col06">\s*([^<]+?)\s*<\/td>/g;
  for (const match of table.matchAll(pattern)) {
    const label = match[1].replace(/\s+/g, ' ').trim();
    const weight = weightOf(match[2]);
    if (!label || weight == null) continue;
    const coded = label.match(/^(.*)\(([^)]+)\)$/);
    const name = (coded?.[1] || label).trim();
    const raw = (coded?.[2] || name).replace(/\.TW$/i, '').replace(/\.TF$/i, '').trim();
    const month = name.match(/(\d{6})\s*$/)?.[1];
    let symbol = month && !isTaiwanSymbol(raw) ? `${raw}-${month}` : raw;
    if (rows.some((row) => row.symbol === symbol)) symbol = `${symbol}-${rows.length + 1}`;
    rows.push({ symbol, name, weight });
  }
  return rows.sort((a, b) => b.weight - a.weight);
}

export function parseCapitalHoldings(payload: unknown): EtfConstituent[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return [];
  const source = data as { stocks?: unknown; futures?: unknown };
  const rows: EtfConstituent[] = [];
  if (Array.isArray(source.stocks)) {
    for (const item of source.stocks) {
      if (!item || typeof item !== 'object') continue;
      const stock = item as { stocNo?: unknown; stocName?: unknown; weightRound?: unknown };
      const weight = weightOf(stock.weightRound);
      if (typeof stock.stocNo !== 'string' || typeof stock.stocName !== 'string' || weight == null) continue;
      rows.push({ symbol: stock.stocNo.trim(), name: stock.stocName.trim(), weight });
    }
  }
  if (Array.isArray(source.futures)) {
    for (const item of source.futures) {
      if (!item || typeof item !== 'object') continue;
      const future = item as { txDesc?: unknown; txEname?: unknown; weightRound?: unknown };
      const weight = weightOf(future.weightRound);
      const name = typeof future.txDesc === 'string' ? future.txDesc.trim() : '';
      const symbol = typeof future.txEname === 'string' && future.txEname.trim() ? future.txEname.trim() : name;
      if (!name || !symbol || weight == null) continue;
      rows.push({ symbol, name, weight });
    }
  }
  return rows.sort((a, b) => b.weight - a.weight);
}

export function isTaiwanSymbol(symbol: string) {
  return /^\d{4,6}$/.test(symbol);
}
