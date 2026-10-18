import type { Market, WatchItem } from '../types';

export interface MarketIndex {
  symbol: string;
  name: string;
  shortName: string;
  market: Market;
}

/** 證交所 MIS 指數代碼。大盤走勢只放加權與櫃買。 */
export const MARKET_INDICES: MarketIndex[] = [
  { symbol: 't00', name: '發行量加權股價指數', shortName: '加權指數', market: 'tse' },
  { symbol: 'o00', name: '櫃買指數', shortName: '櫃買指數', market: 'otc' },
];

export type SectorGroup = 'electronics' | 'finance' | 'traditional';

export interface SectorIndex extends MarketIndex {
  group: SectorGroup;
}

export const SECTOR_GROUP_LABEL: Record<SectorGroup, string> = {
  electronics: '電子',
  finance: '金融',
  traditional: '傳產',
};

/** 三條總指數。傳產用證交所「未含金融電子指數」。 */
export const SECTOR_HEADLINES: SectorIndex[] = [
  { symbol: 't13', name: '電子工業類指數', shortName: '電子', market: 'tse', group: 'electronics' },
  { symbol: 't17', name: '金融保險類指數', shortName: '金融', market: 'tse', group: 'finance' },
  { symbol: 'IX0009', name: '未含金融電子指數', shortName: '傳產', market: 'tse', group: 'traditional' },
];

/** 電子次產業與傳產細項。金融沒有再拆成銀行、保險、證券指數。 */
export const SECTOR_INDICES: SectorIndex[] = [
  { symbol: 't24', name: '半導體類指數', shortName: '半導體', market: 'tse', group: 'electronics' },
  { symbol: 't25', name: '電腦及週邊設備類指數', shortName: '電腦週邊', market: 'tse', group: 'electronics' },
  { symbol: 't26', name: '光電類指數', shortName: '光電', market: 'tse', group: 'electronics' },
  { symbol: 't27', name: '通信網路類指數', shortName: '通信網路', market: 'tse', group: 'electronics' },
  { symbol: 't28', name: '電子零組件類指數', shortName: '電子零組件', market: 'tse', group: 'electronics' },
  { symbol: 't29', name: '電子通路類指數', shortName: '電子通路', market: 'tse', group: 'electronics' },
  { symbol: 't30', name: '資訊服務類指數', shortName: '資訊服務', market: 'tse', group: 'electronics' },
  { symbol: 't31', name: '其他電子類指數', shortName: '其他電子', market: 'tse', group: 'electronics' },
  { symbol: 't01', name: '水泥類指數', shortName: '水泥', market: 'tse', group: 'traditional' },
  { symbol: 't02', name: '食品類指數', shortName: '食品', market: 'tse', group: 'traditional' },
  { symbol: 't03', name: '塑膠類指數', shortName: '塑膠', market: 'tse', group: 'traditional' },
  { symbol: 't04', name: '紡織纖維類指數', shortName: '紡織', market: 'tse', group: 'traditional' },
  { symbol: 't05', name: '電機機械類指數', shortName: '電機機械', market: 'tse', group: 'traditional' },
  { symbol: 't06', name: '電器電纜類指數', shortName: '電器電纜', market: 'tse', group: 'traditional' },
  { symbol: 't21', name: '化學類指數', shortName: '化學', market: 'tse', group: 'traditional' },
  { symbol: 't22', name: '生技醫療類指數', shortName: '生技醫療', market: 'tse', group: 'traditional' },
  { symbol: 't08', name: '玻璃陶瓷類指數', shortName: '玻璃陶瓷', market: 'tse', group: 'traditional' },
  { symbol: 't09', name: '造紙類指數', shortName: '造紙', market: 'tse', group: 'traditional' },
  { symbol: 't10', name: '鋼鐵類指數', shortName: '鋼鐵', market: 'tse', group: 'traditional' },
  { symbol: 't11', name: '橡膠類指數', shortName: '橡膠', market: 'tse', group: 'traditional' },
  { symbol: 't12', name: '汽車類指數', shortName: '汽車', market: 'tse', group: 'traditional' },
  { symbol: 't14', name: '建材營造類指數', shortName: '營建', market: 'tse', group: 'traditional' },
  { symbol: 't15', name: '航運類指數', shortName: '航運', market: 'tse', group: 'traditional' },
  { symbol: 't16', name: '觀光餐旅類指數', shortName: '觀光', market: 'tse', group: 'traditional' },
  { symbol: 't18', name: '貿易百貨類指數', shortName: '貿易百貨', market: 'tse', group: 'traditional' },
  { symbol: 't23', name: '油電燃氣類指數', shortName: '油電燃氣', market: 'tse', group: 'traditional' },
  { symbol: 't20', name: '其他類指數', shortName: '其他', market: 'tse', group: 'traditional' },
];

export const ALL_MARKET_INDICES: MarketIndex[] = [...MARKET_INDICES, ...SECTOR_HEADLINES, ...SECTOR_INDICES];

export function findMarketIndex(symbol: string) {
  return ALL_MARKET_INDICES.find((item) => item.symbol === symbol);
}

export const DEFAULT_WATCHLIST: WatchItem[] = [
  { symbol: '2330', name: '台積電', market: 'tse' },
  { symbol: '2317', name: '鴻海', market: 'tse' },
  { symbol: '2454', name: '聯發科', market: 'tse' },
  { symbol: '2308', name: '台達電', market: 'tse' },
  { symbol: '2382', name: '廣達', market: 'tse' },
  { symbol: '0050', name: '元大台灣50', market: 'tse' },
  { symbol: '0056', name: '元大高股息', market: 'tse' },
  { symbol: '00919', name: '群益台灣精選高息', market: 'tse' },
];
