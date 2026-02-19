'use client';

import { useCallback, useEffect, useState } from 'react';
import { disconnectRealtimeSocket, getRealtimeSocket } from '../realtime';

type NotificationItem = {
  id: string;
  userId: string;
  type: 'ORDER_STATUS_CHANGED' | 'RETURN_STATUS_CHANGED' | 'NEW_MESSAGE';
  title: string;
  body: string;
  payload?: unknown;
  readAt?: string | null;
  createdAt: string;
};

export function useNotificationsRealtime(accessToken?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setConnected(false);
      return;
    }

    const socket = getRealtimeSocket(accessToken);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleNewNotification = (payload: { notification: NotificationItem }) => {
      setNotifications((prev) => {
        if (prev.some((item) => item.id === payload.notification.id)) {
          return prev;
        }
        return [payload.notification, ...prev];
      });
    };
    const handleRead = (payload: { notificationId: string; readAt: string }) => {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === payload.notificationId ? { ...item, readAt: payload.readAt } : item
        )
      );
    };
    const handleReadAll = (payload: { readAt: string }) => {
      setNotifications((prev) =>
        prev.map((item) => (item.readAt ? item : { ...item, readAt: payload.readAt }))
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('notifications:new', handleNewNotification);
    socket.on('notifications:read', handleRead);
    socket.on('notifications:read-all', handleReadAll);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('notifications:new', handleNewNotification);
      socket.off('notifications:read', handleRead);
      socket.off('notifications:read-all', handleReadAll);
    };
  }, [accessToken]);

  const markRead = useCallback(
    (notificationId: string) => {
      if (!accessToken) {
        return;
      }
      const socket = getRealtimeSocket(accessToken);
      socket.emit('notifications:mark-read', { notificationId });
    },
    [accessToken]
  );

  const markAllRead = useCallback(() => {
    if (!accessToken) {
      return;
    }
    const socket = getRealtimeSocket(accessToken);
    socket.emit('notifications:mark-all-read', {});
  }, [accessToken]);

  const disconnect = useCallback(() => {
    disconnectRealtimeSocket();
  }, []);

  return {
    notifications,
    setNotifications,
    connected,
    markRead,
    markAllRead,
    disconnect,
  };
}
