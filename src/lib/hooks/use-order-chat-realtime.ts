'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRealtimeSocket } from '../realtime';

type ChatMessage = {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
};

type ChatReadState = {
  userId: string;
  lastReadMessageId: string;
  lastReadAt: string;
};

export function useOrderChatRealtime(accessToken: string | undefined, orderId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reads, setReads] = useState<Record<string, ChatReadState>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken || !orderId) {
      setConnected(false);
      return;
    }

    const socket = getRealtimeSocket(accessToken);

    const handleConnect = () => {
      setConnected(true);
      socket.emit('chat:subscribe', { orderId });
    };
    const handleDisconnect = () => setConnected(false);
    const handleMessage = (payload: { orderId: string; message: ChatMessage }) => {
      if (payload.orderId !== orderId) {
        return;
      }
      setMessages((prev) => {
        if (prev.some((item) => item.id === payload.message.id)) {
          return prev;
        }
        return [...prev, payload.message];
      });
    };
    const handleRead = (payload: {
      orderId: string;
      userId: string;
      lastReadMessageId: string;
      lastReadAt: string;
    }) => {
      if (payload.orderId !== orderId) {
        return;
      }
      setReads((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          lastReadMessageId: payload.lastReadMessageId,
          lastReadAt: payload.lastReadAt,
        },
      }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:message', handleMessage);
    socket.on('chat:read', handleRead);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:message', handleMessage);
      socket.off('chat:read', handleRead);
    };
  }, [accessToken, orderId]);

  const sendMessage = useCallback(
    (body: string, clientMessageId?: string) => {
      if (!accessToken || !orderId) {
        return;
      }
      const socket = getRealtimeSocket(accessToken);
      socket.emit('chat:send', { orderId, body, clientMessageId });
    },
    [accessToken, orderId]
  );

  const markRead = useCallback(
    (messageId?: string) => {
      if (!accessToken || !orderId) {
        return;
      }
      const socket = getRealtimeSocket(accessToken);
      socket.emit('chat:mark-read', { orderId, messageId });
    },
    [accessToken, orderId]
  );

  const readStates = useMemo(() => Object.values(reads), [reads]);

  return {
    connected,
    messages,
    setMessages,
    readStates,
    sendMessage,
    markRead,
  };
}
