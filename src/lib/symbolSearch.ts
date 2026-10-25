import { inferAssetType, isListedSymbol } from '../data/symbols';
import type { SymbolInfo } from '../types';

export function parseTwseSuggestions(data: unknown): SymbolInfo[] {
  const suggestions = Array.isArray((data as { suggestions?: unknown })?.suggestions)
    ? ((data as { suggestions: unknown[] }).suggestions)
    : [];
  const items: SymbolInfo[] = [];
  for (const suggestion of suggestions) {
    if (typeof suggestion !== 'string') continue;
    const [symbol = '', name = ''] = suggestion.split('\t');
    if (!isListedSymbol(symbol, name)) continue;
    items.push({ symbol, name, market: 'tse', assetType: inferAssetType(symbol, name) });
  }
  return items;
}

export function parseTpexSuggestions(data: unknown): SymbolInfo[] {
  const suggestions = Array.isArray((data as { suggestions?: unknown })?.suggestions)
    ? ((data as { suggestions: { type?: unknown; data?: unknown }[] }).suggestions)
    : [];
  const items: SymbolInfo[] = [];
  for (const group of suggestions) {
    const type = String(group?.type ?? '');
    if (!type.includes('上櫃')) continue;
    const rows = Array.isArray(group.data) ? group.data : [];
    for (const row of rows) {
      if (typeof row !== 'string') continue;
      const [left = '', right = ''] = row.split('\t');
      const symbol = (right.trim() || left.trim().split(/\s+/)[0] || '').trim();
      const name = left.replace(symbol, '').trim() || symbol;
      if (!isListedSymbol(symbol, name)) continue;
      items.push({ symbol, name, market: 'otc', assetType: inferAssetType(symbol, name) });
    }
  }
  return items;
}

export function rankSymbols(items: SymbolInfo[], query: string) {
  const text = query.trim();
  const folded = text.toLowerCase();
  const score = (item: SymbolInfo) => {
    const name = item.name.toLowerCase();
    if (item.symbol === text) return 0;
    if (name === folded) return 1;
    if (name.startsWith(folded)) return 2;
    if (item.symbol.startsWith(text)) return 3;
    return 4;
  };
  return [...items].sort((a, b) => score(a) - score(b) || a.symbol.localeCompare(b.symbol));
}
