export function formatInt(value: number) {
  return Math.round(value).toLocaleString('en-US');
}

export function formatPrice(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatAvg(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatPct(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatMove(change: number, percent: number) {
  const arrow = change > 0.0000001 ? '▲' : change < -0.0000001 ? '▼' : '';
  const changeText = Math.abs(change).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const percentText = Math.abs(percent).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${arrow}${changeText}(${percentText}%)`;
}

/** 指數與高價股共用：最多兩位小數。 */
export function formatQuotePrice(value: number) {
  if (value >= 1000) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 證交所成交量單位為張。 */
export function formatVolume(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 10000) return `${(value / 10000).toFixed(1)} 萬張`;
  return `${Math.round(value).toLocaleString('en-US')} 張`;
}

export function parseNum(input: string) {
  const value = Number(input.replace(/,/g, '').trim());
  return Number.isFinite(value) ? value : Number.NaN;
}

export function createId() {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
