import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ScreenHeader } from '../components/ScreenHeader';
import { FieldInput, T } from '../components/Text';
import { findSymbol } from '../data/symbols';
import { usePortfolio } from '../hooks/usePortfolio';
import { calcCommission, calcTax } from '../lib/fees';
import { createId, formatInt, parseNum } from '../lib/format';
import { isValidDate, shiftDate, todayTaipei } from '../lib/time';
import { searchSymbols } from '../services/quotes';
import { useStore } from '../store/useStore';
import type { AssetType, Market, SymbolInfo, Transaction, TxType } from '../types';
import { colors } from '../theme';

const TYPES: { id: TxType; label: string }[] = [
  { id: 'buy', label: '買進' },
  { id: 'sell', label: '賣出' },
  { id: 'cash_dividend', label: '股息' },
  { id: 'stock_dividend', label: '配股' },
];

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AddScreen() {
  const params = useLocalSearchParams<{ type?: string; symbol?: string; id?: string }>();
  const editId = one(params.id);
  const existing = useStore((state) => state.transactions.find((tx) => tx.id === editId));
  const settings = useStore((state) => state.settings);
  const addTransaction = useStore((state) => state.addTransaction);
  const updateTransaction = useStore((state) => state.updateTransaction);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const { views } = usePortfolio();

  const presetSymbol = one(params.symbol) ?? '';
  const presetType = one(params.type);
  const initialType: TxType = TYPES.some((item) => item.id === presetType) ? (presetType as TxType) : 'buy';
  const known = findSymbol(presetSymbol);

  const [type, setType] = useState<TxType>(existing?.type ?? initialType);
  const [symbol, setSymbol] = useState(existing?.symbol ?? presetSymbol);
  const [name, setName] = useState(existing?.name ?? known?.name ?? '');
  const [market, setMarket] = useState<Market>(existing?.market ?? known?.market ?? 'tse');
  const [assetType, setAssetType] = useState<AssetType>(existing?.assetType ?? known?.assetType ?? 'stock');
  const [date, setDate] = useState(existing?.date ?? todayTaipei());
  const [sharesText, setSharesText] = useState(existing ? String(existing.shares || '') : '');
  const [priceText, setPriceText] = useState(existing && existing.type !== 'cash_dividend' ? String(existing.price || '') : '');
  const [amountText, setAmountText] = useState(existing?.type === 'cash_dividend' ? String(Math.round(existing.amount)) : '');
  const [perShareText, setPerShareText] = useState(existing?.type === 'cash_dividend' ? String(Number(existing.price.toFixed(4))) : '');
  const [divMode, setDivMode] = useState<'total' | 'per_share'>('total');
  const [feeText, setFeeText] = useState(existing ? String(existing.fee || 0) : '');
  const [taxText, setTaxText] = useState(existing ? String(existing.tax || 0) : '');
  const [feeEdited, setFeeEdited] = useState(Boolean(existing));
  const [taxEdited, setTaxEdited] = useState(Boolean(existing));
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

  const holding = views.find((item) => item.symbol === symbol);
  const shares = parseNum(sharesText);
  const price = parseNum(priceText);

  useEffect(() => {
    if (feeEdited || (type !== 'buy' && type !== 'sell')) return;
    if (!(shares > 0) || !(price >= 0)) return;
    setFeeText(String(calcCommission(shares * price, settings)));
  }, [feeEdited, price, settings, shares, type]);

  useEffect(() => {
    if (taxEdited || type !== 'sell') return;
    if (!(shares > 0) || !(price >= 0)) return;
    setTaxText(String(calcTax(shares * price, assetType)));
  }, [assetType, price, shares, taxEdited, type]);

  const dividendTotal = useMemo(() => {
    if (divMode === 'total') return parseNum(amountText);
    const perShare = parseNum(perShareText);
    if (!(perShare > 0) || !(shares > 0)) return Number.NaN;
    return Math.round(perShare * shares * 100) / 100;
  }, [amountText, divMode, perShareText, shares]);

  const save = () => {
    if (!symbol || !name) {
      setError('請先選擇股票');
      return;
    }
    if (!isValidDate(date)) {
      setError('日期請用 YYYY-MM-DD');
      return;
    }
    const tx = buildTransaction();
    if (!tx) return;
    const message = existing ? updateTransaction(tx) : addTransaction(tx);
    if (message) {
      setError(message);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    router.back();
  };

  const buildTransaction = (): Transaction | null => {
    const base = {
      id: existing?.id ?? createId(),
      symbol,
      name,
      market,
      assetType,
      date,
      note: note.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    if (type === 'buy' || type === 'sell') {
      if (!(shares > 0) || !(price >= 0)) {
        setError('請輸入股數與價格');
        return null;
      }
      const fee = parseNum(feeText);
      const tax = type === 'sell' ? parseNum(taxText) : 0;
      if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(tax) || tax < 0) {
        setError('請輸入正確的手續費與交易稅');
        return null;
      }
      return { ...base, type, shares, price, amount: 0, fee, tax };
    }
    if (type === 'cash_dividend') {
      if (!(dividendTotal > 0)) {
        setError('請輸入股息金額');
        return null;
      }
      const perShare = shares > 0 ? dividendTotal / shares : parseNum(perShareText) || 0;
      return {
        ...base,
        type,
        shares: shares > 0 ? shares : 0,
        price: perShare,
        amount: dividendTotal,
        fee: 0,
        tax: 0,
      };
    }
    if (!(shares > 0)) {
      setError('請輸入配股股數');
      return null;
    }
    return { ...base, type: 'stock_dividend', shares, price: 0, amount: 0, fee: 0, tax: 0 };
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('刪除這筆紀錄？', '刪除後會依剩餘紀錄重算持股與損益。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          const message = deleteTransaction(existing.id);
          if (message) {
            setError(message);
            return;
          }
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScreenHeader title={existing ? '編輯紀錄' : '新增紀錄'} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={typeRow}>
          {TYPES.map((item) => (
            <Pressable key={item.id} onPress={() => { setType(item.id); setError(''); }} style={[typeChip, type === item.id && typeChipOn]}>
              <T style={[typeText, type === item.id && typeTextOn]}>{item.label}</T>
            </Pressable>
          ))}
        </View>
        <T style={help}>{helpText(type)}</T>

        <T style={fieldLabel}>股票</T>
        <Pressable style={picker} onPress={() => setPicking(true)}>
          <T style={{ fontSize: 16, color: symbol ? colors.text : colors.muted, fontWeight: '700' }}>
            {symbol ? `${symbol} ${name}` : '選擇代號或名稱'}
          </T>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        {holding ? <T style={holdingHint}>目前持股 {formatInt(holding.shares)} 股</T> : null}

        <View style={assetRow}>
          <AssetChip label="一般股票" active={assetType === 'stock'} onPress={() => setAssetType('stock')} />
          <AssetChip label="ETF" active={assetType === 'etf'} onPress={() => setAssetType('etf')} />
        </View>
        <T style={tiny}>ETF 賣出交易稅 0.1%，一般股票 0.3%。代號 00 開頭會先視為 ETF。</T>

        <T style={fieldLabel}>日期</T>
        <FieldInput value={date} onChangeText={setDate} autoCapitalize="none" keyboardType="numbers-and-punctuation" />
        <View style={quickRow}>
          <Quick label="今天" onPress={() => setDate(todayTaipei())} />
          <Quick label="昨天" onPress={() => setDate(shiftDate(todayTaipei(), -1))} />
          {type === 'sell' && holding ? (
            <Quick
              label="全部持股"
              onPress={() => {
                setSharesText(String(holding.shares));
              }}
            />
          ) : null}
          {(type === 'cash_dividend' || type === 'stock_dividend') && holding ? (
            <Quick label="以目前股數" onPress={() => setSharesText(String(holding.shares))} />
          ) : null}
        </View>

        {type === 'cash_dividend' ? (
          <>
            <View style={quickRow}>
              <Quick label="總金額" onPress={() => setDivMode('total')} active={divMode === 'total'} />
              <Quick label="每股" onPress={() => setDivMode('per_share')} active={divMode === 'per_share'} />
            </View>
            {divMode === 'total' ? (
              <>
                <T style={fieldLabel}>股息總額</T>
                <FieldInput value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="例如 12500" />
              </>
            ) : (
              <>
                <T style={fieldLabel}>每股股息</T>
                <FieldInput value={perShareText} onChangeText={setPerShareText} keyboardType="decimal-pad" placeholder="例如 1.2" />
              </>
            )}
            <T style={fieldLabel}>配息股數</T>
            <FieldInput value={sharesText} onChangeText={setSharesText} keyboardType="decimal-pad" placeholder="用來計算每股，可填當時持股" />
            {dividendTotal > 0 ? <T style={tiny}>這筆股息收入 {formatInt(dividendTotal)} 元</T> : null}
          </>
        ) : (
          <>
            <T style={fieldLabel}>{type === 'stock_dividend' ? '配股股數' : '股數'}</T>
            <FieldInput value={sharesText} onChangeText={setSharesText} keyboardType="decimal-pad" placeholder="例如 1000" />
          </>
        )}

        {type === 'buy' || type === 'sell' ? (
          <>
            <T style={fieldLabel}>價格</T>
            <FieldInput value={priceText} onChangeText={setPriceText} keyboardType="decimal-pad" placeholder="成交單價" />
            <T style={fieldLabel}>手續費</T>
            <FieldInput
              value={feeText}
              onChangeText={(value) => {
                setFeeEdited(true);
                setFeeText(value);
              }}
              keyboardType="number-pad"
            />
          </>
        ) : null}
        {type === 'sell' ? (
          <>
            <T style={fieldLabel}>證券交易稅</T>
            <FieldInput
              value={taxText}
              onChangeText={(value) => {
                setTaxEdited(true);
                setTaxText(value);
              }}
              keyboardType="number-pad"
            />
          </>
        ) : null}

        <T style={fieldLabel}>備註</T>
        <FieldInput value={note} onChangeText={setNote} placeholder="選填" />
        {error ? <T style={errorText}>{error}</T> : null}

        <Pressable accessibilityRole="button" style={saveButton} onPress={save}>
          <T style={saveText}>{existing ? '儲存修改' : '儲存紀錄'}</T>
        </Pressable>
        {existing ? (
          <Pressable style={deleteButton} onPress={remove}>
            <T style={deleteText}>刪除這筆紀錄</T>
          </Pressable>
        ) : null}
      </ScrollView>
      <SymbolPicker
        visible={picking}
        holdings={views.map((item) => ({ symbol: item.symbol, name: item.name, market: item.market, assetType: item.assetType }))}
        onClose={() => setPicking(false)}
        onSelect={(item) => {
          setSymbol(item.symbol);
          setName(item.name === '自訂代碼' ? item.symbol : item.name);
          setMarket(item.market);
          setAssetType(item.assetType);
          setPicking(false);
          setError('');
        }}
      />
    </SafeAreaView>
  );
}

function helpText(type: TxType) {
  if (type === 'buy') return '買進金額與手續費會加進持股成本。買進均價只看成交價，不含手續費。';
  if (type === 'sell') return '賣出會依當時的平均成本計算已實現損益，並從庫存扣除股數。';
  if (type === 'cash_dividend') return '股息與配息記在這裡。若設定有打開，這筆金額會從成本扣除，成本均價下降，買進均價不變。';
  return '配股會增加股數、總成本不變，所以成本均價下降。買進均價維持原來的買價。';
}

function AssetChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[assetChip, active && assetChipOn]}>
      <T style={{ color: active ? colors.blue : colors.subtle, fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}

function Quick({ label, onPress, active = false }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[quick, active && quickOn]}>
      <T style={{ color: active ? colors.blue : colors.subtle, fontSize: 13 }}>{label}</T>
    </Pressable>
  );
}

