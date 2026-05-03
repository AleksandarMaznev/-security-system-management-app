import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserDetail, getLogs, promoteUser, demoteUser, deleteUser, User, UserFingerprint, Log } from '../../../lib/api';
import { getToken } from '../../../lib/storage';
import { useTheme } from '../../../lib/theme';

function getCurrentUserId(): Promise<number | null> {
  return getToken().then(token => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id ?? null;
    } catch {
      return null;
    }
  });
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [fingerprints, setFingerprints] = useState<UserFingerprint[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const { colors } = useTheme();

  async function fetchAll() {
    try {
      setError(null);
      const [detailRes, logsRes] = await Promise.all([
        getUserDetail(Number(id)),
        getLogs({ user_id: Number(id), limit: 20 }),
      ]);
      setUser(detailRes.user);
      setFingerprints(detailRes.fingerprints);
      setLogs(logsRes.logs);
      navigation.setOptions({ title: detailRes.user.name || 'User Detail' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load user.');
    }
  }

  useEffect(() => {
    Promise.all([
      fetchAll(),
      getCurrentUserId().then(setCurrentUserId),
    ]).finally(() => setLoading(false));
  }, [id]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  function confirmAction(action: 'promote' | 'demote' | 'delete') {
    if (!user) return;
    const labels = {
      promote: { title: 'Promote to Admin', btn: 'Promote' },
      demote:  { title: 'Demote to Standard', btn: 'Demote' },
      delete:  { title: 'Delete User', btn: 'Delete' },
    };
    const { title, btn } = labels[action];
    Alert.alert(
      title,
      `${user.name || user.id.toString()}\n\nThis will queue the command on all devices the user is enrolled on.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: btn, style: action === 'delete' ? 'destructive' : 'default', onPress: () => runAction(action) },
      ],
    );
  }

  async function runAction(action: 'promote' | 'demote' | 'delete') {
    if (!user) return;
    setPending(true);
    try {
      if (action === 'promote') {
        const result = await promoteUser(user.id.toString());
        await fetchAll();
        if (result.credentials) {
          Alert.alert(
            'Admin Credentials Created',
            `Username: ${result.credentials.username}\nPassword: ${result.credentials.password}\n\nWrite these down — the password cannot be recovered.`,
            [{ text: 'OK' }],
          );
        }
      } else if (action === 'demote') {
        await demoteUser(user.id.toString());
        await fetchAll();
      } else {
        await deleteUser(user.id.toString());
        router.back();
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.accent }]}>{error ?? 'User not found.'}</Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchAll().finally(() => setLoading(false)); }}
          style={[styles.retryBtn, { backgroundColor: colors.filterBtnBg }]}
        >
          <Text style={[styles.retryText, { color: colors.filterBtnText }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSelf = currentUserId === user.id;
  const canAct = user.active && !isSelf;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>INFO</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Row label="Name" value={user.name || '(unnamed)'} colors={colors} />
        <Divider colors={colors} />
        <Row label="Role" colors={colors}>
          <View style={[styles.roleBadge, { backgroundColor: colors.roleBadgeBg }, user.role === 'admin' && { backgroundColor: colors.roleBadgeAdminBg }]}>
            <Text style={[styles.roleText, user.role === 'admin' && styles.roleTextAdmin]}>{user.role}</Text>
          </View>
        </Row>
        <Divider colors={colors} />
        <Row label="Status" colors={colors}>
          <View style={[styles.statusDot, { backgroundColor: user.active ? '#4caf50' : colors.accent }]} />
          <Text style={[styles.rowValue, { color: colors.text }]}>{user.active ? 'Active' : 'Inactive'}</Text>
        </Row>
        <Divider colors={colors} />
        <Row label="Enrolled by" value={user.enrolled_by || '—'} colors={colors} />
        <Divider colors={colors} />
        <Row label="Enrolled" value={new Date(user.enrolled_at).toLocaleString()} colors={colors} />
      </View>

      {canAct && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACTIONS</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {pending ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.actionsRow}>
                {user.role === 'standard' ? (
                  <ActionBtn
                    icon="arrow-up-circle-outline"
                    label="Promote to Admin"
                    color="#4caf50"
                    colors={colors}
                    onPress={() => confirmAction('promote')}
                  />
                ) : (
                  <ActionBtn
                    icon="arrow-down-circle-outline"
                    label="Demote to Standard"
                    color="#ff9800"
                    colors={colors}
                    onPress={() => confirmAction('demote')}
                  />
                )}
                <ActionBtn
                  icon="trash-outline"
                  label="Delete User"
                  color={colors.accent}
                  colors={colors}
                  onPress={() => confirmAction('delete')}
                />
              </View>
            )}
          </View>
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ENROLLED ON</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {fingerprints.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No enrolled devices.</Text>
        ) : (
          fingerprints.map((fp, i) => (
            <View key={fp.id}>
              {i > 0 && <Divider colors={colors} />}
              <View style={styles.fpRow}>
                <View style={styles.fpLeft}>
                  <Text style={[styles.deviceId, { color: colors.text }]}>{fp.device_id}</Text>
                  {fp.devices?.location && (
                    <Text style={[styles.deviceMeta, { color: colors.textSecondary }]}>{fp.devices.location}</Text>
                  )}
                  <Text style={[styles.deviceMeta, { color: colors.textSecondary }]}>
                    Fingerprint slot: {fp.fingerprint_id}
                    {'  ·  '}
                    Enrolled: {new Date(fp.enrolled_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.fpStatus, { backgroundColor: fp.active ? '#4caf5022' : colors.accent + '22' }]}>
                  <Text style={[styles.fpStatusText, { color: fp.active ? '#4caf50' : colors.accent }]}>
                    {fp.active ? 'active' : 'inactive'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RECENT ACCESS</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {logs.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No access history.</Text>
        ) : (
          logs.map((log, i) => (
            <View key={log.id}>
              {i > 0 && <Divider colors={colors} />}
              <View style={styles.logRow}>
                <View style={[styles.resultBadge, { backgroundColor: log.result === 'success' ? '#4caf5022' : colors.accent + '22' }]}>
                  <Text style={[styles.resultText, { color: log.result === 'success' ? '#4caf50' : colors.accent }]}>
                    {log.result.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.logMeta}>
                  <Text style={[styles.logDevice, { color: colors.textSecondary }]}>{log.device_id}</Text>
                  <Text style={[styles.logTime, { color: colors.textSecondary }]}>{new Date(log.timestamp).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ActionBtn({ icon, label, color, colors, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: color + '18', borderColor: color + '44' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({ label, value, children, colors }: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.rowContainer}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children ? (
        <View style={styles.rowRight}>{children}</View>
      ) : (
        <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
      )}
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 24 },
  divider: { height: 1, marginVertical: 10 },
  rowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 14, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  roleText: { color: '#4caf50', fontSize: 11, fontWeight: '600' },
  roleTextAdmin: { color: '#e57373' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  fpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fpLeft: { flex: 1 },
  deviceId: {
    fontSize: 13, fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 2,
  },
  deviceMeta: { fontSize: 12 },
  fpStatus: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 8 },
  fpStatusText: { fontSize: 11, fontWeight: '600' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  resultText: { fontSize: 11, fontWeight: '700' },
  logMeta: { flex: 1 },
  logDevice: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  logTime: { fontSize: 12 },
  errorText: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: {},
  emptyText: { fontSize: 13 },
});
