import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatYi } from '../lib/format';
import type { InstitutionalFlow } from '../lib/institutional';
import { fetchInstitutional } from '../services/institutional';
import { colors, pnlColor } from '../theme';
import { T } from './Text';

export function InstitutionalBoard() {
  const [flow, setFlow] = useState<InstitutionalFlow | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty'>('loading');

  useEffect(() => {
    let cancelled = false;
    void fetchInstitutional().then((next) => {
      if (cancelled) return;
      setFlow(next);
      setState(next ? 'ready' : 'empty');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cells = flow
    ? [
        ['外資', flow.foreign],
        ['投信', flow.trust],
        ['自營商', flow.dealer],
        ['合計', flow.total],
      ]
    : [];
  const date = flow?.date && flow.date.length === 8 ? `${flow.date.slice(4, 6)}/${flow.date.slice(6, 8)}` : '';

  return (
    <View style={{ marginTop: 8 }}>
      <T style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
        {state === 'loading' ? '讀取三大法人…' : state === 'empty' ? '三大法人暫時讀不到。' : `${date} 買賣差額，單位是億元。自營商含自行買賣和避險。`}
      </T>
      {cells.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {cells.map(([label, value]) => (
            <View key={String(label)} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' }}>
              <T style={{ color: colors.muted, fontSize: 12 }}>{label}</T>
              <T style={{ marginTop: 6, fontWeight: '800', fontSize: 14, color: pnlColor(Number(value)) }} numberOfLines={1} adjustsFontSizeToFit>
                {formatYi(Number(value))}
              </T>
            </View>
          ))}
        </View>
      ) : null}
      <T style={{ marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 }}>這是上市現貨的法人買賣差額，不是叫你跟著買或賣。</T>
    </View>
  );
}
