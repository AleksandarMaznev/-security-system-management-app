import { Stack } from 'expo-router';

export default function UsersStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0d0d0d' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'User Detail' }} />
    </Stack>
  );
}
