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

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return <View style={styles.center}><ActivityIndicator color="#e53935" size="large" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchDevices().finally(() => setLoading(false)); }}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const online = devices.filter(d => isOnline(d.status));
  const offline = devices.filter(d => !isOnline(d.status));

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        keyExtractor={item => item.device_id}
        renderItem={({ item }) => {
          const online = isOnline(item.status);
          return (
            <View style={styles.row}>
              <View style={styles.rowTop}>
                <View style={[styles.dot, { backgroundColor: online ? '#4caf50' : '#e53935' }]} />
                <Text style={styles.deviceId}>{item.device_id}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: online ? '#4caf5022' : '#e5393522' },
                ]}>
                  <Text style={[styles.statusText, { color: online ? '#4caf50' : '#e53935' }]}>
                    {online ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </View>
              </View>
              {!!item.location && (
                <Text style={styles.lastSeen}>Location: {item.location}</Text>
              )}
              <Text style={styles.lastSeen}>
                Last seen: {item.last_seen ? new Date(item.last_seen).toLocaleString() : 'never'}
              </Text>
              {!!item.firmware_version && (
                <Text style={styles.lastSeen}>Firmware: {item.firmware_version}</Text>
              )}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" />
        }
        ListHeaderComponent={
          <View style={styles.statsRow}>
            <StatChip label="Total" value={devices.length} />
            <StatChip label="Online" value={online.length} color="#4caf50" />
            <StatChip label="Offline" value={offline.length} color="#e53935" />
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No devices found.</Text>}
        contentContainerStyle={styles.list}
      />
    </View>
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
  center: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  list: { padding: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  row: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  deviceId: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  lastSeen: { color: '#555', fontSize: 12, marginLeft: 19 },
  errorText: { color: '#e53935', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#aaa' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40 },
});

const chipStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  value: { fontSize: 20, fontWeight: '700' },
  label: { color: '#555', fontSize: 11, marginTop: 2 },
});
