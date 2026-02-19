'use client';

import { useEffect, useState } from 'react';
import {
  vendorApproveReturn,
  vendorListReturns,
  vendorReceiveReturn,
  vendorRejectReturn,
} from '../../../../lib/api';
import { getApiErrorMessage } from '../../../../lib/api-error';
import { useAuthSession } from '../../../../lib/hooks/use-auth-session';

type VendorReturnItem = {
  id: string;
  status: string;
  reason: string;
  requestedAt: string;
  order: {
    id: string;
    total: number;
    status: string;
    user?: { email?: string };
  };
};

export default function VendorReturnsPage() {
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<VendorReturnItem[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  async function reload(token: string) {
    const res = await vendorListReturns({ limit: 100 }, token);
    setItems(res.items as VendorReturnItem[]);
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
          setError(getApiErrorMessage(err, 'Failed to load returns.'));
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

  async function doAction(
    id: string,
    action: 'approve' | 'reject' | 'receive',
  ) {
    if (!accessToken) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const notes = notesById[id] ?? '';
      if (action === 'approve') {
        await vendorApproveReturn(id, notes, accessToken);
      } else if (action === 'reject') {
        await vendorRejectReturn(id, notes, accessToken);
      } else {
        await vendorReceiveReturn(id, notes, accessToken);
      }
      await reload(accessToken);
      setMessage(`Return ${id} updated.`);
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to ${action} return.`));
    } finally {
      setWorking(false);
    }
  }

  const filteredItems =
    statusFilter === 'ALL'
      ? items
      : items.filter((item) => item.status === statusFilter);
  const statusOptions = Array.from(new Set(items.map((item) => item.status)));

  return (
    <section className="space-y-4">
      <div className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#181f46]">Vendor Returns</h2>
            <p className="mt-1 text-sm text-[#5d6486]">
              Approve or reject requests, then mark as received before admin refund.
            </p>
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
          All ({items.length})
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
        <div className="surface p-4 text-sm text-[#5d6486]">Loading returns...</div>
      ) : filteredItems.length === 0 ? (
        <div className="surface p-4 text-sm text-[#5d6486]">No returns found.</div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const canApproveReject = item.status === 'REQUESTED';
            const canReceive = item.status === 'APPROVED';
            return (
              <article key={item.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#6471a7]">Return #{item.id}</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#18204d]">Order {item.order.id}</h3>
                    <p className="text-sm text-[#5d6486]">
                      {new Date(item.requestedAt).toLocaleString()} • {item.order.user?.email ?? '-'}
                    </p>
                  </div>
                  <span className="chip bg-[#edf2ff] text-[#46599d]">{item.status}</span>
                </div>
                <p className="mt-3 rounded-xl border border-[#d8e1ff] bg-[#f8faff] px-3 py-2 text-sm text-[#2f3c72]">
                  Reason: {item.reason}
                </p>
                <textarea
                  className="mt-3 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                  placeholder="Vendor notes (optional)"
                  rows={2}
                  value={notesById[item.id] ?? ''}
                  onChange={(event) =>
                    setNotesById((prev) => ({ ...prev, [item.id]: event.target.value }))
                  }
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {canApproveReject ? (
                    <>
                      <button
                        className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                        onClick={() => doAction(item.id, 'approve')}
                        type="button"
                        disabled={working}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-lg border border-[#ffc2cd] bg-white px-3 py-1.5 text-xs font-semibold text-[#c33f53] disabled:opacity-60"
                        onClick={() => doAction(item.id, 'reject')}
                        type="button"
                        disabled={working}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {canReceive ? (
                    <button
                      className="btn-secondary rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      onClick={() => doAction(item.id, 'receive')}
                      type="button"
                      disabled={working}
                    >
                      Mark received
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
