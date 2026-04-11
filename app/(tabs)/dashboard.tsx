import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { getUsers, getLogs, getCommands, getDevices, Log } from '../../lib/api';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  activeDevices: number;
  events24h: number;
  success24h: number;
  fail24h: number;
  pendingCommands: number;
  recentFailures: Log[];
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    try {
      setError(null);
      const [usersRes, logsRes, commandsRes, devicesRes] = await Promise.all([
        getUsers(),
        getLogs({ limit: 100 }),
        getCommands({ status: 'pending', limit: 100 }),
        getDevices(),
      ]);

      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recent = logsRes.logs.filter(l => new Date(l.timestamp).getTime() > cutoff);

      setStats({
        totalUsers: usersRes.users.length,
        activeUsers: usersRes.users.filter(u => u.active).length,
        adminCount: usersRes.users.filter(u => u.role === 'admin' && u.active).length,
        activeDevices: devicesRes.devices.filter(d => d.status === 'active').length,
        events24h: recent.length,
        success24h: recent.filter(l => l.result === 'success').length,
        fail24h: recent.filter(l => l.result === 'fail').length,
        pendingCommands: commandsRes.commands.length,
        recentFailures: logsRes.logs.filter(l => l.result === 'fail').slice(0, 5),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
    }
  }

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#e53935" size="large" /></View>;
  }

  if (error || !stats) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Failed to load.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" />}
    >
      {/* Users + Devices */}
      <Text style={styles.sectionTitle}>OVERVIEW</Text>
      <View style={styles.chipRow}>
        <StatChip label="Users" value={stats.totalUsers} />
        <StatChip label="Active" value={stats.activeUsers} color="#4caf50" />
        <StatChip label="Admins" value={stats.adminCount} color="#e53935" />
        <StatChip label="Devices" value={stats.activeDevices} color="#64b5f6" />
      </View>

      {/* Last 24 hours */}
      <Text style={styles.sectionTitle}>LAST 24 HOURS</Text>
      <View style={styles.chipRow}>
        <StatChip label="Events" value={stats.events24h} />
        <StatChip label="Success" value={stats.success24h} color="#4caf50" />
        <StatChip label="Failures" value={stats.fail24h} color="#e53935" />
      </View>

      {/* Commands */}
      <Text style={styles.sectionTitle}>COMMANDS</Text>
      <View style={styles.chipRow}>
        <StatChip label="Pending" value={stats.pendingCommands} color={stats.pendingCommands > 0 ? '#ff9800' : '#888'} />
      </View>

      {/* Recent failures */}
      <Text style={styles.sectionTitle}>RECENT FAILURES</Text>
      <View style={styles.card}>
        {stats.recentFailures.length === 0 ? (
          <Text style={styles.emptyText}>No recent failures.</Text>
        ) : (
          stats.recentFailures.map((log, i) => (
            <View key={log.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.logRow}>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultText}>FAIL</Text>
                </View>
                <View style={styles.logMeta}>
                  <Text style={styles.logDevice}>{log.device_id}</Text>
                  <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</Text>
                </View>
                <Text style={styles.fingerprintId}>#{log.fingerprint_id}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatChip({ label, value, color = '#888' }: { label: string; value: number; color?: string }) {
  return (
    <View style={chipStyles.container}>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  center: { flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: '#444', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  card: {
    backgroundColor: '#141414', borderRadius: 10, borderWidth: 1,
    borderColor: '#1e1e1e', padding: 14, marginBottom: 24,
  },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginVertical: 10 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBadge: { backgroundColor: '#e5393522', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  resultText: { color: '#e53935', fontSize: 11, fontWeight: '700' },
  logMeta: { flex: 1 },
  logDevice: {
    color: '#888', fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logTime: { color: '#555', fontSize: 12 },
  fingerprintId: { color: '#444', fontSize: 12 },
  emptyText: { color: '#555', fontSize: 13 },
  errorText: { color: '#e53935', fontSize: 15 },
});

const chipStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#141414', borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e1e1e',
  },
  value: { fontSize: 20, fontWeight: '700' },
  label: { color: '#555', fontSize: 11, marginTop: 2 },
});
