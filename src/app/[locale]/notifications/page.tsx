'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../lib/api';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';
import { useNotificationsRealtime } from '../../../lib/hooks/use-notifications-realtime';

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

type NotificationListResponse = {
  items: NotificationItem[];
  nextCursor?: string | null;
};

type NotificationPayload = {
  orderId?: string;
  returnId?: string;
  threadId?: string;
  messageId?: string;
};

type NotificationsPageProps = {
  params: { locale: string };
};

function buildNotificationHref(
  locale: string,
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN' | null,
  item: NotificationItem
) {
  const payload =
    item.payload && typeof item.payload === 'object'
      ? (item.payload as NotificationPayload)
      : {};

  if (item.type === 'NEW_MESSAGE') {
    return payload.orderId
      ? `/${locale}/chat?orderId=${encodeURIComponent(payload.orderId)}`
      : `/${locale}/chat`;
  }

  if (item.type === 'ORDER_STATUS_CHANGED') {
    if (role === 'VENDOR') {
      return payload.orderId
        ? `/${locale}/vendor/orders?orderId=${encodeURIComponent(payload.orderId)}`
        : `/${locale}/vendor/orders`;
    }
    if (role === 'ADMIN') {
      return payload.orderId
        ? `/${locale}/admin/orders?orderId=${encodeURIComponent(payload.orderId)}`
        : `/${locale}/admin/orders`;
    }
    return payload.orderId
      ? `/${locale}/orders?orderId=${encodeURIComponent(payload.orderId)}`
      : `/${locale}/orders`;
  }

  if (item.type === 'RETURN_STATUS_CHANGED') {
    if (role === 'VENDOR') {
      return payload.returnId
        ? `/${locale}/vendor/returns?returnId=${encodeURIComponent(payload.returnId)}`
        : `/${locale}/vendor/returns`;
    }
    if (role === 'ADMIN') {
      return payload.returnId
        ? `/${locale}/admin/returns?returnId=${encodeURIComponent(payload.returnId)}`
        : `/${locale}/admin/returns`;
    }
    return payload.orderId
      ? `/${locale}/orders?orderId=${encodeURIComponent(payload.orderId)}`
      : `/${locale}/orders`;
  }

  return `/${locale}`;
}

export default function NotificationsPage({ params: { locale } }: NotificationsPageProps) {
  const router = useRouter();
  const { ready, accessToken, role } = useAuthSession();
  const {
    notifications,
    setNotifications,
    connected
  } = useNotificationsRealtime(accessToken);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setError('Please login to view notifications.');
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    listNotifications<NotificationListResponse>({ limit: 20 }, accessToken)
      .then((response) => {
        if (!alive) {
          return;
        }
        setNotifications(response.items ?? []);
        setNextCursor(response.nextCursor ?? null);
        setError(null);
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setError('Failed to load notifications.');
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [ready, accessToken, setNotifications]);

  async function onMarkRead(id: string) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    try {
      const updated = await markNotificationRead<NotificationItem>(id, accessToken);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: updated.readAt ?? new Date().toISOString() } : item)),
      );
    } catch {
      setError('Failed to mark notification as read.');
    } finally {
      setWorking(false);
    }
  }

  async function onOpenNotification(item: NotificationItem) {
    if (!accessToken) {
      return;
    }

    if (!item.readAt) {
      try {
        const updated = await markNotificationRead<NotificationItem>(item.id, accessToken);
        setNotifications((prev) =>
          prev.map((entry) =>
            entry.id === item.id ? { ...entry, readAt: updated.readAt ?? new Date().toISOString() } : entry
          )
        );
      } catch {
        setError('Failed to mark notification as read.');
      }
    }

    const href = buildNotificationHref(locale, role, item);
    router.push(href);
  }

  async function onMarkAllRead() {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    try {
      const response = await markAllNotificationsRead<{ readAt?: string }>(accessToken);
      const readAt = response.readAt ?? new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => (item.readAt ? item : { ...item, readAt })),
      );
    } catch {
      setError('Failed to mark all notifications as read.');
    } finally {
      setWorking(false);
    }
  }

  async function onLoadMore() {
    if (!accessToken || !nextCursor || working) {
      return;
    }
    setWorking(true);
    try {
      const response = await listNotifications<NotificationListResponse>(
        { limit: 20, cursor: nextCursor },
        accessToken,
      );
      setNotifications((prev) => [...prev, ...(response.items ?? [])]);
      setNextCursor(response.nextCursor ?? null);
      setError(null);
    } catch {
      setError('Failed to load more notifications.');
    } finally {
      setWorking(false);
    }
  }

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <section className="space-y-4">
      <div className="surface p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#181f46]">Notifications</h1>
            <p className="mt-1 text-sm text-[#5d6486]">
              Realtime updates for orders, returns, and messages.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`chip ${connected ? 'chip-success' : 'chip-warn'}`}>
              {connected ? 'Realtime connected' : 'Realtime offline'}
            </span>
            <span className="rounded-full border border-[#d7e2ff] bg-white px-3 py-1 text-xs font-semibold text-[#2f428f]">
              Unread: {unreadCount}
            </span>
            <button
              className="rounded-lg border border-[#c6d5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3349ad]"
              type="button"
              onClick={onMarkAllRead}
              disabled={working || unreadCount === 0}
            >
              Mark all read
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="surface border-[#ffd7dd] bg-[#fff5f6] p-4 text-sm text-[#b12f43]">{error}</div>
      ) : null}

      {loading ? (
        <div className="surface p-4 text-sm text-[#5d6486]">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="surface p-4 text-sm text-[#5d6486]">No notifications yet.</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`surface p-4 transition ${
                item.readAt ? 'bg-white' : 'border-[#bfd0ff] bg-[#f6f9ff]'
              }`}
              role="button"
              tabIndex={0}
              onClick={() => onOpenNotification(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void onOpenNotification(item);
                }
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6371a8]">
                    {item.type.replaceAll('_', ' ')}
                  </p>
                  <h2 className="text-base font-semibold text-[#1a224e]">{item.title}</h2>
                  <p className="text-sm text-[#5d6486]">{item.body}</p>
                  <p className="text-xs text-[#7a84ab]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {!item.readAt ? (
                  <button
                    className="rounded-lg border border-[#c6d5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3349ad]"
                    type="button"
                    disabled={working}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onMarkRead(item.id);
                    }}
                  >
                    Mark read
                  </button>
                ) : (
                  <span className="chip chip-success">Read</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <button
            className="rounded-lg border border-[#c6d5ff] bg-white px-4 py-2 text-sm font-semibold text-[#3349ad]"
            type="button"
            disabled={working}
            onClick={onLoadMore}
          >
            Load more
          </button>
        </div>
      ) : null}
    </section>
  );
}
