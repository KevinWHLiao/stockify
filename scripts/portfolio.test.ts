import { buildSeed } from '../src/data/seed';
import { findSymbol } from '../src/data/symbols';
import { parseTpexSuggestions, rankSymbols } from '../src/lib/symbolSearch';
import { priceAlertHits } from '../src/lib/alerts';
import { analyzeHoldings, dailyObservations, lookThrough } from '../src/lib/analysis';
import { portfolioWeight, sortHoldings } from '../src/lib/holdings';
import { buildBackup, parseBackup } from '../src/lib/backup';
import { ALL_MARKET_INDICES, SECTOR_HEADLINES } from '../src/data/market';
import { parseCapitalHoldings, parseMoneyDjHoldings, parseYuantaHoldings } from '../src/lib/etfHoldings';
import { breakEvenPrice, calcTax, estimatedSellCost } from '../src/lib/fees';
import { quoteFromMis } from '../src/lib/misQuote';
import { quoteFromCnyes } from '../src/lib/cnyesQuote';
import { quoteFromYahoo } from '../src/lib/yahooQuote';
import { replay, toView } from '../src/lib/portfolio';
import { defaultSettings, type Quote, type Transaction } from '../src/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function must<T>(value: T | undefined, message: string): T {
  if (value == null) throw new Error(message);
  return value;
}

