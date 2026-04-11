import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../lib/api';
import { saveToken } from '../lib/storage';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!username.trim() || !password) {
      Alert.alert('Error', 'Username and password are required.');
      return;
    }
    setLoading(true);
    try {
      console.log('[login] attempting login for:', username.trim());
      const result = await login(username.trim(), password);
      console.log('[login] response:', JSON.stringify(result));
      const { access_token } = result;
      console.log('[login] saving token...');
      await saveToken(access_token);
      console.log('[login] navigating to tabs...');
      router.replace('/(tabs)/dashboard');
      console.log('[login] navigation called');
    } catch (e: unknown) {
      console.log('[login] error:', e);
      const msg = e instanceof Error ? e.message : 'Invalid credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      console.log('[login] finally — setLoading(false)');
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>SECSYS</Text>
          <Text style={styles.subtitle}>Admin Management Portal</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#444"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#444"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>SIGN IN</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0d0d0d' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  header: { marginBottom: 48 },
  title: {
    color: '#e53935',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
  },
  subtitle: {
    color: '#555',
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  form: {},
  label: {
    color: '#555',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 6,
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  button: {
    backgroundColor: '#e53935',
    borderRadius: 6,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
