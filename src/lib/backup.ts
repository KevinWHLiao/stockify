import type { DaySnapshot, Quote, Settings, Transaction, WatchItem } from '../types';
import { defaultSettings } from '../types';
import { ledgerError } from './portfolio';

export const BACKUP_APP = 'stockify';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  transactions: Transaction[];
  settings: Settings;
  watchlist: WatchItem[];
  snapshots: Record<string, DaySnapshot>;
}

export interface BackupSource {
  transactions: Transaction[];
  settings: Settings;
  watchlist: WatchItem[];
  snapshots: Record<string, DaySnapshot>;
}

const TX_TYPES = new Set(['buy', 'sell', 'cash_dividend', 'stock_dividend']);

export function buildBackup(source: BackupSource, exportedAt = new Date().toISOString()): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    transactions: source.transactions,
    settings: { ...defaultSettings, ...source.settings },
    watchlist: source.watchlist,
    snapshots: source.snapshots,
  };
}

export function backupFileName(exportedAt: string) {
  const stamp = exportedAt.slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  return `stockify-backup-${stamp}.json`;
}

export function parseBackup(text: string): { file: BackupFile } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: '這個檔案不是備份資料。' };
  }
  if (!raw || typeof raw !== 'object') return { error: '這個檔案不是備份資料。' };
  const data = raw as Partial<BackupFile>;
  if (data.app !== BACKUP_APP) return { error: '這不是「我的持股」的備份檔。' };
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return { error: '這份備份是較新版本建立的，請先更新 App 再還原。' };
  }
  if (!Array.isArray(data.transactions)) return { error: '備份檔缺少交易紀錄。' };
  for (const tx of data.transactions) {
    if (!tx || typeof tx !== 'object') return { error: '備份檔裡有一筆無法讀取的交易。' };
    if (typeof tx.id !== 'string' || !TX_TYPES.has(tx.type)) return { error: '備份檔裡有一筆無法讀取的交易。' };
    if (typeof tx.symbol !== 'string' || typeof tx.shares !== 'number' || typeof tx.date !== 'string') {
      return { error: '備份檔裡有一筆無法讀取的交易。' };
    }
  }
  const settings = { ...defaultSettings, ...(data.settings ?? {}) };
  const problem = ledgerError(data.transactions, settings);
  if (problem) return { error: problem };
  const watchlist = Array.isArray(data.watchlist) ? data.watchlist.filter((item) => item && typeof item.symbol === 'string') : [];
  const snapshots = data.snapshots && typeof data.snapshots === 'object' ? data.snapshots : {};
  return {
    file: {
      app: BACKUP_APP,
      version: data.version,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
      transactions: data.transactions,
      settings,
      watchlist,
      snapshots,
    },
  };
}

export function quotesFromBackup(file: BackupFile): Quote[] {
  const dates = Object.keys(file.snapshots).sort();
  const snapshot = dates.length > 0 ? file.snapshots[dates[dates.length - 1]] : undefined;
  if (!snapshot) return [];
  const markets = new Map(file.transactions.map((tx) => [tx.symbol, tx.market]));
  return snapshot.items
    .filter((item) => Number.isFinite(item.price) && item.price > 0)
    .map((item) => {
      const previousClose = item.price - item.change;
      const changePercent = previousClose > 0 ? (item.change / previousClose) * 100 : 0;
      return {
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        previousClose,
        change: item.change,
        changePercent,
        open: null,
        high: null,
        low: null,
        volume: null,
        time: snapshot.updatedAt,
        date: snapshot.date,
        market: markets.get(item.symbol) ?? 'tse',
      };
    });
}

export function backupAgeDays(lastBackupAt: string | null, now = Date.now()) {
  if (!lastBackupAt) return null;
  const time = Date.parse(lastBackupAt);
  if (Number.isNaN(time)) return null;
  return (now - time) / 86_400_000;
}
