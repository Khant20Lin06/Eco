'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminModal from '../../../../components/admin/AdminModal';
import { useAdminAccessToken } from '../../../../components/admin/useAdminAccessToken';
import {
  adminApproveVendor,
  adminCreateVendor,
  adminGetVendor,
  adminListVendors,
  adminSuspendVendor,
  adminUpdateVendor,
  AdminVendorItem,
  CreateAdminVendorInput,
  UpdateAdminVendorInput,
} from '../../../../lib/api';

type VendorForm = {
  ownerEmail: string;
  name: string;
  country: string;
  currency: string;
  commissionPct: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
};

const DEFAULT_VENDOR_FORM: VendorForm = {
  ownerEmail: '',
  name: '',
  country: 'US',
  currency: 'USD',
  commissionPct: '10',
  status: 'PENDING',
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function toCreatePayload(form: VendorForm): CreateAdminVendorInput {
  return {
    ownerEmail: form.ownerEmail.trim(),
    name: form.name.trim(),
    country: form.country.trim().toUpperCase(),
    currency: form.currency.trim().toUpperCase(),
    commissionPct: Number(form.commissionPct),
    status: form.status,
  };
}

function toUpdatePayload(form: VendorForm): UpdateAdminVendorInput {
  return {
    name: form.name.trim(),
    country: form.country.trim().toUpperCase(),
    currency: form.currency.trim().toUpperCase(),
    commissionPct: Number(form.commissionPct),
    status: form.status,
  };
}

export default function AdminVendorsPage() {
  const { ready, accessToken } = useAdminAccessToken();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vendors, setVendors] = useState<AdminVendorItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<AdminVendorItem | null>(null);
  const [createForm, setCreateForm] = useState<VendorForm>(DEFAULT_VENDOR_FORM);
  const [updateForm, setUpdateForm] = useState<VendorForm>(DEFAULT_VENDOR_FORM);

  function resetCreateForm() {
    setCreateForm(DEFAULT_VENDOR_FORM);
  }

  async function reloadVendors(token: string) {
    const res = await adminListVendors(token);
    setVendors(res.items);
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
    reloadVendors(accessToken)
      .then(() => {
        if (alive) {
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load vendors.');
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

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return vendors;
    }
    return vendors.filter((vendor) =>
      [
        vendor.name,
        vendor.country,
        vendor.currency,
        vendor.status,
        vendor.id,
        vendor.owner?.email ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [vendors, search]);

  async function onCreateVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError('Admin session not found. Please login again.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminCreateVendor(toCreatePayload(createForm), accessToken);
      await reloadVendors(accessToken);
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      setError('Failed to create vendor. Ensure owner email exists with VENDOR role.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(vendorId: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const vendor = await adminGetVendor(vendorId, accessToken);
      setSelectedVendor(vendor);
      setDetailOpen(true);
    } catch {
      setError('Failed to load vendor detail.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openUpdate(vendorId: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const vendor = await adminGetVendor(vendorId, accessToken);
      setSelectedVendor(vendor);
      setUpdateForm({
        ownerEmail: vendor.owner?.email ?? '',
        name: vendor.name,
        country: vendor.country,
        currency: vendor.currency,
        commissionPct: String(vendor.commissionPct),
        status: vendor.status,
      });
      setUpdateOpen(true);
    } catch {
      setError('Failed to load vendor update form.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onUpdateVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selectedVendor) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminUpdateVendor(selectedVendor.id, toUpdatePayload(updateForm), accessToken);
      setVendors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedVendor(updated);
      setUpdateOpen(false);
    } catch {
      setError('Failed to update vendor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove(vendorId: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminApproveVendor(vendorId, accessToken);
      setVendors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError('Failed to approve vendor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSuspend(vendorId: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminSuspendVendor(vendorId, accessToken);
      setVendors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError('Failed to suspend vendor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vendor Management</h1>
          <p className="text-sm text-slate-500">Create, update, detail and approve vendors.</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {filtered.length} vendor(s)
          </span>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            Create Vendor
          </button>
        </div>
      </div>

      <div className="mt-4">
        <input
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search vendor name, country, status or email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1050px] border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Vendor</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Country</th>
              <th className="px-3 py-3">Currency</th>
              <th className="px-3 py-3">Commission</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((vendor, index) => (
              <tr key={vendor.id} className="border-t border-slate-100 text-sm text-slate-700">
                <td className="px-3 py-3">{index + 1}</td>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{vendor.name}</p>
                  <p className="text-xs text-slate-500">{vendor.id}</p>
                </td>
                <td className="px-3 py-3">{vendor.owner?.email ?? '-'}</td>
                <td className="px-3 py-3">{vendor.country}</td>
                <td className="px-3 py-3">{vendor.currency}</td>
                <td className="px-3 py-3">{vendor.commissionPct}%</td>
                <td className="px-3 py-3">
                  <span
                    className={
                      vendor.status === 'APPROVED'
                        ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700'
                        : vendor.status === 'PENDING'
                          ? 'rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700'
                          : 'rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700'
                    }
                  >
                    {vendor.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                      onClick={() => openDetail(vendor.id)}
                      type="button"
                    >
                      Detail
                    </button>
                    <button
                      className="rounded-md border border-blue-500 px-3 py-1 text-xs font-medium text-blue-700"
                      onClick={() => openUpdate(vendor.id)}
                      type="button"
                    >
                      Update
                    </button>
                    <button
                      className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-medium text-emerald-700 disabled:opacity-50"
                      disabled={submitting || vendor.status === 'APPROVED'}
                      onClick={() => onApprove(vendor.id)}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="rounded-md border border-rose-500 px-3 py-1 text-xs font-medium text-rose-700 disabled:opacity-50"
                      disabled={submitting || vendor.status === 'SUSPENDED'}
                      onClick={() => onSuspend(vendor.id)}
                      type="button"
                    >
                      Suspend
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-slate-500" colSpan={8}>
                  No vendors found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminModal open={createOpen} title="Create Vendor" onClose={() => setCreateOpen(false)}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateVendor}>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="Owner email (must be VENDOR role)"
            required
            value={createForm.ownerEmail}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerEmail: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="Vendor name"
            required
            value={createForm.name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Country (US/MM)"
            required
            value={createForm.country}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, country: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Currency (USD/MMK)"
            required
            value={createForm.currency}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, currency: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            min={0}
            max={100}
            placeholder="Commission %"
            required
            type="number"
            value={createForm.commissionPct}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, commissionPct: event.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={createForm.status}
            onChange={(event) =>
              setCreateForm((prev) => ({
                ...prev,
                status: event.target.value as VendorForm['status'],
              }))
            }
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              onClick={() => setCreateOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={detailOpen} title="Vendor Detail" onClose={() => setDetailOpen(false)}>
        {selectedVendor ? (
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{selectedVendor.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Owner Email</p>
              <p className="font-medium text-slate-900">{selectedVendor.owner?.email ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Country</p>
              <p>{selectedVendor.country}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Currency</p>
              <p>{selectedVendor.currency}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Commission</p>
              <p>{selectedVendor.commissionPct}%</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Status</p>
              <p>{selectedVendor.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Created</p>
              <p>{formatDate(selectedVendor.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Updated</p>
              <p>{formatDate(selectedVendor.updatedAt)}</p>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={updateOpen} title="Update Vendor" onClose={() => setUpdateOpen(false)}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onUpdateVendor}>
          <input
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm md:col-span-2"
            disabled
            placeholder="Owner email"
            value={updateForm.ownerEmail}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            placeholder="Vendor name"
            required
            value={updateForm.name}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Country"
            required
            value={updateForm.country}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, country: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Currency"
            required
            value={updateForm.currency}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, currency: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            min={0}
            max={100}
            placeholder="Commission %"
            required
            type="number"
            value={updateForm.commissionPct}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, commissionPct: event.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={updateForm.status}
            onChange={(event) =>
              setUpdateForm((prev) => ({
                ...prev,
                status: event.target.value as VendorForm['status'],
              }))
            }
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              onClick={() => setUpdateOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </AdminModal>
    </section>
  );
}

