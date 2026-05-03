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
import { useTheme } from '../../lib/theme';

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
  const { colors } = useTheme();

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
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.accent, fontSize: 15 }}>{error ?? 'Failed to load.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>OVERVIEW</Text>
      <View style={styles.chipRow}>
        <StatChip label="Users" value={stats.totalUsers} colors={colors} />
        <StatChip label="Active" value={stats.activeUsers} color="#4caf50" colors={colors} />
        <StatChip label="Admins" value={stats.adminCount} color={colors.accent} colors={colors} />
        <StatChip label="Devices" value={stats.activeDevices} color="#64b5f6" colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LAST 24 HOURS</Text>
      <View style={styles.chipRow}>
        <StatChip label="Events" value={stats.events24h} colors={colors} />
        <StatChip label="Success" value={stats.success24h} color="#4caf50" colors={colors} />
        <StatChip label="Failures" value={stats.fail24h} color={colors.accent} colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>COMMANDS</Text>
      <View style={styles.chipRow}>
        <StatChip label="Pending" value={stats.pendingCommands} color={stats.pendingCommands > 0 ? '#ff9800' : colors.textSecondary} colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RECENT FAILURES</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {stats.recentFailures.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No recent failures.</Text>
        ) : (
          stats.recentFailures.map((log, i) => (
            <View key={log.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.logRow}>
                <View style={[styles.resultBadge, { backgroundColor: colors.accent + '22' }]}>
                  <Text style={[styles.resultText, { color: colors.accent }]}>FAIL</Text>
                </View>
                <View style={styles.logMeta}>
                  <Text style={[styles.logDevice, { color: colors.textSecondary }]}>{log.device_id}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{new Date(log.timestamp).toLocaleString()}</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>#{log.fingerprint_id}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatChip({ label, value, color, colors }: {
  label: string;
  value: number;
  color?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[chipStyles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[chipStyles.value, { color: color ?? colors.textSecondary }]}>{value}</Text>
      <Text style={[chipStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  card: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 24 },
  divider: { height: 1, marginVertical: 10 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  resultText: { fontSize: 11, fontWeight: '700' },
  logMeta: { flex: 1 },
  logDevice: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});

const chipStyles = StyleSheet.create({
  container: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1 },
  value: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 11, marginTop: 2 },
});
