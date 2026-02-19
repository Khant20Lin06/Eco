'use client';

import { useEffect, useState } from 'react';
import AdminModal from '../../../../components/admin/AdminModal';
import {
  adminGetReturn,
  adminListReturns,
  adminRefundReturn,
} from '../../../../lib/api';
import { useAdminAccessToken } from '../../../../components/admin/useAdminAccessToken';

type AdminReturnItem = {
  id: string;
  status: string;
  reason: string;
  requestedAt: string;
  order: {
    id: string;
    status: string;
    total: number;
    vendor?: { id: string; name: string };
    user?: { id: string; email?: string | null };
  };
};

type AdminReturnDetail = {
  id: string;
  status: string;
  reason: string;
  requestedAt: string;
  resolvedAt?: string | null;
  notes?: string | null;
  order: {
    id: string;
    status: string;
    total: number;
    currency: string;
    vendor?: { id: string; name: string };
    user?: { id: string; email?: string | null; phone?: string | null };
  };
};

type ReturnQuery = {
  status: string;
  vendorId: string;
  userId: string;
};

const EMPTY_QUERY: ReturnQuery = {
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

export default function AdminReturnsPage() {
  const { ready, accessToken } = useAdminAccessToken();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState<ReturnQuery>(EMPTY_QUERY);
  const [items, setItems] = useState<AdminReturnItem[]>([]);
  const [selected, setSelected] = useState<AdminReturnDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');

  async function reload(token: string, currentQuery: ReturnQuery) {
    const res = await adminListReturns(
      {
        status: currentQuery.status || undefined,
        vendorId: currentQuery.vendorId || undefined,
        userId: currentQuery.userId || undefined,
        limit: 100,
      },
      token,
    );
    setItems(res.items as AdminReturnItem[]);
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
          setError('Failed to load returns.');
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
      setError('Failed to filter returns.');
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
      const detail = await adminGetReturn(id, accessToken);
      setSelected(detail as AdminReturnDetail);
      setDetailOpen(true);
    } catch {
      setError('Failed to load return detail.');
    } finally {
      setWorking(false);
    }
  }

  async function onRefund(id: string) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await adminRefundReturn(id, refundNotes.trim() || undefined, accessToken);
      await reload(accessToken, query);
      if (selected?.id === id) {
        const detail = await adminGetReturn(id, accessToken);
        setSelected(detail as AdminReturnDetail);
      }
      setMessage(`Return ${id} refunded.`);
    } catch {
      setError('Failed to refund return.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Returns Oversight</h1>
          <p className="text-sm text-slate-500">Review and refund received returns.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {items.length} return(s)
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Status (REQUESTED...)"
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
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">Return</th>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Vendor</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Requested</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 text-sm text-slate-700">
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{item.id}</p>
                  <p className="line-clamp-1 text-xs text-slate-500">{item.reason}</p>
                </td>
                <td className="px-3 py-3">{item.order.id}</td>
                <td className="px-3 py-3">{item.order.user?.email ?? '-'}</td>
                <td className="px-3 py-3">{item.order.vendor?.name ?? item.order.vendor?.id ?? '-'}</td>
                <td className="px-3 py-3">{item.status}</td>
                <td className="px-3 py-3">{new Date(item.requestedAt).toLocaleString()}</td>
                <td className="px-3 py-3">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                    onClick={() => onOpenDetail(item.id)}
                    type="button"
                    disabled={working}
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-slate-500" colSpan={7}>
                  No returns found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminModal open={detailOpen} title="Return Detail" onClose={() => setDetailOpen(false)}>
        {selected ? (
          <div className="space-y-3 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase text-slate-500">Return ID</p>
              <p className="break-all font-medium text-slate-900">{selected.id}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Status</p>
                <p>{selected.status}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Requested</p>
                <p>{new Date(selected.requestedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Order</p>
                <p>{selected.order.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Total</p>
                <p>{formatMoney(selected.order.total, selected.order.currency)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Reason</p>
              <p>{selected.reason}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Notes</p>
              <p>{selected.notes || '-'}</p>
            </div>

            {selected.status === 'RECEIVED' ? (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">Refund this return</p>
                <textarea
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                  placeholder="Refund note (optional)"
                  rows={3}
                  value={refundNotes}
                  onChange={(event) => setRefundNotes(event.target.value)}
                />
                <button
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  type="button"
                  disabled={working}
                  onClick={() => onRefund(selected.id)}
                >
                  Refund now
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>
    </section>
  );
}

