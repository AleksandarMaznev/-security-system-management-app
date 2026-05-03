import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUsers, User } from '../../../lib/api';
import { useTheme } from '../../../lib/theme';

export default function UsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { colors } = useTheme();

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => u.name?.toLowerCase().includes(q));
  }, [users, search]);

  async function fetchUsers() {
    try {
      setError(null);
      const data = await getUsers();
      setUsers(data.users);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load users.');
    }
  }

  useEffect(() => {
    fetchUsers().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, []);

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
          onPress={() => { setLoading(true); fetchUsers().finally(() => setLoading(false)); }}
          style={[styles.retryBtn, { backgroundColor: colors.filterBtnBg }]}
        >
          <Text style={[styles.retryText, { color: colors.filterBtnText }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeUsers = users.filter(u => u.active);
  const inactiveUsers = users.filter(u => !u.active);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/users/${item.id}`)}
            activeOpacity={0.7}
            style={[styles.row, { backgroundColor: colors.bgCard, borderColor: colors.border }, !item.active && styles.rowInactive]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {item.name || '(unnamed)'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.roleBadgeBg }, item.role === 'admin' && { backgroundColor: colors.roleBadgeAdminBg }]}>
                <Text style={[styles.roleText, item.role === 'admin' && styles.roleTextAdmin]}>
                  {item.role}
                </Text>
              </View>
              {!item.active && (
                <View style={[styles.inactiveBadge, { backgroundColor: colors.filterBtnBg }]}>
                  <Text style={[styles.inactiveText, { color: colors.textSecondary }]}>inactive</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Enrolled by: {item.enrolled_by || '—'}
              {'  ·  '}
              {new Date(item.enrolled_at).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.statsRow}>
              <StatChip label="Total" value={users.length} colors={colors} />
              <StatChip label="Active" value={activeUsers.length} color="#4caf50" colors={colors} />
              <StatChip label="Admins" value={users.filter(u => u.role === 'admin' && u.active).length} color={colors.accent} colors={colors} />
              <StatChip label="Inactive" value={inactiveUsers.length} color={colors.textSecondary} colors={colors} />
            </View>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text }]}
              placeholder="Search by name..."
              placeholderTextColor={colors.placeholderText}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {search ? 'No users match your search.' : 'No users found.'}
          </Text>
        }
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  row: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1 },
  rowInactive: { opacity: 0.5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userName: { fontSize: 15, fontWeight: '600', flex: 1 },
  roleBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  roleText: { color: '#4caf50', fontSize: 11, fontWeight: '600' },
  roleTextAdmin: { color: '#e57373' },
  inactiveBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  inactiveText: { fontSize: 11 },
  meta: { fontSize: 12 },
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
