import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { getProfile, changePassword } from '../../lib/api';

export default function ProfileScreen() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then(p => { setUsername(p.username); setName(p.name); })
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoadingProfile(false));
  }, []);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password updated.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return <View style={styles.center}><ActivityIndicator color="#e53935" size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <Row label="Name" value={name || '—'} />
            <View style={styles.divider} />
            <Row label="Username" value={username} mono />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHANGE PASSWORD</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor="#444"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#444"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              style={[styles.input, styles.inputLast]}
              placeholder="Repeat new password"
              placeholderTextColor="#444"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>UPDATE PASSWORD</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, mono && rowStyles.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0d0d0d' },
  center: { flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 16,
  },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginVertical: 12 },
  fieldLabel: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 6,
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLast: { marginBottom: 4 },
  button: {
    backgroundColor: '#e53935',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
});

const rowStyles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#555', fontSize: 13 },
  value: { color: '#fff', fontSize: 14, fontWeight: '500' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13 },
});
