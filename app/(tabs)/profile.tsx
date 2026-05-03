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
import { Ionicons } from '@expo/vector-icons';
import { getProfile, changePassword } from '../../lib/api';
import { useTheme } from '../../lib/theme';

export default function ProfileScreen() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const { isDark, colors, toggle } = useTheme();

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
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Row label="Name" value={name || '—'} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Row label="Username" value={username} mono colors={colors} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.themeRow}>
              <View style={styles.themeRowLeft}>
                <Ionicons
                  name={isDark ? 'moon-outline' : 'sunny-outline'}
                  size={18}
                  color={colors.textSecondary}
                  style={styles.themeIcon}
                />
                <Text style={[styles.themeLabel, { color: colors.text }]}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.themeToggleBtn, { backgroundColor: colors.filterBtnBg, borderColor: colors.border }]}
                onPress={toggle}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={15}
                  color={colors.accent}
                />
                <Text style={[styles.themeToggleText, { color: colors.accent }]}>
                  Switch to {isDark ? 'Light' : 'Dark'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CHANGE PASSWORD</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CURRENT PASSWORD</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="Enter current password"
              placeholderTextColor={colors.placeholderText}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NEW PASSWORD</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="Enter new password"
              placeholderTextColor={colors.placeholderText}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CONFIRM NEW PASSWORD</Text>
            <TextInput
              style={[styles.input, styles.inputLast, { backgroundColor: colors.bgInput, borderColor: colors.borderLight, color: colors.text }]}
              placeholder="Repeat new password"
              placeholderTextColor={colors.placeholderText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }, saving && styles.buttonDisabled]}
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

function Row({ label, value, mono = false, colors }: {
  label: string;
  value: string;
  mono?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={rowStyles.container}>
      <Text style={[rowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: colors.text }, mono && rowStyles.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  divider: { height: 1, marginVertical: 12 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  themeRowLeft: { flexDirection: 'row', alignItems: 'center' },
  themeIcon: { marginRight: 10 },
  themeLabel: { fontSize: 14, fontWeight: '500' },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  themeToggleText: { fontSize: 13, fontWeight: '600' },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLast: { marginBottom: 4 },
  button: {
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
  label: { fontSize: 13 },
  value: { fontSize: 14, fontWeight: '500' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13 },
});
