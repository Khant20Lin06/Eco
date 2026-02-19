'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  adminGetStats,
  adminListVendors,
  CategoryItem,
  listCategories,
  listTags,
  TagItem,
} from '../../../lib/api';
import { useAdminAccessToken } from '../../../components/admin/useAdminAccessToken';

type AdminHomePageProps = {
  params: { locale: string };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminHomePage({ params: { locale } }: AdminHomePageProps) {
  const { ready, accessToken } = useAdminAccessToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    userCount: 0,
    vendorCount: 0,
    pendingVendorCount: 0,
  });
  const [vendors, setVendors] = useState<
    { id: string; name: string; status: string; createdAt: string }[]
  >([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

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
    Promise.all([adminGetStats(accessToken), adminListVendors(accessToken), listTags(), listCategories()])
      .then(([statsRes, vendorRes, tagRes, categoryRes]) => {
        if (!alive) {
          return;
        }
        setStats(statsRes);
        setVendors(vendorRes.items);
        setTags(tagRes.items);
        setCategories(categoryRes.items);
        setError(null);
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setError('Failed to load admin dashboard data.');
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

  const pendingVendors = useMemo(() => {
    if (stats.pendingVendorCount > 0 || vendors.length === 0) {
      return stats.pendingVendorCount;
    }
    return vendors.filter((vendor) => vendor.status === 'PENDING').length;
  }, [stats.pendingVendorCount, vendors]);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '-' : stats.userCount}</p>
          <p className="mt-1 text-xs text-slate-500">All customer/vendor/admin accounts</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Vendors</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '-' : stats.vendorCount}</p>
          <p className="mt-1 text-xs text-amber-700">{loading ? '' : `${pendingVendors} pending approval`}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active Tags</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '-' : tags.length}</p>
          <p className="mt-1 text-xs text-slate-500">Public catalog tags</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{loading ? '-' : categories.length}</p>
          <p className="mt-1 text-xs text-slate-500">Catalog taxonomy nodes</p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Recent Vendor Applications</h2>
          <Link className="text-sm font-medium text-blue-700 hover:underline" href={`/${locale}/admin/vendors`}>
            Manage vendors
          </Link>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {vendors.slice(0, 5).map((vendor) => (
                <tr key={vendor.id} className="border-b border-slate-100 text-sm text-slate-700">
                  <td className="py-3 pr-3">{vendor.name}</td>
                  <td className="py-3 pr-3">
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
                  <td className="py-3 pr-3">{formatDate(vendor.createdAt)}</td>
                </tr>
              ))}
              {!loading && vendors.length === 0 ? (
                <tr>
                  <td className="py-5 text-sm text-slate-500" colSpan={3}>
                    No vendors found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
