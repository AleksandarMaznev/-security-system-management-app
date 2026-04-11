import { API_BASE_URL, DEVICE_API_KEY } from './config';
import { getToken } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  role: 'standard' | 'admin';
  active: boolean;
  enrolled_by: string;
  enrolled_at: string;
}

export interface Log {
  id: string;
  fingerprint_id: number;
  device_id: string;
  timestamp: string;
  result: 'success' | 'fail';
  role_at_time: string;
}

export interface Command {
  id: string;
  device_id: string;
  command: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'acknowledged' | 'expired';
  issued_at: string;
  valid_until: string;
  acknowledged_at: string | null;
}

export interface Device {
  device_id: string;
  location: string | null;
  last_seen: string | null;
  firmware_version: string | null;
  status: string | null;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function authFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error ?? body.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

async function deviceFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const apiKey = DEVICE_API_KEY;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error ?? body.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(
  username: string,
  password: string,
): Promise<{ access_token: string; expires_in: string }> {
  const url = `${API_BASE_URL}/api/mobile/login`;
  console.log('[api.login] POST', url);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log('[api.login] aborting — 10s timeout reached');
    controller.abort();
  }, 10000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });
  } catch (e) {
    console.log('[api.login] fetch threw:', e);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  console.log('[api.login] status:', res.status);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log('[api.login] error body (raw):', text);
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    throw new Error(body.error as string ?? `HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Admin endpoints (JWT) ────────────────────────────────────────────────────

export async function getUsers(): Promise<{ users: User[] }> {
  return authFetch('/api/mobile/users') as Promise<{ users: User[] }>;
}

export async function getLogs(params: {
  device_id?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ logs: Log[] }> {
  const q = new URLSearchParams();
  if (params.device_id) q.set('device_id', params.device_id);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return authFetch(`/api/mobile/logs${qs ? `?${qs}` : ''}`) as Promise<{ logs: Log[] }>;
}

export async function getCommands(params: {
  device_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ commands: Command[] }> {
  const q = new URLSearchParams();
  if (params.device_id) q.set('device_id', params.device_id);
  if (params.status) q.set('status', params.status);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return authFetch(`/api/mobile/commands${qs ? `?${qs}` : ''}`) as Promise<{ commands: Command[] }>;
}

// ─── Device endpoints (API key) ───────────────────────────────────────────────

export async function getDevices(device_id?: string): Promise<{ devices: Device[] }> {
  const qs = device_id ? `?device_id=${encodeURIComponent(device_id)}` : '';
  return deviceFetch(`/api/devices/status${qs}`) as Promise<{ devices: Device[] }>;
}

export interface ActionResult {
  success: boolean;
  devices_notified: number;
  credentials?: { username: string; password: string };
}

async function userAction(id: string, action: 'promote' | 'demote' | 'delete'): Promise<ActionResult> {
  return authFetch('/api/mobile/user-action', {
    method: 'POST',
    body: JSON.stringify({ id, action }),
  }) as Promise<ActionResult>;
}

export async function getProfile(): Promise<{ username: string; name: string }> {
  return authFetch('/api/mobile/profile') as Promise<{ username: string; name: string }>;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await authFetch('/api/mobile/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  });
}

export const promoteUser = (id: string) => userAction(id, 'promote');
export const demoteUser  = (id: string) => userAction(id, 'demote');
export const deleteUser  = (id: string) => userAction(id, 'delete');
