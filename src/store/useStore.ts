import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_WATCHLIST } from '../data/market';
import { buildSeed } from '../data/seed';
import { ledgerError } from '../lib/portfolio';
import type { DaySnapshot, Quote, Settings, Transaction, WatchItem } from '../types';
import { defaultSettings } from '../types';

interface PersistedShape {
  transactions?: Transaction[];
  settings?: Settings;
  quotes?: Record<string, Quote>;
  marketQuotes?: Record<string, Quote>;
  watchlist?: WatchItem[];
  snapshots?: Record<string, DaySnapshot>;
  lastSyncAt?: string | null;
  initialized?: boolean;
}

interface Store {
  transactions: Transaction[];
  settings: Settings;
  quotes: Record<string, Quote>;
  marketQuotes: Record<string, Quote>;
  watchlist: WatchItem[];
  snapshots: Record<string, DaySnapshot>;
  lastSyncAt: string | null;
  initialized: boolean;
  hydrated: boolean;
  syncing: boolean;
  quoteError: string | null;
  marketSyncing: boolean;
  marketError: string | null;
  addTransaction: (tx: Transaction) => string | null;
  updateTransaction: (tx: Transaction) => string | null;
  deleteTransaction: (id: string) => string | null;
  updateSettings: (patch: Partial<Settings>) => void;
  clearAll: () => void;
  loadDemo: () => void;
  setQuotes: (quotes: Quote[]) => void;
  setQuoteError: (message: string | null) => void;
  setSyncing: (syncing: boolean) => void;
  setMarketQuotes: (quotes: Quote[]) => void;
  setMarketError: (message: string | null) => void;
  setMarketSyncing: (syncing: boolean) => void;
  addWatch: (item: WatchItem) => void;
  removeWatch: (symbol: string) => void;
  recordSnapshot: (snapshot: DaySnapshot) => void;
  restoreLedger: (payload: {
    transactions: Transaction[];
    settings: Settings;
    watchlist: WatchItem[];
    snapshots: Record<string, DaySnapshot>;
  }) => string | null;
}

function trimSnapshots(snapshots: Record<string, DaySnapshot>) {
  const entries = Object.entries(snapshots).sort(([a], [b]) => (a < b ? -1 : 1));
  return Object.fromEntries(entries.slice(-365));
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      transactions: [],
      settings: defaultSettings,
      quotes: {},
      marketQuotes: {},
      watchlist: DEFAULT_WATCHLIST,
      snapshots: {},
      lastSyncAt: null,
      initialized: false,
      hydrated: false,
      syncing: false,
      quoteError: null,
      marketSyncing: false,
      marketError: null,
      addTransaction: (tx) => {
        const next = [...get().transactions, tx];
        const error = ledgerError(next, get().settings);
        if (error) return error;
        set({ transactions: next });
        return null;
      },
      updateTransaction: (tx) => {
        const next = get().transactions.map((item) => (item.id === tx.id ? tx : item));
        const error = ledgerError(next, get().settings);
        if (error) return error;
        set({ transactions: next });
        return null;
      },
      deleteTransaction: (id) => {
        const next = get().transactions.filter((item) => item.id !== id);
        const error = ledgerError(next, get().settings);
        if (error) return error;
        set({ transactions: next });
        return null;
      },
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      clearAll: () =>
        set({
          transactions: [],
          snapshots: {},
          quotes: {},
          initialized: true,
          settings: { ...get().settings, hideDemoBanner: true },
        }),
      loadDemo: () =>
        set({
          transactions: buildSeed(get().settings),
          snapshots: {},
          initialized: true,
          settings: { ...get().settings, hideDemoBanner: false },
        }),
      setQuotes: (quotes) => {
        const next = { ...get().quotes };
        for (const quote of quotes) next[quote.symbol] = quote;
        set({ quotes: next, lastSyncAt: new Date().toISOString() });
      },
      setQuoteError: (message) => set({ quoteError: message }),
      setSyncing: (syncing) => set({ syncing }),
      setMarketQuotes: (quotes) => {
        const next = { ...get().marketQuotes };
        for (const quote of quotes) next[quote.symbol] = quote;
        set({ marketQuotes: next });
      },
      setMarketError: (message) => set({ marketError: message }),
      setMarketSyncing: (syncing) => set({ marketSyncing: syncing }),
      addWatch: (item) => {
        if (get().watchlist.some((watch) => watch.symbol === item.symbol)) return;
        set({ watchlist: [...get().watchlist, item] });
      },
      removeWatch: (symbol) => set({ watchlist: get().watchlist.filter((item) => item.symbol !== symbol) }),
      recordSnapshot: (snapshot) => {
        if (snapshot.items.length === 0) return;
        set({ snapshots: trimSnapshots({ ...get().snapshots, [snapshot.date]: snapshot }) });
      },
      restoreLedger: (payload) => {
        const settings = { ...defaultSettings, ...payload.settings };
        const problem = ledgerError(payload.transactions, settings);
        if (problem) return problem;
        set({
          transactions: payload.transactions,
          settings,
          watchlist: payload.watchlist.length ? payload.watchlist : DEFAULT_WATCHLIST,
          snapshots: trimSnapshots(payload.snapshots),
          initialized: true,
        });
        return null;
      },
    }),
    {
      name: 'stockify-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        settings: state.settings,
        quotes: state.quotes,
        marketQuotes: state.marketQuotes,
        watchlist: state.watchlist,
        snapshots: state.snapshots,
        lastSyncAt: state.lastSyncAt,
        initialized: state.initialized,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as PersistedShape;
        const settings = { ...defaultSettings, ...(saved.settings ?? {}) };
        const initialized = Boolean(saved.initialized);
        return {
          ...current,
          settings,
          transactions: initialized ? (saved.transactions ?? []) : buildSeed(settings),
          quotes: saved.quotes ?? {},
          marketQuotes: saved.marketQuotes ?? {},
          watchlist: saved.watchlist?.length ? saved.watchlist : DEFAULT_WATCHLIST,
          snapshots: saved.snapshots ?? {},
          lastSyncAt: saved.lastSyncAt ?? null,
          initialized: true,
          hydrated: false,
          syncing: false,
          quoteError: null,
          marketSyncing: false,
          marketError: null,
        };
      },
      onRehydrateStorage: () => () => {
        const state = useStore.getState();
        if (!state.initialized) {
          useStore.setState({
            transactions: buildSeed(state.settings),
            initialized: true,
            hydrated: true,
          });
          return;
        }
        useStore.setState({ hydrated: true });
      },
    },
  ),
);
