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
import { getLogs, Log } from '../../lib/api';
import { useTheme } from '../../lib/theme';

const PAGE_SIZE = 50;

export default function LogsScreen() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const { colors } = useTheme();

  async function fetchLogs(reset: boolean, filter: string) {
    try {
      setError(null);
      const off = reset ? 0 : offsetRef.current;
      const data = await getLogs({
        device_id: filter || undefined,
        limit: PAGE_SIZE,
        offset: off,
      });
      const items = data.logs;
      if (reset) {
        setLogs(items);
        offsetRef.current = items.length;
      } else {
        setLogs(prev => [...prev, ...items]);
        offsetRef.current += items.length;
      }
      hasMoreRef.current = items.length === PAGE_SIZE;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load logs.');
    }
  }

  useEffect(() => {
    offsetRef.current = 0;
    hasMoreRef.current = true;
    fetchLogs(true, '').finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    offsetRef.current = 0;
    hasMoreRef.current = true;
    await fetchLogs(true, appliedFilter);
    setRefreshing(false);
  }, [appliedFilter]);

  async function applyFilter() {
    setLoading(true);
    setAppliedFilter(deviceFilter.trim());
    offsetRef.current = 0;
    hasMoreRef.current = true;
    await fetchLogs(true, deviceFilter.trim());
    setLoading(false);
  }

  async function loadMore() {
    if (!hasMoreRef.current || loadingMore) return;
    setLoadingMore(true);
    await fetchLogs(false, appliedFilter);
    setLoadingMore(false);
  }

  function resultColor(result: string): string {
    if (result === 'success') return '#4caf50';
    if (result === 'fail') return colors.accent;
    return '#ff9800';
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.filterRow, { backgroundColor: colors.bg }]}>
        <TextInput
          style={[styles.filterInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text }]}
          placeholder="Filter by device ID..."
          placeholderTextColor={colors.placeholderText}
          value={deviceFilter}
          onChangeText={setDeviceFilter}
          onSubmitEditing={applyFilter}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.filterBtnBg }]} onPress={applyFilter}>
          <Text style={[styles.filterBtnText, { color: colors.filterBtnText }]}>Apply</Text>
        </TouchableOpacity>
        {appliedFilter ? (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: colors.filterBtnBg }]}
            onPress={() => {
              setDeviceFilter('');
              setAppliedFilter('');
              setLoading(true);
              offsetRef.current = 0;
              hasMoreRef.current = true;
              fetchLogs(true, '').finally(() => setLoading(false));
            }}
          >
            <Text style={[styles.clearBtnText, { color: colors.accent }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
          <TouchableOpacity onPress={applyFilter} style={[styles.retryBtn, { backgroundColor: colors.filterBtnBg }]}>
            <Text style={[styles.retryText, { color: colors.filterBtnText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.rowTop}>
                <View style={[styles.resultBadge, { backgroundColor: resultColor(item.result) + '20' }]}>
                  <Text style={[styles.resultText, { color: resultColor(item.result) }]}>
                    {item.result.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.time, { color: colors.textSecondary }]}>{new Date(item.timestamp).toLocaleString()}</Text>
              </View>
              <Text style={[styles.mono, { color: colors.textSecondary }]}>Fingerprint: {item.fingerprint_id}</Text>
              <Text style={[styles.mono, { color: colors.textSecondary }]}>Device: {item.device_id}</Text>
              {!!item.role_at_time && (
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>Role: {item.role_at_time}</Text>
              )}
            </View>
          )}
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
          ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No logs found.</Text>}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8, alignItems: 'center' },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  filterBtn: { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  filterBtnText: { fontSize: 13 },
  clearBtn: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10 },
  clearBtnText: { fontSize: 13 },
  list: { padding: 12 },
  row: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  resultText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  time: { fontSize: 12 },
  mono: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  metaText: { fontSize: 12, marginTop: 2 },
  errorText: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: {},
  emptyText: { textAlign: 'center', marginTop: 40 },
});
