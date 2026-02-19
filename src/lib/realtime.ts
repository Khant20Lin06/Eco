import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001/ws';

export interface ChatMessageEventPayload {
  orderId: string;
  message: {
    id: string;
    threadId: string;
    senderUserId: string;
    body: string;
    createdAt: string;
  };
  clientMessageId?: string | null;
}

export interface ChatReadEventPayload {
  orderId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: string;
}

export interface NotificationEventPayload {
  notification: {
    id: string;
    userId: string;
    type: 'ORDER_STATUS_CHANGED' | 'RETURN_STATUS_CHANGED' | 'NEW_MESSAGE';
    title: string;
    body: string;
    payload?: unknown;
    readAt?: string | null;
    createdAt: string;
  };
}

let sharedSocket: Socket | null = null;
let socketToken: string | null = null;

export function getRealtimeSocket(accessToken: string) {
  if (sharedSocket && socketToken === accessToken) {
    return sharedSocket;
  }

  if (sharedSocket) {
    sharedSocket.disconnect();
  }

  socketToken = accessToken;
  sharedSocket = io(WS_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
  });

  return sharedSocket;
}

export function disconnectRealtimeSocket() {
  if (!sharedSocket) {
    return;
  }

  sharedSocket.disconnect();
  sharedSocket = null;
  socketToken = null;
}
