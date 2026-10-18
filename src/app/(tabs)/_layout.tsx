import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { StockTabBar } from '../../components/TabBar';
import { colors } from '../../theme';

export default function TabLayout() {
  if (Platform.OS === 'web') {
    return (
      <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }} tabBar={() => null}>
        <Tabs.Screen name="index" options={{ title: '持股' }} />
        <Tabs.Screen name="market" options={{ title: '行情' }} />
        <Tabs.Screen name="records" options={{ title: '記錄' }} />
      </Tabs>
    );
  }
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <StockTabBar state={props.state} navigation={props.navigation} />}>
      <Tabs.Screen name="index" options={{ title: '持股' }} />
      <Tabs.Screen name="market" options={{ title: '行情' }} />
      <Tabs.Screen name="records" options={{ title: '記錄' }} />
    </Tabs>
  );
}
