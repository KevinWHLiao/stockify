import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { T } from '../components/Text';
import { colors } from '../theme';

export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 12 }}>
      <T style={{ fontSize: 18, fontWeight: '700' }}>找不到這個頁面</T>
      <Pressable onPress={() => router.replace('/')}>
        <T style={{ color: colors.blue, fontWeight: '700' }}>回持股頁</T>
      </Pressable>
    </View>
  );
}
