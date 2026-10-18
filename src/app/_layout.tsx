import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { T } from '../components/Text';
import { WebNav } from '../components/WebNav';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import { useQuoteSync } from '../hooks/useQuoteSync';
import { useStore } from '../store/useStore';
import { colors } from '../theme';
import * as SystemUI from 'expo-system-ui';

export default function RootLayout() {
  const hydrated = useStore((state) => state.hydrated);
  useQuoteSync();
  usePriceAlerts();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, []);

  if (!hydrated) {
    return (
      <View style={splash}>
        <StatusBar style="light" />
        <T style={splashText}>我的持股</T>
      </View>
    );
  }

  return (
    <View style={canvas}>
      <StatusBar style="light" />
      <View style={frame}>
        {Platform.OS === 'web' ? <WebNav /> : null}
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="settings" />
            <Stack.Screen name="analysis" />
            <Stack.Screen name="backup" />
            <Stack.Screen name="stock/[symbol]" />
            <Stack.Screen name="quote/[symbol]" />
            <Stack.Screen name="day/[date]" />
          </Stack>
        </View>
      </View>
    </View>
  );
}

const canvas = {
  flex: 1,
  backgroundColor: Platform.OS === 'web' ? colors.canvas : colors.bg,
};
const frame =
  Platform.OS === 'web'
    ? { flex: 1, width: '100%' as const, maxWidth: 1180, alignSelf: 'center' as const, backgroundColor: colors.bg }
    : { flex: 1, backgroundColor: colors.bg };
const splash = { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.bg };
const splashText = { fontSize: 32, fontWeight: '800' as const, color: colors.text };
