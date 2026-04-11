import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { getUserDetail, getLogs, User, UserFingerprint, Log } from '../../../lib/api';

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  const [user, setUser] = useState<User | null>(null);
  const [fingerprints, setFingerprints] = useState<UserFingerprint[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    fetchAll().finally(() => setLoading(false));
  }, [id]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#e53935" size="large" /></View>;
  }

  if (error || !user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'User not found.'}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); fetchAll().finally(() => setLoading(false)); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" />}
    >
      {/* Info card */}
      <Text style={styles.sectionTitle}>INFO</Text>
      <View style={styles.card}>
        <Row label="Name" value={user.name || '(unnamed)'} />
        <Divider />
        <Row label="Role">
          <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
            <Text style={[styles.roleText, user.role === 'admin' && styles.roleTextAdmin]}>{user.role}</Text>
          </View>
        </Row>
        <Divider />
        <Row label="Status">
          <View style={[styles.statusDot, { backgroundColor: user.active ? '#4caf50' : '#e53935' }]} />
          <Text style={styles.rowValue}>{user.active ? 'Active' : 'Inactive'}</Text>
        </Row>
        <Divider />
        <Row label="Enrolled by" value={user.enrolled_by || '—'} />
        <Divider />
        <Row label="Enrolled" value={new Date(user.enrolled_at).toLocaleString()} />
      </View>

      {/* Enrolled devices */}
      <Text style={styles.sectionTitle}>ENROLLED ON</Text>
      <View style={styles.card}>
        {fingerprints.length === 0 ? (
          <Text style={styles.emptyText}>No enrolled devices.</Text>
        ) : (
          fingerprints.map((fp, i) => (
            <View key={fp.id}>
              {i > 0 && <Divider />}
              <View style={styles.fpRow}>
                <View style={styles.fpLeft}>
                  <Text style={styles.deviceId}>{fp.device_id}</Text>
                  {fp.devices?.location && (
                    <Text style={styles.deviceMeta}>{fp.devices.location}</Text>
                  )}
                  <Text style={styles.deviceMeta}>
                    Fingerprint slot: {fp.fingerprint_id}
                    {'  ·  '}
                    Enrolled: {new Date(fp.enrolled_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.fpStatus, { backgroundColor: fp.active ? '#4caf5022' : '#e5393522' }]}>
                  <Text style={[styles.fpStatusText, { color: fp.active ? '#4caf50' : '#e53935' }]}>
                    {fp.active ? 'active' : 'inactive'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent access */}
      <Text style={styles.sectionTitle}>RECENT ACCESS</Text>
      <View style={styles.card}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No access history.</Text>
        ) : (
          logs.map((log, i) => (
            <View key={log.id}>
              {i > 0 && <Divider />}
              <View style={styles.logRow}>
                <View style={[styles.resultBadge, { backgroundColor: log.result === 'success' ? '#4caf5022' : '#e5393522' }]}>
                  <Text style={[styles.resultText, { color: log.result === 'success' ? '#4caf50' : '#e53935' }]}>
                    {log.result.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.logMeta}>
                  <Text style={styles.logDevice}>{log.device_id}</Text>
                  <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.rowContainer}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children ? (
        <View style={styles.rowRight}>{children}</View>
      ) : (
        <Text style={styles.rowValue}>{value}</Text>
      )}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  center: { flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: '#444', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: '#141414', borderRadius: 10, borderWidth: 1,
    borderColor: '#1e1e1e', padding: 14, marginBottom: 24,
  },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginVertical: 10 },

  // Info rows
  rowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: '#555', fontSize: 13 },
  rowValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleBadge: { backgroundColor: '#1e2e1e', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  roleBadgeAdmin: { backgroundColor: '#2e1e1e' },
  roleText: { color: '#4caf50', fontSize: 11, fontWeight: '600' },
  roleTextAdmin: { color: '#e57373' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // Fingerprint rows
  fpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fpLeft: { flex: 1 },
  deviceId: {
    color: '#fff', fontSize: 13, fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 2,
  },
  deviceMeta: { color: '#555', fontSize: 12 },
  fpStatus: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 8 },
  fpStatusText: { fontSize: 11, fontWeight: '600' },

  // Log rows
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  resultText: { fontSize: 11, fontWeight: '700' },
  logMeta: { flex: 1 },
  logDevice: { color: '#888', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  logTime: { color: '#555', fontSize: 12 },

  errorText: { color: '#e53935', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#aaa' },
  emptyText: { color: '#555', fontSize: 13 },
});
