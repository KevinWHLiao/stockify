import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { T } from '../components/Text';
import { backupFileName, buildBackup, parseBackup } from '../lib/backup';
import { useStore } from '../store/useStore';
import { colors } from '../theme';

function formatBackupTime(value: string | null) {
  if (!value) return '-';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${time.getFullYear()}/${pad(time.getMonth() + 1)}/${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`;
}

async function readPickedText() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file.text();
  return new File(asset.uri).text();
}

export default function BackupScreen() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const restoreLedger = useStore((state) => state.restoreLedger);
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);

  const runBackup = async () => {
    setBusy('backup');
    try {
      const state = useStore.getState();
      const fileData = buildBackup(state);
      const json = JSON.stringify(fileData);
      const name = backupFileName(fileData.exportedAt);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, name);
        if (file.exists) file.delete();
        file.create();
        file.write(json);
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          Alert.alert('無法開啟儲存', '這台裝置沒有可接收備份檔的 App。');
          return;
        }
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: '儲存備份',
          UTI: 'public.json',
        });
      }
      updateSettings({ lastBackupAt: fileData.exportedAt });
    } catch {
      Alert.alert('備份沒有完成', '請再試一次。若要存到 Google Drive，請在分享清單選擇雲端硬碟。');
    } finally {
      setBusy(null);
    }
  };

  const runRestore = async () => {
    setBusy('restore');
    try {
      const text = await readPickedText();
      if (!text) return;
      const parsed = parseBackup(text);
      if ('error' in parsed) {
        Alert.alert('無法還原', parsed.error);
        return;
      }
      const count = parsed.file.transactions.length;
      Alert.alert('還原這份備份？', `會用檔案裡的 ${count} 筆紀錄取代目前的持股與設定。`, [
        { text: '取消', style: 'cancel' },
        {
          text: '還原',
          onPress: () => {
            const problem = restoreLedger(parsed.file);
            if (problem) {
              Alert.alert('無法還原', problem);
              return;
            }
            Alert.alert('已還原', '持股、交易與每日損益已換回這份備份。');
          },
        },
      ]);
    } catch {
      Alert.alert('無法讀取檔案', '請選擇先前存下的 stockify-backup 檔。');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScreenHeader title="備份/還原" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => void runRestore()}
            style={[action, actionIdle]}
          >
            <T style={actionIdleText}>{busy === 'restore' ? '讀取中' : '還原'}</T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => void runBackup()}
            style={[action, actionPrimary]}
          >
            <T style={actionPrimaryText}>{busy === 'backup' ? '準備中' : '備份'}</T>
          </Pressable>
        </View>

        <T style={meta}>上次備份時間：{formatBackupTime(settings.lastBackupAt)}</T>

        <View style={row}>
          <T style={rowLabel}>備份提醒</T>
          <Switch
            value={settings.backupReminder}
            onValueChange={(value) => updateSettings({ backupReminder: value })}
            trackColor={{ true: colors.blue, false: '#3A3D46' }}
          />
        </View>

        <T style={body}>
          安卓版可以把備份檔存進 Google Drive。按下備份後，在系統分享清單選擇「雲端硬碟」或「檔案」，就會用你手機已經登入的 Google 帳戶保存。還原時再從同一個位置把檔案選回來。
        </T>
        <T style={body}>
          安裝新版本時請直接覆蓋，不要先解除安裝，手機裡的持股就會留著。只有刪除 App 才會清掉手機內的資料，那時要用這份備份檔還原。
        </T>
        <T style={body}>提醒您，開發者不會收到你的任何股票記帳資料，請妥善保存備份檔。</T>
      </ScrollView>
    </SafeAreaView>
  );
}

const actions = { flexDirection: 'row' as const, gap: 12 };
const action = { flex: 1, height: 52, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const };
const actionIdle = { backgroundColor: colors.surface };
const actionPrimary = { backgroundColor: colors.blue };
const actionIdleText = { color: colors.text, fontSize: 16, fontWeight: '700' as const };
const actionPrimaryText = { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const };
const meta = { marginTop: 28, color: colors.text, fontSize: 16 };
const row = { marginTop: 22, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const };
const rowLabel = { color: colors.text, fontSize: 16 };
const body = { marginTop: 22, color: colors.subtle, fontSize: 14, lineHeight: 22 };
