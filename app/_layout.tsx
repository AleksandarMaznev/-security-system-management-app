import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getToken } from '../lib/storage';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getToken().then(token => {
      const inTabs = segments[0] === '(tabs)';
      if (!token && inTabs) {
        router.replace('/login');
      } else if (token && !inTabs) {
        router.replace('/(tabs)/users');
      }
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
