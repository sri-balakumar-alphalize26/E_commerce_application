import { Tabs } from 'expo-router';
import { TabBar } from '../../src/ui/chrome';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
