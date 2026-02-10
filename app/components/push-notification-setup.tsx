import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/context/auth-context';
import { registerPushToken } from '@/lib/api';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
  }),
});

export function PushNotificationSetup() {
  const router = useRouter();
  const { token, user } = useAuth();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const eventId = response.notification.request.content.data?.eventId;
      if (eventId && typeof eventId === 'string') {
        router.push(`/event/${eventId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

  const register = useCallback(async () => {
    if (!token || !user) {
      if (__DEV__) console.log('[push] skip register: missing user/token');
      return;
    }
    if (Platform.OS === 'web') {
      if (__DEV__) console.log('[push] skip register: web platform');
      return;
    }
    if (!Device.isDevice) {
      if (__DEV__) console.log('[push] skip register: not a physical device');
      return;
    }

    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== 'granted') {
        if (__DEV__) console.log('[push] notifications permission not granted:', final);
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const pushTokenResult = await Notifications.getExpoPushTokenAsync({
        projectId: projectId ?? undefined,
      });
      const pushToken = pushTokenResult?.data;
      if (!pushToken) {
        if (__DEV__) console.warn('[push] getExpoPushTokenAsync returned no token');
        return;
      }

      // Avoid re-registering the same token every time
      if (registeredRef.current === pushToken) {
        if (__DEV__) console.log('[push] token already registered, skipping');
        return;
      }
      registeredRef.current = pushToken;

      await registerPushToken(pushToken, token);
      if (__DEV__) console.log('[push] token registered with server:', pushToken);
    } catch (e) {
      if (__DEV__) console.warn('[push] register failed', e instanceof Error ? e.message : e);
    }
  }, [token, user]);

  useEffect(() => {
    register();
  }, [register]);

  return null;
}
