import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { getToken } from '../lib/storage';
import { ThemeProvider, useTheme } from '../lib/theme';
import { useFailedLogNotifications } from '../lib/useFailedLogNotifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutInner() {
  const router = useRouter();
  const segments = useSegments();
  const { isDark } = useTheme();

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useFailedLogNotifications();

  useEffect(() => {
    getToken().then(token => {
      const inTabs = segments[0] === '(tabs)';
      if (!token && inTabs) {
        router.replace('/login');
      } else if (token && !inTabs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/(tabs)/dashboard' as any);
      }
    });
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
