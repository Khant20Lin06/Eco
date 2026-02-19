'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  kbzpayCheckout,
  listOrders,
  listReturns,
  OrderSummary,
  requestReturn,
  stripeCheckout,
  updateOrderStatus,
  waveCheckout,
} from '../../../lib/api';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';

type ReturnItem = {
  id: string;
  status: string;
  order: { id: string };
};

type ReturnsPayload = {
  items: ReturnItem[];
};

type OrdersPageProps = {
  params: { locale: string };
};

function formatMoney(amount: number, currency: string) {
  const value = amount / (currency === 'USD' ? 100 : 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2,
  }).format(value);
}

function statusChipClass(status: string) {
  if (status === 'PAID' || status === 'DELIVERED' || status === 'PICKED_UP') {
    return 'chip chip-success';
  }
  if (status.includes('RETURN') || status === 'REFUNDED') {
    return 'chip chip-warn';
  }
  if (status === 'CANCELED') {
    return 'chip chip-danger';
  }
  return 'chip bg-[#eff4ff] text-[#4c5d9f]';
}

export default function OrdersPage({ params: { locale } }: OrdersPageProps) {
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [returnOrderId, setReturnOrderId] = useState('');
  const [returnReason, setReturnReason] = useState('');

  async function reload(token: string) {
    const [ordersRes, returnsRes] = await Promise.allSettled([
      listOrders(token),
      listReturns<ReturnsPayload>(token),
    ]);

    if (ordersRes.status === 'fulfilled') {
      setOrders(ordersRes.value.items);
    } else {
      throw ordersRes.reason;
    }

    if (returnsRes.status === 'fulfilled') {
      setReturns(returnsRes.value.items);
    } else {
      setReturns([]);
    }
  }

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setError('Please login to view your orders.');
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    reload(accessToken)
      .then(() => {
        if (alive) {
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load orders.');
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [ready, accessToken]);

  const activeReturnOrderIds = useMemo(() => {
    const activeStatuses = new Set(['REQUESTED', 'APPROVED', 'RECEIVED']);
    return new Set(returns.filter((item) => activeStatuses.has(item.status)).map((item) => item.order.id));
  }, [returns]);

  async function onCancelOrder(order: OrderSummary) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await updateOrderStatus(order.id, 'CANCELED', accessToken);
      await reload(accessToken);
      setMessage(`Order ${order.id} canceled.`);
    } catch {
      setError('Failed to cancel order.');
    } finally {
      setWorking(false);
    }
  }

  async function onPayOrder(order: OrderSummary) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      if (order.currency === 'USD') {
        const checkout = await stripeCheckout(order.id, accessToken);
        if (checkout.url) {
          window.location.href = checkout.url;
          return;
        }
      } else {
        await waveCheckout(order.id, accessToken);
      }
      await reload(accessToken);
      setMessage(`Payment completed for order ${order.id}.`);
    } catch {
      setError('Failed to process payment.');
    } finally {
      setWorking(false);
    }
  }

  async function onPayWith(order: OrderSummary, provider: 'WAVE' | 'KBZPAY') {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      if (provider === 'WAVE') {
        await waveCheckout(order.id, accessToken);
      } else {
        await kbzpayCheckout(order.id, accessToken);
      }
      await reload(accessToken);
      setMessage(`Payment completed for order ${order.id}.`);
    } catch {
      setError('Failed to process payment.');
    } finally {
      setWorking(false);
    }
  }

  async function onRequestReturn(orderId: string) {
    if (!accessToken || !returnReason.trim()) {
      return;
    }
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await requestReturn({ orderId, reason: returnReason.trim() }, accessToken);
      await reload(accessToken);
      setReturnOrderId('');
      setReturnReason('');
      setMessage('Return requested.');
    } catch {
      setError('Failed to request return.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="surface p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-[#181f46]">Order History</h1>
        <p className="mt-1 text-sm text-[#5d6486]">Track payments, status transitions, and returns.</p>
      </div>

      {error ? (
        <div className="surface border-[#ffd7dd] bg-[#fff5f6] p-4 text-sm text-[#b12f43]">{error}</div>
      ) : null}
      {message ? (
        <div className="surface border-[#d1eeda] bg-[#f1fbf4] p-4 text-sm text-[#17724b]">{message}</div>
      ) : null}

      {loading ? (
        <div className="surface p-4 text-sm text-[#5d6486]">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="surface p-4 text-sm text-[#5d6486]">No orders yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const canCancel = order.status === 'PENDING_PAYMENT' || order.status === 'PAID';
            const canReturn = order.status === 'DELIVERED' || order.status === 'PICKED_UP';
            const hasActiveReturn = activeReturnOrderIds.has(order.id);
            const isMmkPending = order.status === 'PENDING_PAYMENT' && order.currency === 'MMK';

            return (
              <article key={order.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#6371a8]">Order #{order.id}</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#1a224e]">
                      {formatMoney(order.total, order.currency)}
                    </h2>
                    <p className="text-sm text-[#5d6486]">
                      {order.fulfillment} • {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={statusChipClass(order.status)}>{order.status}</span>
                </div>

                <div className="mt-3 space-y-2">
                  {(order.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#d8e1ff] bg-[#fbfcff] px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-[#1f2858]">{item.variant.product?.title ?? 'Product'}</p>
                      <p className="text-[#60709d]">
                        {item.qty} x {formatMoney(item.unitPrice, order.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className="rounded-lg border border-[#c6d5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3349ad]"
                    href={`/${locale}/chat?orderId=${order.id}`}
                  >
                    Open chat
                  </Link>
                  {order.status === 'PENDING_PAYMENT' ? (
                    <>
                      {order.currency === 'USD' ? (
                        <button
                          className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
                          onClick={() => onPayOrder(order)}
                          type="button"
                          disabled={working}
                        >
                          Pay with Stripe
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn-secondary rounded-lg px-3 py-1.5 text-xs font-semibold"
                            onClick={() => onPayWith(order, 'WAVE')}
                            type="button"
                            disabled={working}
                          >
                            Pay with Wave
                          </button>
                          <button
                            className="rounded-lg border border-[#bcd1ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3550c0]"
                            onClick={() => onPayWith(order, 'KBZPAY')}
                            type="button"
                            disabled={working}
                          >
                            Pay with KBZPay
                          </button>
                        </>
                      )}
                    </>
                  ) : null}

                  {canCancel ? (
                    <button
                      className="rounded-lg border border-[#ffc2cd] bg-white px-3 py-1.5 text-xs font-semibold text-[#c33f53]"
                      onClick={() => onCancelOrder(order)}
                      type="button"
                      disabled={working}
                    >
                      Cancel order
                    </button>
                  ) : null}
                </div>

                {canReturn ? (
                  <div className="mt-4 rounded-xl border border-[#d8e1ff] bg-[#f8faff] p-3">
                    {hasActiveReturn ? (
                      <p className="text-sm text-[#59648f]">Return already in progress.</p>
                    ) : returnOrderId === order.id ? (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm"
                          value={returnReason}
                          onChange={(event) => setReturnReason(event.target.value)}
                          placeholder="Why are you returning this order?"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
                            type="button"
                            onClick={() => onRequestReturn(order.id)}
                            disabled={working}
                          >
                            Submit return
                          </button>
                          <button
                            className="rounded-lg border border-[#cfd9ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#44539a]"
                            type="button"
                            onClick={() => {
                              setReturnOrderId('');
                              setReturnReason('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="rounded-lg border border-[#c6d5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3349ad]"
                        type="button"
                        onClick={() => setReturnOrderId(order.id)}
                      >
                        Request return
                      </button>
                    )}
                  </div>
                ) : null}

                {isMmkPending ? (
                  <p className="mt-2 text-xs text-[#5d6486]">
                    MMK mock payment is enabled for MVP.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
