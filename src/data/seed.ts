import { calcCommission } from '../lib/fees';
import type { Settings, Transaction } from '../types';

interface DemoHolding {
  symbol: string;
  name: string;
  assetType: 'stock' | 'etf';
  shares: number;
  buyAvg: number;
  costAvg: number;
  buyDate: string;
  dividendDate?: string;
}

/** 畫面初次開啟時的範例庫存，股數與均價對齊示意截圖，價格會改用即時報價重算。 */
const DEMO: DemoHolding[] = [
  {
    symbol: '0056',
    name: '元大高股息',
    assetType: 'etf',
    shares: 60697,
    buyAvg: 34.3,
    costAvg: 29.4,
    buyDate: '2023-08-08',
    dividendDate: '2025-10-23',
  },
  {
    symbol: '3231',
    name: '緯創',
    assetType: 'stock',
    shares: 5000,
    buyAvg: 113.7,
    costAvg: 105.87,
    buyDate: '2024-02-21',
    dividendDate: '2025-08-14',
  },
  {
    symbol: '00919',
    name: '群益台灣精選高息',
    assetType: 'etf',
    shares: 30000,
    buyAvg: 22.5,
    costAvg: 18.95,
    buyDate: '2024-11-06',
    dividendDate: '2026-01-16',
  },
  {
    symbol: '0050',
    name: '元大台灣50',
    assetType: 'etf',
    shares: 111177,
    buyAvg: 62.98,
    costAvg: 61.83,
    buyDate: '2023-03-16',
    dividendDate: '2026-07-17',
  },
  {
    symbol: '006208',
    name: '富邦台50',
    assetType: 'etf',
    shares: 2865,
    buyAvg: 155.49,
    costAvg: 155.71,
    buyDate: '2025-04-18',
  },
];

export function buildSeed(settings: Settings): Transaction[] {
  const transactions: Transaction[] = [];
  for (const holding of DEMO) {
    const gross = holding.shares * holding.buyAvg;
    const fee = calcCommission(gross, settings);
    transactions.push({
      id: `seed-${holding.symbol}-buy`,
      type: 'buy',
      symbol: holding.symbol,
      name: holding.name,
      market: 'tse',
      assetType: holding.assetType,
      date: holding.buyDate,
      shares: holding.shares,
      price: holding.buyAvg,
      amount: 0,
      fee,
      tax: 0,
      note: '',
      createdAt: `${holding.buyDate}T01:00:00.000Z`,
    });
    const dividend = gross + fee - holding.shares * holding.costAvg;
    if (holding.dividendDate && dividend > 20) {
      transactions.push({
        id: `seed-${holding.symbol}-div`,
        type: 'cash_dividend',
        symbol: holding.symbol,
        name: holding.name,
        market: 'tse',
        assetType: holding.assetType,
        date: holding.dividendDate,
        shares: holding.shares,
        price: dividend / holding.shares,
        amount: dividend,
        fee: 0,
        tax: 0,
        note: '',
        createdAt: `${holding.dividendDate}T02:00:00.000Z`,
      });
    }
  }
  return transactions;
}

export function isDemoTransaction(id: string) {
  return id.startsWith('seed-');
}
