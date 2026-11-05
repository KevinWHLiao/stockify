const ADR_ALIASES: Record<string, string> = {
  tsm: 'TSM',
  tsmadr: 'TSM',
  台積電adr: 'TSM',
  台積adr: 'TSM',
  adr台積電: 'TSM',
};

/** 美股代號，或台積電 ADR 的中文別名。搜尋「台積電」時一併帶出 TSM，不取代上市的 2330。 */
export function usSearchTicker(query: string) {
  const compact = query.trim().replace(/\s+/g, '').toLowerCase();
  if (ADR_ALIASES[compact]) return ADR_ALIASES[compact];
  if (compact === '台積電') return 'TSM';
  const upper = query.trim().toUpperCase();
  if (/^[A-Z]{1,5}$/.test(upper)) return upper;
  return null;
}
