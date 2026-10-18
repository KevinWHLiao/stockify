export type Market = 'tse' | 'otc';
export type AssetType = 'stock' | 'etf';
export type TxType = 'buy' | 'sell' | 'cash_dividend' | 'stock_dividend';
export type PnlMode = 'unrealized' | 'total';
export type HoldingSort = 'book' | 'value' | 'daily' | 'return';

export interface Transaction {
  id: string;
  type: TxType;
  symbol: string;
  name: string;
  market: Market;
  assetType: AssetType;
  date: string;
  shares: number;
  price: number;
  amount: number;
  fee: number;
  tax: number;
  note: string;
  createdAt: string;
}

export interface Settings {
  /** 1 = 手續費 10 折（法定 0.1425%），0.6 = 6 折。 */
  commissionDiscount: number;
  minCommission: number;
  /** 現金股息從持股成本扣除，成本均價會下降。 */
  dividendReducesCost: boolean;
  pnlMode: PnlMode;
  hideDemoBanner: boolean;
  lastBackupAt: string | null;
  backupReminder: boolean;
  holdingSort: HoldingSort;
  priceAlert: boolean;
  /** 今日漲跌幅絕對值達到這個百分比才提醒。 */
  alertPercent: number;
  alertedKeys: string[];
}

export const defaultSettings: Settings = {
  commissionDiscount: 1,
  minCommission: 20,
  dividendReducesCost: true,
  pnlMode: 'unrealized',
  hideDemoBanner: false,
  lastBackupAt: null,
  backupReminder: false,
  holdingSort: 'book',
  priceAlert: false,
  alertPercent: 3,
  alertedKeys: [],
};

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  time: string;
  date: string;
  market: Market;
}

export interface WatchItem {
  symbol: string;
  name: string;
  market: Market;
}

export interface Position {
  symbol: string;
  name: string;
  market: Market;
  assetType: AssetType;
  shares: number;
  totalCost: number;
  buyNotional: number;
  buyShares: number;
  dividendIncome: number;
  realized: number;
}

export interface PositionView extends Position {
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  quoteTime: string | null;
  quoteDate: string | null;
  marketValue: number | null;
  costAvg: number | null;
  buyAvg: number | null;
  sellCost: number | null;
  pnl: number | null;
  pnlPct: number | null;
  dailyPnl: number | null;
}

export interface DaySnapshotItem {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  change: number;
  dailyPnl: number;
  pnl: number;
  marketValue: number;
}

export interface DaySnapshot {
  date: string;
  updatedAt: string;
  totalDailyPnl: number;
  totalMarketValue: number;
  totalPnl: number;
  dividendIncome: number;
  items: DaySnapshotItem[];
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  market: Market;
  assetType: AssetType;
}