function SymbolPicker({
  visible,
  holdings,
  onClose,
  onSelect,
}: {
  visible: boolean;
  holdings: SymbolInfo[];
  onClose: () => void;
  onSelect: (item: SymbolInfo) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolInfo[]>([]);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchSymbols(query).then((items) => {
        if (cancelled) return;
        if (!query.trim() && holdings.length > 0) {
          const ids = new Set(holdings.map((item) => item.symbol));
          setResults([...holdings, ...items.filter((item) => !ids.has(item.symbol))].slice(0, 40));
          return;
        }
        setResults(items);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [holdings, query, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={pickerHead}>
          <T style={{ fontSize: 18, fontWeight: '800' }}>選擇股票</T>
          <Pressable onPress={onClose}>
            <T style={{ color: colors.blue, fontWeight: '700' }}>關閉</T>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <FieldInput autoFocus value={query} onChangeText={setQuery} placeholder="代號或名稱，例如 2330、台積電" autoCapitalize="none" autoCorrect={false} />
        </View>
        <FlatList
          data={results}
          keyExtractor={(item) => item.symbol}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable style={result} onPress={() => onSelect(item)}>
              <View>
                <T style={{ fontSize: 16, fontWeight: '700' }}>{item.name}</T>
                <T style={{ color: colors.muted, marginTop: 2 }}>
                  {item.symbol}・{item.market === 'otc' ? '上櫃' : '上市'}・{item.assetType === 'etf' ? 'ETF' : '股票'}
                </T>
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const typeRow = { flexDirection: 'row' as const, gap: 8 };
const typeChip = { flex: 1, alignItems: 'center' as const, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.chip };
const typeChipOn = { backgroundColor: colors.blue };
const typeText = { color: colors.subtle, fontWeight: '700' as const };
const typeTextOn = { color: '#fff' };
const help = { marginTop: 12, color: colors.subtle, lineHeight: 20 };
const fieldLabel = { marginTop: 16, marginBottom: 8, color: colors.subtle, fontWeight: '700' as const };
const picker = {
  borderWidth: 1,
  borderColor: '#E3E7EE',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 14,
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
};
const holdingHint = { marginTop: 6, color: colors.muted };
const assetRow = { flexDirection: 'row' as const, gap: 8, marginTop: 12 };
const assetChip = { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.chip };
const assetChipOn = { backgroundColor: colors.blueSoft };
const tiny = { marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 };
const quickRow = { flexDirection: 'row' as const, gap: 8, marginTop: 8, flexWrap: 'wrap' as const };
const quick = { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.chip };
const quickOn = { backgroundColor: colors.blueSoft };
const errorText = { marginTop: 14, color: colors.up, fontWeight: '700' as const };
const saveButton = { marginTop: 20, backgroundColor: colors.blue, borderRadius: 14, alignItems: 'center' as const, paddingVertical: 14 };
const saveText = { color: '#fff', fontSize: 17, fontWeight: '800' as const };
const deleteButton = { marginTop: 12, alignItems: 'center' as const, paddingVertical: 12 };
const deleteText = { color: colors.danger, fontWeight: '700' as const };
const pickerHead = { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16 };
const result = { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line };
