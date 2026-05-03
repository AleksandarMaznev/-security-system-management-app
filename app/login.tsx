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
import { Ionicons } from '@expo/vector-icons';
import { login } from '../lib/api';
import { saveToken } from '../lib/storage';
import { useTheme } from '../lib/theme';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isDark, colors, toggle } = useTheme();

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
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.themeToggle} onPress={toggle} activeOpacity={0.7}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.accent }]}>SECSYS</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Admin Management Portal</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>USERNAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.text }]}
            placeholder="Enter username"
            placeholderTextColor={colors.placeholderText}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>PASSWORD</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.text }]}
            placeholder="Enter password"
            placeholderTextColor={colors.placeholderText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }, loading && styles.buttonDisabled]}
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
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  themeToggle: {
    position: 'absolute',
    top: 48,
    right: 28,
    padding: 8,
  },
  header: { marginBottom: 48 },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  form: {},
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  button: {
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
