import type { AssetType, SymbolInfo } from '../types';

export function inferAssetType(symbol: string, name: string): AssetType {
  if (symbol.startsWith('00')) return 'etf';
  if (name.includes('ETF') || name.includes('指數股票')) return 'etf';
  return 'stock';
}

export const SYMBOLS: SymbolInfo[] = [
  ['0050', '元大台灣50', 'etf'],
  ['0056', '元大高股息', 'etf'],
  ['006208', '富邦台50', 'etf'],
  ['00878', '國泰永續高股息', 'etf'],
  ['00919', '群益台灣精選高息', 'etf'],
  ['00929', '復華台灣科技優息', 'etf'],
  ['00940', '元大台灣價值高息', 'etf'],
  ['0052', '富邦科技', 'etf'],
  ['00646', '元大S&P500', 'etf'],
  ['00662', '富邦NASDAQ', 'etf'],
  ['00713', '元大台灣高息低波', 'etf'],
  ['00631L', '元大台灣50正2', 'etf'],
  ['00632R', '元大台灣50反1', 'etf'],
  ['00900', '富邦特選高股息30', 'etf'],
  ['2330', '台積電', 'stock'],
  ['2317', '鴻海', 'stock'],
  ['2454', '聯發科', 'stock'],
  ['3231', '緯創', 'stock'],
  ['2303', '聯電', 'stock'],
  ['2308', '台達電', 'stock'],
  ['2382', '廣達', 'stock'],
  ['2357', '華碩', 'stock'],
  ['6669', '緯穎', 'stock'],
  ['3711', '日月光投控', 'stock'],
  ['3037', '欣興', 'stock'],
  ['2345', '智邦', 'stock'],
  ['2379', '瑞昱', 'stock'],
  ['3008', '大立光', 'stock'],
  ['3034', '聯詠', 'stock'],
  ['2327', '國巨', 'stock'],
  ['2301', '光寶科', 'stock'],
  ['2395', '研華', 'stock'],
  ['2881', '富邦金', 'stock'],
  ['2882', '國泰金', 'stock'],
  ['2891', '中信金', 'stock'],
  ['2886', '兆豐金', 'stock'],
  ['2892', '第一金', 'stock'],
  ['5880', '合庫金', 'stock'],
  ['2884', '玉山金', 'stock'],
  ['2885', '元大金', 'stock'],
  ['2412', '中華電', 'stock'],
  ['3045', '台灣大', 'stock'],
  ['4904', '遠傳', 'stock'],
  ['1301', '台塑', 'stock'],
  ['1303', '南亞', 'stock'],
  ['6505', '台塑化', 'stock'],
  ['1326', '台化', 'stock'],
  ['2002', '中鋼', 'stock'],
  ['1216', '統一', 'stock'],
  ['2912', '統一超', 'stock'],
  ['2207', '和泰車', 'stock'],
  ['2603', '長榮', 'stock'],
  ['2609', '陽明', 'stock'],
  ['2615', '萬海', 'stock'],
  ['5871', '中租-KY', 'stock'],
  ['3661', '世芯-KY', 'stock'],
  ['3443', '創意', 'stock'],
  ['2049', '上銀', 'stock'],
  ['2353', '宏碁', 'stock'],
  ['2356', '英業達', 'stock'],
  ['2376', '技嘉', 'stock'],
  ['2377', '微星', 'stock'],
  ['3017', '奇鋐', 'stock'],
  ['2383', '台光電', 'stock'],
  ['4938', '和碩', 'stock'],
  ['2324', '仁寶', 'stock'],
  ['2408', '南亞科', 'stock'],
  ['2337', '旺宏', 'stock'],
  ['2344', '華邦電', 'stock'],
  ['2458', '義隆', 'stock'],
  ['5274', '信驊', 'stock'],
  ['3653', '健策', 'stock'],
  ['1101', '台泥', 'stock'],
  ['1102', '亞泥', 'stock'],
  ['1504', '東元', 'stock'],
  ['9910', '豐泰', 'stock'],
  ['9921', '巨大', 'stock'],
  ['6446', '藥華藥', 'stock'],
  ['6547', '高端疫苗', 'stock'],
  ['8069', '元太', 'stock'],
  ['3481', '群創', 'stock'],
  ['2409', '友達', 'stock'],
  ['5876', '上海商銀', 'stock'],
  ['2880', '華南金', 'stock'],
  ['2883', '開發金', 'stock'],
  ['2890', '永豐金', 'stock'],
  ['2801', '彰銀', 'stock'],
  ['2887', '台新新光金', 'stock'],
  ['1590', '亞德客-KY', 'stock'],
  ['6415', '矽力*-KY', 'stock'],
  ['3529', '力旺', 'stock'],
  ['3105', '穩懋', 'stock'],
  ['5483', '中美晶', 'otc', 'stock'],
  ['6488', '環球晶', 'stock'],
  ['5347', '世界', 'otc', 'stock'],
  ['8299', '群聯', 'stock'],
].map((item) => {
  const [symbol, name, marketOrType, asset] = item as [string, string, string, AssetType?];
  const market = marketOrType === 'otc' ? 'otc' : 'tse';
  const assetType = (asset ?? (marketOrType === 'etf' ? 'etf' : 'stock')) as AssetType;
  return { symbol, name, market, assetType } satisfies SymbolInfo;
});

const bySymbol = new Map(SYMBOLS.map((item) => [item.symbol, item]));

export function findSymbol(symbol: string) {
  return bySymbol.get(symbol);
}

export function isListedSymbol(symbol: string, name: string) {
  if (!/^\d{4,6}$/.test(symbol)) return false;
  if (/[購售權]/.test(name)) return false;
  return true;
}