function close(actual: number, expected: number, message: string) {
  if (Math.abs(actual - expected) > 0.02) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

const settings = defaultSettings;
const seeded = buildSeed(settings);
const positions = replay(seeded, settings);

for (const expected of [
  ['0056', 60697, 29.4, 34.3],
  ['3231', 5000, 105.87, 113.7],
  ['00919', 30000, 18.95, 22.5],
  ['0050', 111177, 61.83, 62.98],
] as const) {
  const [symbol, shares, costAvg, buyAvg] = expected;
  const position = must(
    positions.find((item) => item.symbol === symbol),
    `missing ${symbol}`,
  );
  close(position.shares, shares, `${symbol} shares`);
  close(position.totalCost / position.shares, costAvg, `${symbol} cost`);
  close(position.buyNotional / position.buyShares, buyAvg, `${symbol} buy`);
  assert(position.dividendIncome > 0, `${symbol} dividend`);
}

const fubon = must(
  positions.find((item) => item.symbol === '006208'),
  'missing 006208',
);
close(fubon.shares, 2865, '006208 shares');
close(fubon.totalCost / fubon.shares, 155.71, '006208 cost');
close(fubon.buyNotional / fubon.buyShares, 155.49, '006208 buy');

const wistron = must(
  positions.find((item) => item.symbol === '3231'),
  'wistron',
);
const quote: Quote = {
  symbol: '3231',
  name: '緯創',
  price: 189.5,
  previousClose: 189.5,
  change: 0,
  changePercent: 0,
  open: 189.5,
  high: 189.5,
  low: 189.5,
  volume: 1000,
  time: '13:30:00',
  date: '20261006',
  market: 'tse',
};
const view = toView(wistron, quote, settings);
const marketValue = 5000 * 189.5;
const sellCost = Math.floor(marketValue * 0.001425) + calcTax(marketValue, 'stock');
close(view.pnl ?? 0, marketValue - wistron.totalCost - sellCost, 'wistron pnl');
close(view.dailyPnl ?? 0, 0, 'wistron daily');
assert((view.pnlPct ?? 0) > 70 && (view.pnlPct ?? 0) < 75, 'wistron percent uses buy average');
const even = breakEvenPrice(1000, 100000, 'stock', settings);
assert(even != null && even > 100, 'break even is above raw cost');
const evenValue = 1000 * (even ?? 0);
assert(evenValue - 100000 - estimatedSellCost(evenValue, 'stock', settings) >= 0, 'selling at break even does not lose');

const manual: Transaction[] = [
  {
    id: 'b',
    type: 'buy',
    symbol: '2330',
    name: '台積電',
    market: 'tse',
    assetType: 'stock',
    date: '2026-01-05',
    shares: 1000,
    price: 100,
    amount: 0,
    fee: 20,
    tax: 0,
    note: '',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'd',
    type: 'cash_dividend',
    symbol: '2330',
    name: '台積電',
    market: 'tse',
    assetType: 'stock',
    date: '2026-07-01',
    shares: 1000,
    price: 5,
    amount: 5000,
    fee: 0,
    tax: 0,
    note: '',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 's',
    type: 'stock_dividend',
    symbol: '2330',
    name: '台積電',
    market: 'tse',
    assetType: 'stock',
    date: '2026-08-01',
    shares: 100,
    price: 0,
    amount: 0,
    fee: 0,
    tax: 0,
    note: '',
    createdAt: '2026-08-01T00:00:00.000Z',
  },
];

const afterDividend = must(
  replay(manual, settings).find((item) => item.symbol === '2330'),
  'manual position',
);
close(afterDividend.shares, 1100, 'stock dividend shares');
close(afterDividend.totalCost, 1000 * 100 + 20 - 5000, 'cost reduced by cash dividend only');
close(afterDividend.buyNotional / afterDividend.buyShares, 100, 'buy average stays at purchase price');
close(afterDividend.dividendIncome, 5000, 'dividend income');

const tooEarly: Transaction[] = [
  { ...manual[1], date: '2025-01-01', createdAt: '2025-01-01T00:00:00.000Z' },
  manual[0],
];
let failed = false;
try {
  replay(tooEarly, settings);
} catch (error) {
  failed = error instanceof Error && error.message.includes('還沒有持股');
}
assert(failed, 'dividend before buy is rejected');

const oversell: Transaction[] = [
  manual[0],
  {
    ...manual[0],
    id: 'sell',
    type: 'sell',
    date: '2026-02-01',
    shares: 1001,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];
failed = false;
try {
  replay(oversell, settings);
} catch (error) {
  failed = error instanceof Error && error.message.includes('可賣股數不足');
}
assert(failed, 'oversell is rejected');

const moved = quoteFromMis({ c: '0050', n: '元大台灣50', z: '-', pz: '116.05', y: '116.50', ex: 'tse' });
assert(moved != null, 'uses last trade when the latest print is blank');
close(moved?.price ?? 0, 116.05, 'last trade price');
close(moved?.change ?? 0, -0.45, 'daily change uses previous close');

const flat = quoteFromMis({ c: '3231', n: '緯創', z: '189.5', y: '189.5', ex: 'tse' });
close(flat?.change ?? 1, 0, 'unchanged stock stays flat');

const blank = quoteFromMis({ c: '0056', n: '元大高股息', z: '-', pz: '-', y: '58.1', ex: 'tse' });
assert(blank == null, 'missing last trade is not stored as a zero move');

const index = quoteFromMis({
  c: 't00',
  n: '發行量加權股價指數',
  z: '49806.37',
  y: '49822.55',
  o: '49857.32',
  h: '49966.89',
  l: '49567.52',
  ex: 'tse',
});
assert(index != null, 'index quote parses without last-trade field');
close(index?.change ?? 0, -16.18, 'index daily change');
assert(index?.open != null && index.high != null && index.low != null, 'index keeps open high low');

const yahoo = quoteFromYahoo('2330', 'tse', {
  regularMarketPrice: 2385,
  chartPreviousClose: 2420,
  regularMarketTime: 1792647009,
  regularMarketVolume: 22651,
});
assert(yahoo != null, 'yahoo quote parses');
close(yahoo?.change ?? 0, -35, 'yahoo daily change');
assert(yahoo?.date === '20261022' && yahoo.time.startsWith('13:30'), 'yahoo time is Taipei');
assert(quoteFromYahoo('2330', 'tse', { regularMarketPrice: 0, chartPreviousClose: 2420 }) == null, 'yahoo rejects a zero price');
const cnyes = quoteFromCnyes('3231', 'tse', { 6: 190, 11: -5, 12: 199, 13: 189.5, 19: 198.5, 21: 195, 56: -2.56, 200007: 1792647000, 200009: '緯創' });
assert(cnyes != null && cnyes.price === 190 && cnyes.name === '緯創', 'cnyes quote parses');
close(cnyes?.changePercent ?? 0, -2.56, 'cnyes percent');

const backup = buildBackup({ transactions: seeded, settings, watchlist: [], snapshots: {} }, '2026-10-17T01:00:00.000Z');
const restored = parseBackup(JSON.stringify(backup));
assert('file' in restored, 'backup round trip');
if ('file' in restored) assert(restored.file.transactions.length === seeded.length, 'backup keeps every trade');
const foreign = parseBackup('{"app":"other"}');
assert('error' in foreign, 'foreign file is rejected');

const holdingsHtml =
  'window.__NUXT__=(function(a,b,c){return {data:[{StockWeights:[{code:a,name:b,weights:56.66,qty:1,ym:null},{code:c,name:"聯發科",weights:5.99,qty:2,ym:null},{code:"2317",name:"鴻海",weights:4,qty:3,ym:null}]}]}})("2330","台積電","2454");';
const constituents = parseYuantaHoldings(`<script>${holdingsHtml}</script>`);
assert(constituents.length === 3, 'etf parser reads weights');
assert(constituents[0]?.symbol === '2330', 'heaviest constituent comes first');

const oneStock =
  'window.__NUXT__=(function(){return {data:[{StockWeights:[{code:"2330",name:"台積電",weights:"39.38",ym:null}]}]}})();';
const leveraged = parseYuantaHoldings(`<script>${oneStock}</script>`);
assert(leveraged.length === 1 && leveraged[0]?.symbol === '2330', 'single stock holding still counts');

const moneyHtml = `
<table id="ctl00_ctl00_MainContent_MainContent_stable3">
<tr><td class="col05"><a href="/x">富邦金(2881.TW)</a></td><td class="col06">15.48</td></tr>
<tr><td class="col05"><a href="/x">臺股期貨 202610(FITXN*1.TF)</a></td><td class="col06">135.13</td></tr>
<tr><td class="col05"><a href="/x">臺股期貨 202611(FITXN*1.TF)</a></td><td class="col06">22.89</td></tr>
<tr><td class="col05">台灣50ETF股票期貨 202610</td><td class="col06">3.04</td></tr>
</table>`;
const moneyRows = parseMoneyDjHoldings(moneyHtml);
assert(moneyRows.length === 4, 'moneydj reads stocks and futures');
assert(moneyRows[0]?.name === '臺股期貨 202610', 'heaviest moneydj row first');
assert(moneyRows[0]?.symbol !== moneyRows[1]?.symbol, 'futures months stay distinct');
assert(moneyRows.some((row) => row.symbol === '2881'), 'stock code is kept');

const capitalRows = parseCapitalHoldings({
  data: {
    stocks: [{ stocNo: '2881', stocName: '富邦金', weightRound: 15.48 }],
    futures: [{ txDesc: '台指期202610', txEname: 'TX202610', weightRound: 0.36 }],
  },
});
assert(capitalRows.length === 2 && capitalRows[0]?.symbol === '2881', 'capital holdings include stocks');

const indexSymbols = ALL_MARKET_INDICES.map((item) => item.symbol);
assert(new Set(indexSymbols).size === indexSymbols.length, 'index symbols are unique');
assert(SECTOR_HEADLINES.map((item) => item.shortName).join(',') === '電子,金融,傳產', 'sector headlines');

const notes = analyzeHoldings(
  [
    {
      symbol: '0050',
      name: '元大台灣50',
      market: 'tse',
      assetType: 'etf',
      shares: 10,
      totalCost: 100,
      buyNotional: 100,
      buyShares: 10,
      dividendIncome: 0,
      realized: 0,
      price: 20,
      previousClose: 19,
      change: 1,
      changePercent: 5,
      quoteTime: null,
      quoteDate: null,
      marketValue: 200,
      costAvg: 10,
      buyAvg: 10,
      sellCost: 1,
      pnl: 99,
      pnlPct: 99,
      dailyPnl: 10,
    },
  ],
  {
    marketValue: 200,
    dailyPnl: 10,
    unrealized: 99,
    unrealizedPct: 99,
    cost: 100,
    dividendIncome: 0,
    realized: 0,
    total: 99,
    totalPct: 99,
    priced: 1,
    held: 1,
  },
);
assert(notes.some((note) => note.title.includes('100.0%')), 'analysis flags a single holding');
const today = dailyObservations(
  [
    {
      symbol: '0050',
      name: '元大台灣50',
      market: 'tse',
      assetType: 'etf',
      shares: 10,
      totalCost: 100,
      buyNotional: 100,
      buyShares: 10,
      dividendIncome: 0,
      realized: 0,
      price: 20,
      previousClose: 19,
      change: 1,
      changePercent: 5,
      quoteTime: null,
      quoteDate: null,
      marketValue: 200,
      costAvg: 10,
      buyAvg: 10,
      sellCost: 1,
      pnl: 99,
      pnlPct: 99,
      dailyPnl: 10,
    },
  ],
  {
    marketValue: 200,
    dailyPnl: 10,
    unrealized: 99,
    unrealizedPct: 99,
    cost: 100,
    dividendIncome: 0,
    realized: 0,
    total: 99,
    totalPct: 99,
    priced: 1,
    held: 1,
  },
);
assert(today.some((note) => note.title.includes('+10')), 'daily note shows today pnl');
assert(today.some((note) => note.body.includes('不能當作進出場依據')), 'a large daily move is not a trade signal');
const exposure = lookThrough(
  [
    {
      symbol: '0050',
      name: '元大台灣50',
      market: 'tse',
      assetType: 'etf',
      shares: 10,
      totalCost: 100,
      buyNotional: 100,
      buyShares: 10,
      dividendIncome: 0,
      realized: 0,
      price: 20,
      previousClose: 19,
      change: 1,
      changePercent: 5,
      quoteTime: null,
      quoteDate: null,
      marketValue: 200,
      costAvg: 10,
      buyAvg: 10,
      sellCost: 1,
      pnl: 99,
      pnlPct: 99,
      dailyPnl: 10,
    },
  ],
  { '0050': constituents },
  200,
);
close(exposure[0]?.weight ?? 0, 56.66, 'look-through uses etf weight');

const ranked = sortHoldings(
  [
    { ...notes[0], symbol: 'a', marketValue: 10, dailyPnl: 5, pnlPct: 1 } as never,
    { symbol: 'b', marketValue: 30, dailyPnl: -2, pnlPct: 9 } as never,
  ],
  'value',
);
assert(ranked[0]?.symbol === 'b', 'holdings sort by market value');
close(portfolioWeight(30, 40) ?? 0, 75, 'portfolio weight');

const alerts = priceAlertHits(
  [
    { symbol: '2330', name: '台積電', change: 20, changePercent: 3.2 },
    { symbol: '2317', name: '鴻海', change: -1, changePercent: -0.4 },
  ],
  3,
  '2026-10-18',
  [],
);
assert(alerts.length === 1 && alerts[0]?.key === '2026-10-18:2330:up', 'alert fires once past the threshold');
assert(priceAlertHits([{ symbol: '2330', name: '台積電', change: 20, changePercent: 3.2 }], 3, '2026-10-18', [alerts[0].key]).length === 0, 'same direction is not repeated');

const zhujian = must(findSymbol('7723'), '築間 is in the OTC directory');
assert(zhujian.name === '築間' && zhujian.market === 'otc', '築間 is an OTC stock');
const parsed = parseTpexSuggestions({
  suggestions: [
    { type: '上櫃公司', data: ['7723 築間\t7723'] },
    { type: '創櫃公司', data: ['7600 大麥網路\t7600'] },
    { type: '您是否在找以下資訊', data: ['興櫃股票市況報導\thttps://mis.tpex.org.tw/'] },
  ],
});
assert(parsed.length === 1 && parsed[0]?.symbol === '7723' && parsed[0].market === 'otc', 'OTC search keeps cabinet stocks');
const nameRank = rankSymbols(
  [
    { symbol: '1234', name: '築間食品', market: 'tse', assetType: 'stock' },
    zhujian,
  ],
  '築間',
);
assert(nameRank[0]?.symbol === '7723', 'exact company name ranks first');

console.log('portfolio checks passed');
