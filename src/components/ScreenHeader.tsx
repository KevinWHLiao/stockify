import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '../theme';
import { T } from './Text';

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={header}>
      <Pressable accessibilityRole="button" accessibilityLabel="返回" hitSlop={12} onPress={() => router.back()} style={side}>
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </Pressable>
      <T style={titleStyle}>{title}</T>
      <View style={side}>{right}</View>
    </View>
  );
}

const header = {
  height: 52,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  paddingHorizontal: 8,
};
const side = { width: 44, alignItems: 'center' as const, justifyContent: 'center' as const };
const titleStyle = { flex: 1, textAlign: 'center' as const, fontSize: 18, fontWeight: '700' as const, color: colors.text };
