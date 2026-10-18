import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { T } from './Text';

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

const META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  index: { label: '持股', icon: 'grid-outline', active: 'grid' },
  market: { label: '行情', icon: 'pulse-outline', active: 'pulse' },
  records: { label: '記錄', icon: 'time-outline', active: 'time' },
};

export function StockTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: 'transparent', paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8 }}>
      <View style={dock}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = META[route.name] ?? { label: route.name, icon: 'ellipse-outline' as const, active: 'ellipse' as const };
          return (
            <Pressable key={route.key} accessibilityRole="button" style={tab} onPress={() => navigation.navigate(route.name)}>
              <Ionicons name={focused ? meta.active : meta.icon} size={22} color={focused ? colors.blue : colors.muted} />
              <T style={[label, { color: focused ? colors.blue : colors.muted, fontWeight: focused ? '800' : '600' }]}>{meta.label}</T>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" accessibilityLabel="新增紀錄" onPress={() => router.push('/add')} style={add}>
          <Ionicons name="add" size={26} color="#090A0C" />
        </Pressable>
      </View>
    </View>
  );
}

const dock = {
  marginHorizontal: 16,
  height: 64,
  borderRadius: 32,
  backgroundColor: colors.surface,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  paddingLeft: 6,
  paddingRight: 8,
  ...(Platform.OS === 'web'
    ? { boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)' }
    : {
        shadowColor: '#000000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }),
};
const tab = { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 2, height: '100%' as const };
const label = { fontSize: 11 };
const add = {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: colors.ink,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  marginLeft: 4,
};
