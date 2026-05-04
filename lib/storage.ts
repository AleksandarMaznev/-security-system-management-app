import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'admin_jwt';
const LAST_FAIL_LOG_KEY = 'last_fail_log_ts';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getLastFailLogTimestamp(): Promise<string | null> {
  return SecureStore.getItemAsync(LAST_FAIL_LOG_KEY);
}

export async function saveLastFailLogTimestamp(ts: string): Promise<void> {
  await SecureStore.setItemAsync(LAST_FAIL_LOG_KEY, ts);
}
