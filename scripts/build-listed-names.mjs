import { writeFileSync } from 'node:fs';

async function load(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

function row(symbol, name, market) {
  const clean = String(name ?? '').trim();
  if (!/^\d{4,6}$/.test(symbol) || !clean) return null;
  return { symbol, name: clean, market };
}

const listed = await load('https://openapi.twse.com.tw/v1/opendata/t187ap03_L');
const otc = await load('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O');
const map = new Map();
for (const item of listed) {
  const next = row(String(item['公司代號'] ?? '').trim(), item['公司簡稱'], 'tse');
  if (next) map.set(next.symbol, next);
}
for (const item of otc) {
  const next = row(String(item.SecuritiesCompanyCode ?? '').trim(), item.CompanyAbbreviation, 'otc');
  if (next && !map.has(next.symbol)) map.set(next.symbol, next);
}
const rows = [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
const body = rows
  .map((item) => `  [${JSON.stringify(item.symbol)}, ${JSON.stringify(item.name)}, ${JSON.stringify(item.market)}],`)
  .join('\n');
const file = `// 上市與上櫃公司簡稱，讓名稱搜尋不必只靠證交所的上市清單。\nexport const LISTED_NAMES: [string, string, 'tse' | 'otc'][] = [\n${body}\n];\n`;
writeFileSync(new URL('../src/data/listedNames.ts', import.meta.url), file);
const hit = rows.find((item) => item.symbol === '7723');
console.log('count', rows.length, 'hit', hit);
