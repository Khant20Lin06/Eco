'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminModal from '../../../../components/admin/AdminModal';
import { useAdminAccessToken } from '../../../../components/admin/useAdminAccessToken';
import {
  adminCreateCategory,
  adminUpdateCategory,
  CategoryItem,
  listCategories,
} from '../../../../lib/api';

type CategoryFormState = {
  en_name: string;
  mm_name: string;
  slug: string;
  parentId: string;
};

const EMPTY_FORM: CategoryFormState = {
  en_name: '',
  mm_name: '',
  slug: '',
  parentId: '',
};

export default function AdminCategoriesPage() {
  const { ready, accessToken } = useAdminAccessToken();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [selected, setSelected] = useState<CategoryItem | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [updateForm, setUpdateForm] = useState<CategoryFormState>(EMPTY_FORM);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listCategories()
      .then((res) => {
        if (alive) {
          setItems(res.items);
          setError(null);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load categories.');
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
  }, []);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => map.set(item.id, item.en_name));
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return items;
    }
    return items.filter((item) =>
      [item.en_name, item.mm_name, item.slug, item.parentId ?? '']
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, search]);

  async function reloadCategories() {
    const res = await listCategories();
    setItems(res.items);
  }

  function openDetail(item: CategoryItem) {
    setSelected(item);
    setDetailOpen(true);
  }

  function openUpdate(item: CategoryItem) {
    setSelected(item);
    setUpdateForm({
      en_name: item.en_name,
      mm_name: item.mm_name,
      slug: item.slug,
      parentId: item.parentId ?? '',
    });
    setUpdateOpen(true);
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      setError('Admin session not found. Please login again.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminCreateCategory(
        {
          en_name: createForm.en_name.trim(),
          mm_name: createForm.mm_name.trim(),
          slug: createForm.slug.trim(),
          parentId: createForm.parentId || undefined,
        },
        accessToken
      );
      await reloadCategories();
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
    } catch {
      setError('Failed to create category. Check name/slug uniqueness.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selected) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await adminUpdateCategory(
        selected.id,
        {
          en_name: updateForm.en_name.trim(),
          mm_name: updateForm.mm_name.trim(),
          slug: updateForm.slug.trim(),
          parentId: updateForm.parentId || undefined,
        },
        accessToken
      );
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelected(updated);
      setUpdateOpen(false);
    } catch {
      setError('Failed to update category.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Product Categories</h1>
          <p className="text-sm text-slate-500">Admin can create/update/detail category tree.</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {filtered.length} category(s)
          </span>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            Create Category
          </button>
        </div>
      </div>

      <div className="mt-4">
        <input
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search category by en/mm name or slug"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">EN Name</th>
              <th className="px-3 py-3">MM Name</th>
              <th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Parent</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, index) => (
              <tr key={item.id} className="border-t border-slate-100 text-sm text-slate-700">
                <td className="px-3 py-3">{index + 1}</td>
                <td className="px-3 py-3 font-medium text-slate-900">{item.en_name}</td>
                <td className="px-3 py-3">{item.mm_name}</td>
                <td className="px-3 py-3">{item.slug}</td>
                <td className="px-3 py-3">
                  {item.parentId ? categoryNameById.get(item.parentId) ?? item.parentId : '-'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                      onClick={() => openDetail(item)}
                      type="button"
                    >
                      Detail
                    </button>
                    <button
                      className="rounded-md border border-blue-500 px-3 py-1 text-xs font-medium text-blue-700"
                      onClick={() => openUpdate(item)}
                      type="button"
                    >
                      Update
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-slate-500" colSpan={6}>
                  No categories found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminModal open={createOpen} title="Create Category" onClose={() => setCreateOpen(false)}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Category EN name"
            required
            value={createForm.en_name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, en_name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Category MM name"
            required
            value={createForm.mm_name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, mm_name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Slug"
            required
            value={createForm.slug}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, slug: event.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            value={createForm.parentId}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, parentId: event.target.value }))}
          >
            <option value="">No parent</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.en_name}
              </option>
            ))}
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
              disabled={!ready || submitting}
              type="submit"
            >
              {submitting ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={detailOpen} title="Category Detail" onClose={() => setDetailOpen(false)}>
        {selected ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase text-slate-500">EN Name</p>
              <p className="font-medium text-slate-900">{selected.en_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">MM Name</p>
              <p className="font-medium text-slate-900">{selected.mm_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Slug</p>
              <p>{selected.slug}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Parent</p>
              <p>{selected.parentId ? categoryNameById.get(selected.parentId) ?? selected.parentId : '-'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Category ID</p>
              <p className="break-all">{selected.id}</p>
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal open={updateOpen} title="Update Category" onClose={() => setUpdateOpen(false)}>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onUpdate}>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Category EN name"
            required
            value={updateForm.en_name}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, en_name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Category MM name"
            required
            value={updateForm.mm_name}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, mm_name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Slug"
            required
            value={updateForm.slug}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, slug: event.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            value={updateForm.parentId}
            onChange={(event) => setUpdateForm((prev) => ({ ...prev, parentId: event.target.value }))}
          >
            <option value="">No parent</option>
            {items
              .filter((item) => item.id !== selected?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.en_name}
                </option>
              ))}
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
