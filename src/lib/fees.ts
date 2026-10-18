import type { AssetType, Settings } from '../types';

/** 台股法定手續費率。券商折扣用 settings.commissionDiscount 相乘。 */
export const STATUTORY_COMMISSION_RATE = 0.001425;

export function calcCommission(amount: number, settings: Settings) {
  if (!(amount > 0)) return 0;
  const rate = STATUTORY_COMMISSION_RATE * settings.commissionDiscount;
  const raw = Math.floor(amount * rate);
  return Math.max(raw, Math.floor(settings.minCommission));
}

export function taxRate(assetType: AssetType) {
  return assetType === 'etf' ? 0.001 : 0.003;
}

export function calcTax(amount: number, assetType: AssetType) {
  if (!(amount > 0)) return 0;
  return Math.floor(amount * taxRate(assetType));
}

/** 未實現損益預扣的賣出手續費與證券交易稅。買進成本已含在持股成本裡。 */
export function estimatedSellCost(marketValue: number, assetType: AssetType, settings: Settings) {
  return calcCommission(marketValue, settings) + calcTax(marketValue, assetType);
}
