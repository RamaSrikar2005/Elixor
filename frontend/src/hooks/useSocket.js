import { useEffect } from 'react';
import { onEvent } from '../services/socket.js';
import { useAppStore } from '../store/appStore.js';

export function useSocket() {
  const { loadDashboard, addNotification } = useAppStore();

  useEffect(() => {
    const offNotif  = onEvent('notification',    ({ type, payload }) =>
      addNotification(type, payload?.message || payload?.text || '')
    );
    const offUpdate = onEvent('dashboard:update', () => loadDashboard());

    return () => {
      offNotif?.();
      offUpdate?.();
    };
  }, []);
}
