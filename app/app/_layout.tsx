import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { PushNotificationSetup } from '@/components/push-notification-setup';
import { AuthProvider } from '@/context/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <PushNotificationSetup />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="event" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
