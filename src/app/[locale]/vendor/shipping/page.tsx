'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ShippingRateItem,
  vendorCreateShippingRate,
  vendorDisableShippingRate,
  vendorListShippingRates,
  vendorUpdateShippingRate,
} from '../../../../lib/api';
import { getApiErrorMessage } from '../../../../lib/api-error';
import { useAuthSession } from '../../../../lib/hooks/use-auth-session';

type ShippingFormState = {
  country: string;
  flatRate: string;
  currency: string;
  active: boolean;
};

const EMPTY_FORM: ShippingFormState = {
  country: 'US',
  flatRate: '0',
  currency: 'USD',
  active: true,
};

export default function VendorShippingPage() {
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rates, setRates] = useState<ShippingRateItem[]>([]);
  const [form, setForm] = useState<ShippingFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string>('');

  async function reload(token: string) {
    const res = await vendorListShippingRates({}, token);
    setRates(res.items);
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
          setError(getApiErrorMessage(err, 'Failed to load shipping rates.'));
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (editingId) {
        await vendorUpdateShippingRate(
          editingId,
          {
            country: form.country.trim().toUpperCase(),
            flatRate: Number(form.flatRate),
            currency: form.currency.trim().toUpperCase(),
            active: form.active,
          },
          accessToken,
        );
        setMessage('Shipping rate updated.');
      } else {
        await vendorCreateShippingRate(
          {
            country: form.country.trim().toUpperCase(),
            flatRate: Number(form.flatRate),
            currency: form.currency.trim().toUpperCase(),
            active: form.active,
          },
          accessToken,
        );
        setMessage('Shipping rate created.');
      }
      await reload(accessToken);
      setEditingId('');
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save shipping rate.'));
    } finally {
      setSubmitting(false);
    }
  }

  function onEdit(rate: ShippingRateItem) {
    setEditingId(rate.id);
    setForm({
      country: rate.country,
      flatRate: String(rate.flatRate),
      currency: rate.currency,
      active: rate.active,
    });
  }

  async function onDisable(id: string) {
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await vendorDisableShippingRate(id, accessToken);
      await reload(accessToken);
      setMessage('Shipping rate disabled.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to disable shipping rate.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#181f46]">Shipping Rates</h2>
            <p className="mt-1 text-sm text-[#5d6486]">
              Configure flat rates by country for checkout shipping.
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

      <section className="surface p-4">
        <h3 className="text-lg font-semibold text-[#1b234f]">
          {editingId ? 'Update Shipping Rate' : 'Create Shipping Rate'}
        </h3>
        <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={onSubmit}>
          <input
            className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
            placeholder="Country (US/MM)"
            value={form.country}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
            placeholder="Flat rate"
            type="number"
            min={0}
            value={form.flatRate}
            onChange={(event) => setForm((prev) => ({ ...prev, flatRate: event.target.value }))}
            required
          />
          <select
            className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
            value={form.currency}
            onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
            required
          >
            <option value="USD">USD</option>
            <option value="MMK">MMK</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm text-[#3a4476]">
            <input
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              type="checkbox"
            />
            Active
          </label>
          <div className="md:col-span-4 flex gap-2">
            <button
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingId ? 'Update rate' : 'Create rate'}
            </button>
            {editingId ? (
              <button
                className="rounded-xl border border-[#c7d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#3349ad]"
                type="button"
                onClick={() => {
                  setEditingId('');
                  setForm(EMPTY_FORM);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="surface p-4">
        <h3 className="text-lg font-semibold text-[#1b234f]">Configured Rates</h3>
        {loading ? (
          <p className="mt-3 text-sm text-[#5d6486]">Loading rates...</p>
        ) : rates.length === 0 ? (
          <p className="mt-3 text-sm text-[#5d6486]">No shipping rates configured yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-[#e0e7ff] text-left text-xs uppercase tracking-wide text-[#6a739c]">
                  <th className="px-2 py-2">Country</th>
                  <th className="px-2 py-2">Flat Rate</th>
                  <th className="px-2 py-2">Currency</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id} className="border-b border-[#f0f3ff] text-sm text-[#374472]">
                    <td className="px-2 py-3">{rate.country}</td>
                    <td className="px-2 py-3">{rate.flatRate}</td>
                    <td className="px-2 py-3">{rate.currency}</td>
                    <td className="px-2 py-3">
                      <span className={rate.active ? 'chip chip-success' : 'chip chip-danger'}>
                        {rate.active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-[#bcd1ff] bg-white px-2 py-1 text-xs font-semibold text-[#3550c0]"
                          type="button"
                          onClick={() => onEdit(rate)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg border border-[#ffc2cd] bg-white px-2 py-1 text-xs font-semibold text-[#c33f53] disabled:opacity-50"
                          type="button"
                          onClick={() => onDisable(rate.id)}
                          disabled={submitting || !rate.active}
                        >
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
