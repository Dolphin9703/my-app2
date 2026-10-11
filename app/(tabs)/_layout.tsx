import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Waves, BookHeart, Settings, MapPinned } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.ocean[600],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: {
          backgroundColor: Colors.neutral[0],
          borderTopColor: Colors.neutral[200],
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 0,
          lineHeight: 14,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '물때',
          tabBarIcon: ({ size, color }) => <Waves size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '지도',
          tabBarIcon: ({ size, color }) => <MapPinned size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: '조과일기',
          tabBarIcon: ({ size, color }) => <BookHeart size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ size, color }) => <Settings size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
