import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { getCommands, Command } from '../../lib/api';

const PAGE_SIZE = 50;
const STATUS_FILTERS = ['all', 'pending', 'acknowledged', 'expired'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function CommandsScreen() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState('');
  const [appliedDevice, setAppliedDevice] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  async function fetchCommands(reset: boolean, device: string, status: StatusFilter) {
    try {
      setError(null);
      const off = reset ? 0 : offsetRef.current;
      const data = await getCommands({
        device_id: device || undefined,
        status: status === 'all' ? undefined : status,
        limit: PAGE_SIZE,
        offset: off,
      });
      const items = data.commands;
      if (reset) {
        setCommands(items);
        offsetRef.current = items.length;
      } else {
        setCommands(prev => [...prev, ...items]);
        offsetRef.current += items.length;
      }
      hasMoreRef.current = items.length === PAGE_SIZE;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load commands.');
    }
  }

  useEffect(() => {
    offsetRef.current = 0;
    hasMoreRef.current = true;
    fetchCommands(true, '', 'all').finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    offsetRef.current = 0;
    hasMoreRef.current = true;
    fetchCommands(true, appliedDevice, statusFilter).finally(() => setLoading(false));
  }, [statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    hasMoreRef.current = true;
    await fetchCommands(true, appliedDevice, statusFilter);
    setRefreshing(false);
  }, [appliedDevice, statusFilter]);

  async function applyDeviceFilter() {
    setAppliedDevice(deviceFilter.trim());
    setLoading(true);
    offsetRef.current = 0;
    hasMoreRef.current = true;
    await fetchCommands(true, deviceFilter.trim(), statusFilter);
    setLoading(false);
  }

  async function loadMore() {
    if (!hasMoreRef.current || loadingMore) return;
    setLoadingMore(true);
    await fetchCommands(false, appliedDevice, statusFilter);
    setLoadingMore(false);
  }

  function statusColor(status: string): string {
    if (status === 'pending') return '#ff9800';
    if (status === 'acknowledged') return '#4caf50';
    return '#444';
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by device ID..."
          placeholderTextColor="#444"
          value={deviceFilter}
          onChangeText={setDeviceFilter}
          onSubmitEditing={applyDeviceFilter}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.filterBtn} onPress={applyDeviceFilter}>
          <Text style={styles.filterBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#e53935" size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={applyDeviceFilter} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={commands}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const color = statusColor(item.status);
            return (
              <View style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.command} numberOfLines={1}>
                    {item.command}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.statusText, { color }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.mono}>Device: {item.device_id}</Text>
                {item.payload && Object.keys(item.payload).length > 0 && (
                  <Text style={styles.mono} numberOfLines={2}>
                    Payload: {JSON.stringify(item.payload)}
                  </Text>
                )}
                <View style={styles.timeRow}>
                  <Text style={styles.metaText}>
                    Issued: {new Date(item.issued_at).toLocaleString()}
                  </Text>
                  <Text style={styles.metaText}>
                    Expires: {new Date(item.valid_until).toLocaleString()}
                  </Text>
                </View>
                {item.acknowledged_at && (
                  <Text style={styles.metaText}>
                    Ack'd: {new Date(item.acknowledged_at).toLocaleString()}
                  </Text>
                )}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#e53935" style={{ margin: 16 }} />
            ) : null
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No commands found.</Text>}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  filterRow: { flexDirection: 'row', padding: 12, paddingBottom: 8, gap: 8, alignItems: 'center' },
  filterInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 6,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  filterBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterBtnText: { color: '#aaa', fontSize: 13 },
  chipRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  chip: {
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  chipActive: { backgroundColor: '#1a0000', borderColor: '#e53935' },
  chipText: { color: '#555', fontSize: 12 },
  chipTextActive: { color: '#e53935', fontWeight: '600' },
  list: { padding: 12 },
  row: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  command: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  mono: {
    color: '#777',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaText: { color: '#555', fontSize: 12 },
  errorText: { color: '#e53935', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#aaa' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40 },
});
