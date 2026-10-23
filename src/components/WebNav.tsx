import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useStore } from '../store/useStore';
import { colors } from '../theme';
import { Logo } from './Logo';
import { T } from './Text';

const LINKS = [
  { href: '/', label: '持股', match: (path: string) => path === '/' },
  { href: '/market', label: '行情', match: (path: string) => path.startsWith('/market') },
  { href: '/records', label: '記錄', match: (path: string) => path.startsWith('/records') },
] as const;

export function WebNav() {
  const path = usePathname();
  const hidden = useStore((state) => state.settings.hideReturns);
  const updateSettings = useStore((state) => state.updateSettings);
  return (
    <View style={bar}>
      <Logo />
      <View style={links}>
        {LINKS.map((link) => {
          const on = link.match(path);
          return (
            <Pressable key={link.href} accessibilityRole="button" onPress={() => router.navigate(link.href)} style={[linkButton, on && linkOn]}>
              <T style={[linkText, on && linkTextOn]}>{link.label}</T>
            </Pressable>
          );
        })}
      </View>
      <View style={actions}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/analysis')} style={textAction}>
          <T style={actionText}>分析</T>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/backup')} style={textAction}>
          <T style={actionText}>備份</T>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/add')} style={add}>
          <Ionicons name="add" size={18} color="#090A0C" />
          <T style={addText}>新增紀錄</T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? '顯示報酬' : '隱藏報酬'}
          onPress={() => updateSettings({ hideReturns: !hidden })}
          style={icon}
        >
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="說明與設定" onPress={() => router.push('/settings')} style={icon}>
          <Ionicons name="options-outline" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const bar = {
  height: 64,
  paddingHorizontal: 20,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 20,
  borderBottomWidth: 1,
  borderBottomColor: colors.line,
  backgroundColor: colors.bg,
};
const links = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, flex: 1 };
const linkButton = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 };
const linkOn = { backgroundColor: colors.surface };
const linkText = { color: colors.muted, fontSize: 15, fontWeight: '700' as const };
const linkTextOn = { color: colors.text };
const actions = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 };
const textAction = { paddingHorizontal: 10, paddingVertical: 8 };
const actionText = { color: colors.subtle, fontSize: 14, fontWeight: '700' as const };
const add = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
  backgroundColor: colors.ink,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8,
};
const addText = { color: '#090A0C', fontSize: 14, fontWeight: '800' as const };
const icon = {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.surface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
