import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { getDevices, Device } from '../../lib/api';
import { useTheme } from '../../lib/theme';

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  async function fetchDevices() {
    try {
      setError(null);
      const data = await getDevices();
      setDevices(data.devices);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load devices.');
    }
  }

  useEffect(() => {
    fetchDevices().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  }, []);

  function isOnline(status: string | null): boolean {
    return status === 'active';
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchDevices().finally(() => setLoading(false)); }}
          style={[styles.retryBtn, { backgroundColor: colors.filterBtnBg }]}
        >
          <Text style={[styles.retryText, { color: colors.filterBtnText }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const online = devices.filter(d => isOnline(d.status));
  const offline = devices.filter(d => !isOnline(d.status));

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={devices}
        keyExtractor={item => item.device_id}
        renderItem={({ item }) => {
          const itemOnline = isOnline(item.status);
          return (
            <View style={[styles.row, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.rowTop}>
                <View style={[styles.dot, { backgroundColor: itemOnline ? '#4caf50' : colors.accent }]} />
                <Text style={[styles.deviceId, { color: colors.text }]}>{item.device_id}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: itemOnline ? '#4caf5022' : colors.accent + '22' },
                ]}>
                  <Text style={[styles.statusText, { color: itemOnline ? '#4caf50' : colors.accent }]}>
                    {itemOnline ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </View>
              </View>
              {!!item.location && (
                <Text style={[styles.lastSeen, { color: colors.textSecondary }]}>Location: {item.location}</Text>
              )}
              <Text style={[styles.lastSeen, { color: colors.textSecondary }]}>
                Last seen: {item.last_seen ? new Date(item.last_seen).toLocaleString() : 'never'}
              </Text>
              {!!item.firmware_version && (
                <Text style={[styles.lastSeen, { color: colors.textSecondary }]}>Firmware: {item.firmware_version}</Text>
              )}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <View style={styles.statsRow}>
            <StatChip label="Total" value={devices.length} colors={colors} />
            <StatChip label="Online" value={online.length} color="#4caf50" colors={colors} />
            <StatChip label="Offline" value={offline.length} color={colors.accent} colors={colors} />
          </View>
        }
        ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No devices found.</Text>}
        contentContainerStyle={styles.list}
      />
    </View>
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  list: { padding: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  row: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  deviceId: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  lastSeen: { fontSize: 12, marginLeft: 19 },
  errorText: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: {},
  emptyText: { textAlign: 'center', marginTop: 40 },
});

const chipStyles = StyleSheet.create({
  container: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1 },
  value: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 11, marginTop: 2 },
});
