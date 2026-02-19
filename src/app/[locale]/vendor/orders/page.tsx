'use client';

import { useEffect, useState } from 'react';
import { updateOrderStatus, vendorListOrders } from '../../../../lib/api';
import { getApiErrorMessage } from '../../../../lib/api-error';
import { useAuthSession } from '../../../../lib/hooks/use-auth-session';

type VendorOrder = {
  id: string;
  status: string;
  fulfillment: 'SHIPPING' | 'PICKUP';
  currency: string;
  total: number;
  createdAt: string;
  user?: { email?: string; phone?: string | null };
  items?: Array<{
    id: string;
    qty: number;
    unitPrice: number;
    variant: {
      product?: {
        title: string;
      };
    };
  }>;
};

function formatMoney(amount: number, currency: string) {
  const value = amount / (currency === 'USD' ? 100 : 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2,
  }).format(value);
}

function getVendorNextStatuses(order: VendorOrder): string[] {
  if (order.status === 'PAID') {
    return ['PROCESSING'];
  }
  if (order.status === 'PROCESSING') {
    return ['PACKED'];
  }
  if (order.status === 'PACKED') {
    return order.fulfillment === 'SHIPPING' ? ['SHIPPED'] : ['READY_FOR_PICKUP'];
  }
  if (order.status === 'SHIPPED') {
    return ['DELIVERED'];
  }
  if (order.status === 'READY_FOR_PICKUP') {
    return ['PICKED_UP'];
  }
  return [];
}

export default function VendorOrdersPage() {
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  async function reload(token: string) {
    const res = await vendorListOrders({ limit: 100 }, token);
    setOrders(res.items as VendorOrder[]);
  }

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setError('Please login as vendor.');
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
      .catch((err) => {
        if (alive) {
          setError(getApiErrorMessage(err, 'Failed to load vendor orders.'));
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

  async function onAdvance(order: VendorOrder, nextStatus: string) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await updateOrderStatus(order.id, nextStatus, accessToken);
      await reload(accessToken);
      setMessage(`Order ${order.id} updated to ${nextStatus}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to update order ${order.id}.`));
    } finally {
      setWorking(false);
    }
  }

  const filteredOrders =
    statusFilter === 'ALL'
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  const statusOptions = Array.from(
    new Set(orders.map((order) => order.status))
  );

  return (
    <section className="space-y-4">
      <div className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#181f46]">Vendor Orders</h2>
            <p className="mt-1 text-sm text-[#5d6486]">Process, pack, ship or mark pickup completion.</p>
          </div>
          <button
            className="rounded-xl border border-[#c7d4ff] bg-white px-3 py-2 text-sm font-semibold text-[#3349ad]"
            onClick={() => accessToken && reload(accessToken)}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="surface border-[#ffd7dd] bg-[#fff5f6] p-4 text-sm text-[#b12f43]">{error}</div>
      ) : null}
      {message ? (
        <div className="surface border-[#d1eeda] bg-[#f1fbf4] p-4 text-sm text-[#17724b]">{message}</div>
      ) : null}

      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5f6994]">Filter</span>
        <button
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            statusFilter === 'ALL'
              ? 'border-[#3550be] bg-[#3550be] text-white'
              : 'border-[#cad6ff] bg-white text-[#334278]'
          }`}
          onClick={() => setStatusFilter('ALL')}
          type="button"
        >
          All ({orders.length})
        </button>
        {statusOptions.map((status) => (
          <button
            key={status}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              statusFilter === status
                ? 'border-[#3550be] bg-[#3550be] text-white'
                : 'border-[#cad6ff] bg-white text-[#334278]'
            }`}
            onClick={() => setStatusFilter(status)}
            type="button"
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="surface p-4 text-sm text-[#5d6486]">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="surface p-4 text-sm text-[#5d6486]">No vendor orders yet.</div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const nextStatuses = getVendorNextStatuses(order);
            return (
              <article key={order.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#6471a7]">Order #{order.id}</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#18204d]">
                      {formatMoney(order.total, order.currency)}
                    </h3>
                    <p className="text-sm text-[#5d6486]">
                      {order.fulfillment} • {new Date(order.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-[#5d6486]">Customer: {order.user?.email ?? '-'}</p>
                  </div>
                  <span className="chip bg-[#edf2ff] text-[#46599d]">{order.status}</span>
                </div>

                <div className="mt-3 space-y-2">
                  {(order.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#d8e1ff] bg-[#fbfcff] px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-[#1f2858]">{item.variant.product?.title ?? 'Product'}</p>
                      <p className="text-[#60709d]">
                        Qty {item.qty} • {formatMoney(item.unitPrice, order.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                {nextStatuses.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                      <button
                        key={status}
                        className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                        onClick={() => onAdvance(order, status)}
                        type="button"
                        disabled={working}
                      >
                        Mark {status}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
