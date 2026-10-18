import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { FieldInput, T } from '../components/Text';
import { STATUTORY_COMMISSION_RATE } from '../lib/fees';
import { useStore } from '../store/useStore';
import { colors } from '../theme';

export default function SettingsScreen() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const clearAll = useStore((state) => state.clearAll);
  const loadDemo = useStore((state) => state.loadDemo);
  const [zhe, setZhe] = useState(String(Math.round(settings.commissionDiscount * 100) / 10));
  const [minimum, setMinimum] = useState(String(settings.minCommission));
  const [alertPct, setAlertPct] = useState(String(settings.alertPercent));

  const applyFee = () => {
    const discount = Number(zhe);
    const minFee = Number(minimum);
    if (!(discount > 0) || discount > 10 || !Number.isFinite(minFee) || minFee < 0) {
      setZhe(String(Math.round(settings.commissionDiscount * 100) / 10));
      setMinimum(String(settings.minCommission));
      return;
    }
    updateSettings({ commissionDiscount: discount / 10, minCommission: Math.floor(minFee) });
  };

  const toggleAlert = async (value: boolean) => {
    if (!value) {
      updateSettings({ priceAlert: false });
      return;
    }
    if (Platform.OS !== 'web') {
      const Notifications = await import('expo-notifications');
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('price-alerts', {
          name: '漲跌提醒',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const status = current.status === 'granted' ? current.status : (await Notifications.requestPermissionsAsync()).status;
      if (status !== 'granted') {
        Alert.alert('沒有通知權限', '請到手機設定允許「我的持股」發送通知，漲跌提醒才會出現。');
        return;
      }
    }
    updateSettings({ priceAlert: true });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScreenHeader title="說明與設定" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <T style={h1}>報價</T>
        <T style={body}>
          股價來自臺灣證券交易所公開行情。交易日 9:00 到 13:30 約每 20 秒更新，其餘時間約每 3 分鐘更新，回到 App 也會再抓一次。這不是券商下單功能，數字只供自己對帳。
        </T>
        <T style={h1}>漲跌提醒</T>
        <View style={row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <T style={h1}>持股與自選</T>
            <T style={body}>打開後，今日漲跌幅達到門檻會通知一次。App 在前景或剛回到前景時才會檢查，同一檔同一方向一天只提醒一次。</T>
          </View>
          <Switch
            value={settings.priceAlert}
            onValueChange={(value) => void toggleAlert(value)}
            trackColor={{ true: colors.blue, false: '#3A3D46' }}
          />
        </View>
        <T style={label}>漲跌超過幾個百分點</T>
        <FieldInput
          value={alertPct}
          onChangeText={setAlertPct}
          onBlur={() => {
            const next = Number(alertPct);
            if (!(next > 0) || next > 20) {
              setAlertPct(String(settings.alertPercent));
              return;
            }
            updateSettings({ alertPercent: Math.round(next * 10) / 10 });
          }}
          keyboardType="decimal-pad"
        />
        <T style={h1}>損益怎麼算</T>
        <T style={body}>
          未實現損益＝市值 − 持股成本 − 預估賣出手續費與證券交易稅。成本含買進手續費；若開啟下方開關，現金股息會再把成本往下扣。報酬率用買進均價當分母，買進均價不含手續費，也不會因為配息、配股被稀釋。
        </T>
        <T style={h1}>手續費折扣</T>
        <T style={label}>幾折（10 代表不打折）</T>
        <FieldInput value={zhe} onChangeText={setZhe} onBlur={applyFee} keyboardType="decimal-pad" />
        <T style={label}>最低手續費（元）</T>
        <FieldInput value={minimum} onChangeText={setMinimum} onBlur={applyFee} keyboardType="number-pad" />
        <T style={body}>
          目前賣出手續費率 {(STATUTORY_COMMISSION_RATE * settings.commissionDiscount * 100).toFixed(4)}%。手續費與交易稅都無條件捨去到元。
        </T>
        <View style={row}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <T style={h1}>配息調降成本</T>
            <T style={body}>打開後，股息會從成本扣除，成本均價下降，比較接近長期存股把股息賺回本金的看法。股息收入仍會另外統計。</T>
          </View>
          <Switch
            value={settings.dividendReducesCost}
            onValueChange={(value) => updateSettings({ dividendReducesCost: value })}
            trackColor={{ true: colors.blue, false: '#D5D8DE' }}
          />
        </View>
        <T style={h1}>資料</T>
        <T style={body}>
          庫存存在這台手機。安裝新版本時直接覆蓋即可保留；刪除 App 或換手機前，請先到備份頁把檔案存進 Google Drive。
        </T>
        <Pressable style={button} onPress={() => router.push('/backup')}>
          <T style={link}>備份/還原</T>
        </Pressable>
        <Pressable
          style={button}
          onPress={() => {
            Alert.alert('清除全部資料？', '持股、交易與每日損益都會刪掉，而且無法復原。', [
              { text: '取消', style: 'cancel' },
              {
                text: '清除',
                style: 'destructive',
                onPress: () => {
                  clearAll();
                  router.back();
                },
              },
            ]);
          }}
        >
          <T style={danger}>清除全部資料</T>
        </Pressable>
        <Pressable
          style={button}
          onPress={() => {
            Alert.alert('載入範例持股？', '會取代目前的庫存與紀錄。', [
              { text: '取消', style: 'cancel' },
              {
                text: '載入',
                onPress: () => {
                  loadDemo();
                  router.back();
                },
              },
            ]);
          }}
        >
          <T style={link}>重新載入範例持股</T>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const h1 = { fontSize: 18, fontWeight: '800' as const, color: colors.text, marginTop: 8 };
const body = { marginTop: 8, color: colors.subtle, lineHeight: 22 };
const label = { marginTop: 14, marginBottom: 8, color: colors.subtle, fontWeight: '700' as const };
const row = { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 16 };
const button = { marginTop: 16, paddingVertical: 12 };
const danger = { color: colors.danger, fontWeight: '800' as const, fontSize: 16 };
const link = { color: colors.blue, fontWeight: '800' as const, fontSize: 16 };
