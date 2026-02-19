'use client';

import { useEffect, useState } from 'react';
import AdminModal from '../../../../components/admin/AdminModal';
import { useAdminAccessToken } from '../../../../components/admin/useAdminAccessToken';
import { adminGetOrder, adminListOrders, OrderSummary } from '../../../../lib/api';

type AdminOrderQuery = {
  status: string;
  vendorId: string;
  userId: string;
};

const EMPTY_QUERY: AdminOrderQuery = {
  status: '',
  vendorId: '',
  userId: '',
};

function formatMoney(amount: number, currency: string) {
  const value = amount / (currency === 'USD' ? 100 : 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2,
  }).format(value);
}

export default function AdminOrdersPage() {
  const { ready, accessToken } = useAdminAccessToken();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [query, setQuery] = useState<AdminOrderQuery>(EMPTY_QUERY);
  const [selected, setSelected] = useState<OrderSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  async function reload(token: string, currentQuery: AdminOrderQuery) {
    const res = await adminListOrders(
      {
        status: currentQuery.status || undefined,
        vendorId: currentQuery.vendorId || undefined,
        userId: currentQuery.userId || undefined,
        limit: 100,
      },
      token,
    );
    setOrders(res.items);
  }

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!accessToken) {
      setError('Admin session not found. Please login again.');
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    reload(accessToken, query)
      .then(() => {
        if (alive) {
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load admin orders.');
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

  async function onSearch() {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await reload(accessToken, query);
    } catch {
      setError('Failed to filter orders.');
    } finally {
      setWorking(false);
    }
  }

  async function onOpenDetail(id: string) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const order = await adminGetOrder(id, accessToken);
      setSelected(order);
      setDetailOpen(true);
    } catch {
      setError('Failed to load order detail.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Orders Oversight</h1>
          <p className="text-sm text-slate-500">Read-only view of all marketplace orders.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {orders.length} order(s)
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Status (PAID, SHIPPED...)"
          value={query.status}
          onChange={(event) => setQuery((prev) => ({ ...prev, status: event.target.value }))}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Vendor ID"
          value={query.vendorId}
          onChange={(event) => setQuery((prev) => ({ ...prev, vendorId: event.target.value }))}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="User ID"
          value={query.userId}
          onChange={(event) => setQuery((prev) => ({ ...prev, userId: event.target.value }))}
        />
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          onClick={onSearch}
          type="button"
          disabled={working}
        >
          Search
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Vendor</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-100 text-sm text-slate-700">
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{order.id}</p>
                  <p className="text-xs text-slate-500">{order.fulfillment}</p>
                </td>
                <td className="px-3 py-3">{order.vendor?.name ?? order.vendor?.id ?? '-'}</td>
                <td className="px-3 py-3">{order.user?.email ?? '-'}</td>
                <td className="px-3 py-3">{order.status}</td>
                <td className="px-3 py-3">{formatMoney(order.total, order.currency)}</td>
                <td className="px-3 py-3">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => onOpenDetail(order.id)}
                    type="button"
                    disabled={working}
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-slate-500" colSpan={7}>
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminModal open={detailOpen} title="Order Detail" onClose={() => setDetailOpen(false)}>
        {selected ? (
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase text-slate-500">Order ID</p>
              <p className="break-all font-medium text-slate-900">{selected.id}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Status</p>
                <p>{selected.status}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Total</p>
                <p>{formatMoney(selected.total, selected.currency)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Fulfillment</p>
                <p>{selected.fulfillment}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Created</p>
                <p>{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Items</p>
              <div className="mt-2 space-y-2">
                {(selected.items ?? []).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="font-medium text-slate-900">{item.variant.product?.title ?? 'Product'}</p>
                    <p className="text-xs text-slate-600">
                      Qty {item.qty} • {formatMoney(item.unitPrice, selected.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </section>
  );
}
