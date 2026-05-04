import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import { getLogs } from './api';
import { getLastFailLogTimestamp, saveLastFailLogTimestamp } from './storage';
import { getToken } from './storage';

const POLL_INTERVAL_MS = 15_000;

export function useFailedLogNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  async function checkForFailedLogs() {
    const token = await getToken();
    if (!token) return;

    try {
      let lastTs = await getLastFailLogTimestamp();

      // On first ever run, baseline is right now — only notify about future fails
      if (!lastTs) {
        lastTs = new Date().toISOString();
        await saveLastFailLogTimestamp(lastTs);
        return;
      }

      const { logs } = await getLogs({ limit: 20, offset: 0 });
      const failedLogs = logs
        .filter(l => l.result === 'fail' && new Date(l.timestamp).getTime() > new Date(lastTs!).getTime())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (failedLogs.length === 0) return;

      await saveLastFailLogTimestamp(failedLogs[0].timestamp);

      const count = failedLogs.length;
      const first = failedLogs[0];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: count === 1 ? 'Failed Access Attempt' : `${count} Failed Access Attempts`,
          body: count === 1
            ? `Device ${first.device_id} — fingerprint ${first.fingerprint_id}`
            : `Latest: Device ${first.device_id} — fingerprint ${first.fingerprint_id}`,
          sound: true,
        },
        trigger: null,
      });
    } catch {
      // Silently ignore — network may be unavailable
    }
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startPolling() {
    if (intervalRef.current) return;
    checkForFailedLogs();
    intervalRef.current = setInterval(checkForFailedLogs, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    startPolling();

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'active' && prev !== 'active') {
        // Re-check immediately when returning to foreground
        stopPolling();
        startPolling();
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, []);
}
