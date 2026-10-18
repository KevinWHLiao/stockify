import { Tabs } from 'expo-router';
import { StockTabBar } from '../../components/TabBar';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <StockTabBar state={props.state} navigation={props.navigation} />}>
      <Tabs.Screen name="index" options={{ title: '持股' }} />
      <Tabs.Screen name="market" options={{ title: '行情' }} />
      <Tabs.Screen name="records" options={{ title: '記錄' }} />
    </Tabs>
  );
}
