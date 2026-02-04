import { Tabs } from 'expo-router';
import { Blue } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Blue.primary,
        tabBarInactiveTintColor: Blue.muted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Blue.surface,
          borderTopColor: Blue.border,
        },
        tabBarLabelStyle: { fontWeight: '500', fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="interests"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="star.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
