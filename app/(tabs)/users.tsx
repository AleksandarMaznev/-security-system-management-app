import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUsers, promoteUser, demoteUser, deleteUser, User } from '../../lib/api';
import { getToken } from '../../lib/storage';

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

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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
    Promise.all([
      fetchUsers(),
      getCurrentUserId().then(setCurrentUserId),
    ]).finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, []);

  function confirmAction(user: User, action: 'promote' | 'demote' | 'delete') {
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
        {
          text: btn,
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: () => runAction(user, action),
        },
      ],
    );
  }

  async function runAction(user: User, action: 'promote' | 'demote' | 'delete') {
    setPendingId(user.id.toString());
    try {
      if (action === 'promote') {
        const result = await promoteUser(user.id.toString());
        await fetchUsers();
        if (result.credentials) {
          Alert.alert(
            'Admin Credentials Created',
            `Username: ${result.credentials.username}\nPassword: ${result.credentials.password}\n\nWrite these down — the password cannot be recovered.`,
            [{ text: 'OK' }],
          );
        }
      } else if (action === 'demote') {
        await demoteUser(user.id.toString());
        await fetchUsers();
      } else {
        await deleteUser(user.id.toString());
        await fetchUsers();
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#e53935" size="large" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); fetchUsers().finally(() => setLoading(false)); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeUsers = users.filter(u => u.active);
  const inactiveUsers = users.filter(u => !u.active);

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <UserRow
            user={item}
            isPending={pendingId === item.id.toString()}
            isSelf={currentUserId === item.id}
            onPromote={() => confirmAction(item, 'promote')}
            onDemote={() => confirmAction(item, 'demote')}
            onDelete={() => confirmAction(item, 'delete')}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e53935" />
        }
        ListHeaderComponent={
          <View style={styles.statsRow}>
            <StatChip label="Total" value={users.length} />
            <StatChip label="Active" value={activeUsers.length} color="#4caf50" />
            <StatChip label="Admins" value={users.filter(u => u.role === 'admin' && u.active).length} color="#e53935" />
            <StatChip label="Inactive" value={inactiveUsers.length} color="#555" />
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
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

function UserRow({
  user, isPending, isSelf, onPromote, onDemote, onDelete,
}: {
  user: User;
  isPending: boolean;
  isSelf: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.row, !user.active && styles.rowInactive]}>
      <View style={styles.rowTop}>
        <Text style={styles.userName}>
          {user.name || '(unnamed)'}
          {isSelf && <Text style={styles.youLabel}> (You)</Text>}
        </Text>
        <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
          <Text style={[styles.roleText, user.role === 'admin' && styles.roleTextAdmin]}>
            {user.role}
          </Text>
        </View>
        {!user.active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>inactive</Text>
          </View>
        )}
      </View>

      <Text style={styles.userId} numberOfLines={1}>{user.id}</Text>
      <Text style={styles.meta}>
        Enrolled by: {user.enrolled_by || '—'}
        {'  ·  '}
        {new Date(user.enrolled_at).toLocaleDateString()}
      </Text>

      {user.active && !isSelf && (
        <View style={styles.actions}>
          {isPending ? (
            <ActivityIndicator color="#e53935" size="small" />
          ) : (
            <>
              {user.role === 'standard' ? (
                <ActionBtn icon="arrow-up-circle-outline" label="Promote" color="#4caf50" onPress={onPromote} />
              ) : (
                <ActionBtn icon="arrow-down-circle-outline" label="Demote" color="#ff9800" onPress={onDemote} />
              )}
              <ActionBtn icon="trash-outline" label="Delete" color="#e53935" onPress={onDelete} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  center: { flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  row: {
    backgroundColor: '#141414', borderRadius: 10, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e1e1e',
  },
  rowInactive: { opacity: 0.5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  roleBadge: { backgroundColor: '#1e2e1e', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  roleBadgeAdmin: { backgroundColor: '#2e1e1e' },
  roleText: { color: '#4caf50', fontSize: 11, fontWeight: '600' },
  roleTextAdmin: { color: '#e57373' },
  inactiveBadge: { backgroundColor: '#1a1a1a', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  inactiveText: { color: '#555', fontSize: 11 },
  userId: { color: '#444', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 3 },
  meta: { color: '#555', fontSize: 12 },
  actions: {
    flexDirection: 'row', gap: 16, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e1e1e',
    minHeight: 28, alignItems: 'center',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 13, fontWeight: '500' },
  errorText: { color: '#e53935', fontSize: 15, marginBottom: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#aaa' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40 },
  youLabel: { color: '#555', fontSize: 13, fontWeight: '400' },
});

const chipStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#141414', borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e1e1e',
  },
  value: { fontSize: 20, fontWeight: '700' },
  label: { color: '#555', fontSize: 11, marginTop: 2 },
});
