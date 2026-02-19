'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  applyVendor,
  vendorListOrders,
  vendorListProducts,
  vendorListReturns,
} from '../../../lib/api';
import { getApiErrorMessage } from '../../../lib/api-error';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';

type ApplyVendorForm = {
  name: string;
  country: string;
  currency: 'USD' | 'MMK';
  commissionPct: string;
};

const EMPTY_FORM: ApplyVendorForm = {
  name: '',
  country: 'US',
  currency: 'USD',
  commissionPct: '10',
};

type VendorPageProps = {
  params: { locale: string };
};

export default function VendorHomePage({ params: { locale } }: VendorPageProps) {
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [stats, setStats] = useState({ products: 0, orders: 0, returns: 0 });
  const [form, setForm] = useState<ApplyVendorForm>(EMPTY_FORM);

  async function loadDashboard(token: string) {
    const [productsRes, ordersRes, returnsRes] = await Promise.all([
      vendorListProducts(token),
      vendorListOrders({ limit: 50 }, token),
      vendorListReturns({ limit: 50 }, token),
    ]);
    setStats({
      products: productsRes.items.length,
      orders: ordersRes.items.length,
      returns: returnsRes.items.length,
    });
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
    loadDashboard(accessToken)
      .then(() => {
        if (alive) {
          setNeedsOnboarding(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!alive) {
          return;
        }
        if (err instanceof Error && err.message.includes('404')) {
          setNeedsOnboarding(true);
          setError(null);
        } else if (err instanceof Error && err.message.includes('403')) {
          setNeedsOnboarding(true);
          setError('Verify email before vendor onboarding.');
        } else {
          setError(getApiErrorMessage(err, 'Failed to load vendor workspace.'));
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

  async function onApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const created = await applyVendor(
        {
          name: form.name.trim(),
          country: form.country.toUpperCase(),
          currency: form.currency,
          commissionPct: Number(form.commissionPct),
        },
        accessToken,
      );
      setNeedsOnboarding(false);
      setMessage(`Vendor application submitted with status ${created.status}.`);
      await loadDashboard(accessToken);
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Failed to submit vendor application. Ensure email is verified.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <section className="surface p-5 text-sm text-[#5d6486]">Loading vendor workspace...</section>;
  }

  if (needsOnboarding) {
    return (
      <section className="surface p-5 md:p-6">
        <h2 className="text-xl font-semibold text-[#181f46]">Vendor onboarding</h2>
        <p className="mt-1 text-sm text-[#5d6486]">
          Create your vendor profile first. Email verification is required.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg border border-[#ffd7dd] bg-[#fff5f6] px-3 py-2 text-sm text-[#b12f43]">
            {error}
          </p>
        ) : null}
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onApply}>
          <input
            className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm md:col-span-2"
            placeholder="Store name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
            placeholder="Country (US/MM)"
            value={form.country}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
            required
          />
          <select
            className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
            value={form.currency}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, currency: event.target.value as ApplyVendorForm['currency'] }))
            }
          >
            <option value="USD">USD</option>
            <option value="MMK">MMK</option>
          </select>
          <input
            className="rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
            type="number"
            min={0}
            max={100}
            value={form.commissionPct}
            onChange={(event) => setForm((prev) => ({ ...prev, commissionPct: event.target.value }))}
            required
          />
          <div className="md:col-span-2">
            <button
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit vendor application'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {message ? (
        <div className="surface border-[#d1eeda] bg-[#f1fbf4] p-4 text-sm text-[#17724b]">{message}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="surface border border-[#dbe4ff] bg-gradient-to-br from-white to-[#f5f8ff] p-4">
          <p className="text-sm text-[#5d6486]">Products</p>
          <p className="mt-2 text-2xl font-semibold text-[#17204d]">{stats.products}</p>
          <p className="mt-1 text-xs text-[#6a739c]">Published + draft catalog items</p>
        </article>
        <article className="surface border border-[#dbe4ff] bg-gradient-to-br from-white to-[#f5f8ff] p-4">
          <p className="text-sm text-[#5d6486]">Orders</p>
          <p className="mt-2 text-2xl font-semibold text-[#17204d]">{stats.orders}</p>
          <p className="mt-1 text-xs text-[#6a739c]">Orders waiting for processing</p>
        </article>
        <article className="surface border border-[#dbe4ff] bg-gradient-to-br from-white to-[#f5f8ff] p-4">
          <p className="text-sm text-[#5d6486]">Returns</p>
          <p className="mt-2 text-2xl font-semibold text-[#17204d]">{stats.returns}</p>
          <p className="mt-1 text-xs text-[#6a739c]">Return requests from customers</p>
        </article>
      </div>

      <div className="surface p-5">
        <h2 className="text-lg font-semibold text-[#181f46]">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" href={`/${locale}/vendor/products`}>
            Manage products
          </Link>
          <Link
            className="rounded-xl border border-[#c7d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#3349ad]"
            href={`/${locale}/vendor/orders`}
          >
            Manage orders
          </Link>
          <Link
            className="rounded-xl border border-[#c7d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#3349ad]"
            href={`/${locale}/vendor/shipping`}
          >
            Manage shipping
          </Link>
          <Link
            className="rounded-xl border border-[#c7d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#3349ad]"
            href={`/${locale}/vendor/returns`}
          >
            Manage returns
          </Link>
        </div>
      </div>
    </section>
  );
}
