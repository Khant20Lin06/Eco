'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getCurrentUser,
  listChatMessages,
  listChatThreads,
  markChatRead,
  sendChatMessage,
} from '../../../lib/api';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';
import { useOrderChatRealtime } from '../../../lib/hooks/use-order-chat-realtime';

type ChatThreadItem = {
  id: string;
  orderId: string;
  updatedAt: string;
  unread: boolean;
  order?: {
    id: string;
    status: string;
    total: number;
    currency: string;
    fulfillment: 'SHIPPING' | 'PICKUP';
    createdAt: string;
  };
  vendor?: {
    id: string;
    name: string;
    ownerUserId: string;
  };
  lastMessage?: {
    id: string;
    senderUserId: string;
    body: string;
    createdAt: string;
  } | null;
};

type ChatThreadsResponse = {
  items: ChatThreadItem[];
  nextCursor?: string | null;
};

type ChatMessageItem = {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  sender?: {
    id: string;
    email: string;
    role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  };
};

type ChatMessagesResponse = {
  items: ChatMessageItem[];
  nextCursor?: string | null;
};

type SendMessageResponse = {
  orderId: string;
  message: ChatMessageItem;
  clientMessageId?: string | null;
};

type ChatPageProps = {
  params: { locale: string };
};

function displayNameFromEmail(email?: string | null) {
  if (!email) {
    return 'User';
  }
  const localPart = email.split('@')[0] ?? 'user';
  return localPart.replace(/[._-]/g, ' ');
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'U';
  }
  if (parts.length === 1) {
    return (parts[0] ?? 'U').slice(0, 1).toUpperCase();
  }
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function avatarTone(seed: string) {
  const tones = [
    'from-[#4e7bff] to-[#6ea8ff]',
    'from-[#36a39f] to-[#6bd1bd]',
    'from-[#7c58d6] to-[#9a7dff]',
    'from-[#e06b63] to-[#f29d7e]',
    'from-[#3e5d7f] to-[#6287a8]'
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % tones.length;
  return tones[index] ?? tones[0];
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white ${avatarTone(
        name
      )}`}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

export default function ChatPage({ params: { locale } }: ChatPageProps) {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId') ?? '';
  const { ready, accessToken } = useAuthSession();

  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState(initialOrderId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>('You');
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);

  const {
    connected,
    messages,
    setMessages,
  } = useOrderChatRealtime(accessToken, activeOrderId);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      setIsLargeScreen(media.matches);
    };
    update();

    const handler = () => update();
    media.addEventListener('change', handler);
    return () => {
      media.removeEventListener('change', handler);
    };
  }, []);

  useEffect(() => {
    if (isLargeScreen) {
      setMobileShowMessages(false);
    }
  }, [isLargeScreen]);

  useEffect(() => {
    if (initialOrderId) {
      setActiveOrderId(initialOrderId);
    }
  }, [initialOrderId]);

  async function loadThreads(token: string, preferredOrderId?: string) {
    const response = await listChatThreads<ChatThreadsResponse>({ limit: 20 }, token);
    const items = response.items ?? [];
    setThreads(items);

    if (!items.length) {
      setActiveOrderId(preferredOrderId ?? '');
      return;
    }

    const preferred = preferredOrderId ?? undefined;
    setActiveOrderId((current) => {
      if (preferred) {
        return preferred;
      }
      if (current && items.some((item) => item.orderId === current)) {
        return current;
      }
      return items[0]?.orderId ?? '';
    });
  }

  async function loadMessages(token: string, orderId: string) {
    setMessagesLoading(true);
    try {
      const response = await listChatMessages<ChatMessagesResponse>(
        orderId,
        { limit: 50 },
        token,
      );
      const ordered = [...(response.items ?? [])].reverse();
      setMessages(ordered);

      const lastMessage = ordered.at(-1);
      if (lastMessage) {
        await markChatRead(orderId, { messageId: lastMessage.id }, token);
      }
      setError(null);
    } catch {
      setError('Failed to load messages.');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setThreadsLoading(false);
      setError('Please login to open chat.');
      return;
    }

    let alive = true;
    setThreadsLoading(true);
    loadThreads(accessToken, initialOrderId)
      .then(() => {
        if (alive) {
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          if (initialOrderId) {
            setActiveOrderId(initialOrderId);
          }
          setError('Failed to load chat threads.');
        }
      })
      .finally(() => {
        if (alive) {
          setThreadsLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [ready, accessToken, initialOrderId]);

  useEffect(() => {
    if (!accessToken) {
      setCurrentUserId(null);
      setCurrentUsername('You');
      return;
    }

    let alive = true;
    getCurrentUser(accessToken)
      .then((me) => {
        if (!alive) {
          return;
        }
        setCurrentUserId(me.id);
        setCurrentUsername(displayNameFromEmail(me.email));
      })
      .catch(() => {
        if (alive) {
          setCurrentUserId(null);
          setCurrentUsername('You');
        }
      });

    return () => {
      alive = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !activeOrderId) {
      setMessages([]);
      return;
    }
    loadMessages(accessToken, activeOrderId);
  }, [accessToken, activeOrderId, setMessages]);

  const activeThread = useMemo(
    () => threads.find((item) => item.orderId === activeOrderId),
    [threads, activeOrderId],
  );
  const showThreadListPanel = isLargeScreen || !mobileShowMessages;
  const showMessagesPanel = isLargeScreen || mobileShowMessages;

  function onSelectThread(orderId: string) {
    setActiveOrderId(orderId);
    if (!isLargeScreen) {
      setMobileShowMessages(true);
    }
  }

  async function onSend() {
    if (!accessToken || !activeOrderId || !draft.trim()) {
      return;
    }
    setSending(true);
    try {
      const response = await sendChatMessage<SendMessageResponse>(
        activeOrderId,
        { body: draft.trim() },
        accessToken,
      );
      const nextMessage = response.message;
      setMessages((prev) =>
        prev.some((item) => item.id === nextMessage.id) ? prev : [...prev, nextMessage],
      );
      setDraft('');
      setError(null);
      await loadThreads(accessToken, activeOrderId);
    } catch {
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  async function onMarkRead() {
    if (!accessToken || !activeOrderId || messages.length === 0) {
      return;
    }
    const lastMessage = messages.at(-1);
    if (!lastMessage) {
      return;
    }
    try {
      await markChatRead(
        activeOrderId,
        { messageId: lastMessage.id },
        accessToken,
      );
      await loadThreads(accessToken, activeOrderId);
      setError(null);
    } catch {
      setError('Failed to update read state.');
    }
  }

  return (
    <section className="space-y-4">
      <div className="surface p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#181f46]">Order Chat</h1>
            <p className="mt-1 text-sm text-[#5d6486]">
              Chat between customer and vendor owner, thread by order.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`chip ${connected ? 'chip-success' : 'chip-warn'}`}>
              {connected ? 'Realtime connected' : 'Realtime offline'}
            </span>
            <a
              className="rounded-lg border border-[#c6d5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3349ad]"
              href={`/${locale}/orders`}
            >
              Back to orders
            </a>
          </div>
        </div>
      </div>

      {error ? (
        <div className="surface border-[#ffd7dd] bg-[#fff5f6] p-4 text-sm text-[#b12f43]">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className={`surface p-3 ${showThreadListPanel ? '' : 'hidden lg:block'}`}>
          <h2 className="px-2 py-2 text-sm font-semibold uppercase tracking-wide text-[#6070a6]">
            Threads
          </h2>
          {threadsLoading ? (
            <p className="px-2 py-3 text-sm text-[#5d6486]">Loading threads...</p>
          ) : threads.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[#5d6486]">No threads yet.</p>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => {
                const threadName = thread.vendor?.name ?? `Order ${thread.orderId.slice(0, 8)}`;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onSelectThread(thread.orderId)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      activeOrderId === thread.orderId
                        ? 'border-[#9db5ff] bg-[#f2f6ff]'
                        : 'border-[#dbe2ff] bg-white hover:border-[#bfd0ff]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={threadName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-[#1b2452]">{threadName}</p>
                          {thread.unread ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#3d66ff]" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#60709b]">
                          Order #{thread.orderId.slice(0, 8)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-[#5f688f]">
                          {thread.lastMessage?.body ?? 'No message yet.'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className={`surface flex min-h-[560px] flex-col p-4 ${showMessagesPanel ? '' : 'hidden lg:flex'}`}>
          {activeOrderId ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-[#e1e7ff] pb-3">
                <div className="flex items-center gap-3">
                  {!isLargeScreen ? (
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#c6d5ff] bg-white text-[#3349ad]"
                      onClick={() => setMobileShowMessages(false)}
                      type="button"
                      aria-label="Back to threads"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <path
                          d="M15 18l-6-6 6-6"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </button>
                  ) : null}
                  <Avatar
                    name={activeThread?.vendor?.name ?? `Order ${activeOrderId.slice(0, 8)}`}
                    size={42}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1b2452]">
                      {activeThread?.vendor?.name ?? 'Conversation'}
                    </p>
                    <p className="text-xs text-[#60709b]">
                      Order #{activeOrderId.slice(0, 8)} - {activeThread?.order?.status ?? 'STATUS_UNKNOWN'} -{' '}
                      {activeThread?.order?.fulfillment ?? 'ORDER'}
                    </p>
                  </div>
                </div>
                <button
                  className="rounded-lg border border-[#c6d5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3349ad]"
                  type="button"
                  onClick={onMarkRead}
                  disabled={messages.length === 0}
                >
                  Mark read
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-1 py-4">
                {messagesLoading ? (
                  <p className="text-sm text-[#5d6486]">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[#5d6486]">No messages yet. Start conversation.</p>
                ) : (
                  messages.map((message) => {
                    const mine = currentUserId ? message.senderUserId === currentUserId : false;
                    const senderName = mine
                      ? currentUsername
                      : (activeThread?.vendor?.name ?? 'User');

                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[84%] items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                          <Avatar name={senderName} size={30} />
                          <article
                            className={`rounded-2xl px-3 py-2 ${
                              mine
                                ? 'bg-[#3654c5] text-white'
                                : 'border border-[#dbe2ff] bg-[#fbfcff] text-[#1f2858]'
                            }`}
                          >
                            <p className="text-sm leading-6">{message.body}</p>
                            <p className={`mt-1 text-[11px] ${mine ? 'text-white/80' : 'text-[#7a84ab]'}`}>
                              {senderName} - {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </article>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-2 border-t border-[#e1e7ff] pt-3">
                <div className="flex items-end gap-2 rounded-2xl border border-[#d7e0ff] bg-[#f9fbff] p-2">
                  <textarea
                    className="min-h-[74px] flex-1 resize-none rounded-xl border border-[#cad6ff] bg-white px-3 py-2 text-sm outline-none focus:border-[#8ea8ff]"
                    placeholder="Write a message..."
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={2000}
                  />
                  <button
                    className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold text-white"
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={onSend}
                  >
                    Send
                  </button>
                </div>
                <p className="mt-2 text-right text-[11px] text-[#7680a6]">{draft.length}/2000</p>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-[#5d6486]">
              Select an order thread to start chat.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
