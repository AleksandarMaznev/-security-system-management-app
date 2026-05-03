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
import { useTheme } from '../../lib/theme';

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
  const { colors } = useTheme();

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
    return colors.textMuted;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.filterRow}>
        <TextInput
          style={[styles.filterInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text }]}
          placeholder="Filter by device ID..."
          placeholderTextColor={colors.placeholderText}
          value={deviceFilter}
          onChangeText={setDeviceFilter}
          onSubmitEditing={applyDeviceFilter}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.filterBtnBg }]} onPress={applyDeviceFilter}>
          <Text style={[styles.filterBtnText, { color: colors.filterBtnText }]}>Apply</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[
              styles.chip,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
              statusFilter === s && { backgroundColor: colors.chipActiveBg, borderColor: colors.accent },
            ]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[
              styles.chipText,
              { color: colors.textSecondary },
              statusFilter === s && { color: colors.accent, fontWeight: '600' },
            ]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
          <TouchableOpacity onPress={applyDeviceFilter} style={[styles.retryBtn, { backgroundColor: colors.filterBtnBg }]}>
            <Text style={[styles.retryText, { color: colors.filterBtnText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={commands}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const color = statusColor(item.status);
            return (
              <View style={[styles.row, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.rowTop}>
                  <Text style={[styles.command, { color: colors.text }]} numberOfLines={1}>
                    {item.command}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.statusText, { color }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={[styles.mono, { color: colors.textSecondary }]}>Device: {item.device_id}</Text>
                {item.payload && Object.keys(item.payload).length > 0 && (
                  <Text style={[styles.mono, { color: colors.textSecondary }]} numberOfLines={2}>
                    Payload: {JSON.stringify(item.payload)}
                  </Text>
                )}
                <View style={styles.timeRow}>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    Issued: {new Date(item.issued_at).toLocaleString()}
                  </Text>
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    Expires: {new Date(item.valid_until).toLocaleString()}
                  </Text>
                </View>
                {item.acknowledged_at && (
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    Ack'd: {new Date(item.acknowledged_at).toLocaleString()}
                  </Text>
                )}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.accent} style={{ margin: 16 }} />
            ) : null
          }
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No commands found.</Text>}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  filterRow: { flexDirection: 'row', padding: 12, paddingBottom: 8, gap: 8, alignItems: 'center' },
  filterInput: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  filterBtn: { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  filterBtnText: { fontSize: 13 },
  chipRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  chipText: { fontSize: 12 },
  list: { padding: 12 },
  row: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  command: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  mono: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 2 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaText: { fontSize: 12 },
  errorText: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: {},
  emptyText: { textAlign: 'center', marginTop: 40 },
});
