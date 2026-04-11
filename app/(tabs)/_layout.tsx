import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deleteToken } from '../../lib/storage';

function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    Alert.alert('Sign Out', 'Sign out of SecSys Admin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await deleteToken();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16, padding: 4 }}>
      <Ionicons name="log-out-outline" size={22} color="#e53935" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0d0d0d',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#e53935',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.5 },
        headerStyle: { backgroundColor: '#0d0d0d' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', letterSpacing: 1 },
        headerShadowVisible: false,
        headerRight: () => <LogoutButton />,
      }}
    >
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="commands"
        options={{
          title: 'Commands',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="terminal-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
