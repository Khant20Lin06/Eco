'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import AdminModal from '../../../../components/admin/AdminModal';
import {
  CategoryItem,
  ProductItem,
  ProductVariant,
  TagItem,
  listCategories,
  listTags,
  presignUpload,
  vendorDeleteVariant,
  vendorAddProductImages,
  vendorCreateProduct,
  vendorCreateVariant,
  vendorDeleteProduct,
  vendorListProducts,
  vendorUpdateProduct,
  vendorUpdateVariant
} from '../../../../lib/api';
import { getApiErrorMessage } from '../../../../lib/api-error';
import { useAuthSession } from '../../../../lib/hooks/use-auth-session';

type ProductStatus = ProductItem['status'];

type ProductFormState = {
  title: string;
  description: string;
  categoryId: string;
  status: ProductStatus;
  tagIds: string[];
};

type OptionRow = {
  key: string;
  name: string;
  value: string;
};

type VariantFormState = {
  sku: string;
  options: OptionRow[];
  price: string;
  currency: 'USD' | 'MMK';
  stockQty: string;
  weightG: string;
};

type UploadDraft = {
  key: string;
  file: File;
  altText: string;
  sortOrder: number;
};

const EMPTY_PRODUCT_FORM: ProductFormState = {
  title: '',
  description: '',
  categoryId: '',
  status: 'ACTIVE',
  tagIds: []
};

const EMPTY_VARIANT_FORM: VariantFormState = {
  sku: '',
  options: [{ key: createLocalKey(), name: 'Size', value: '' }],
  price: '0',
  currency: 'USD',
  stockQty: '0',
  weightG: ''
};

function createLocalKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMoney(amount: number, currency: string) {
  const value = amount / (currency === 'USD' ? 100 : 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2
  }).format(value);
}

function statusClass(status: ProductStatus) {
  if (status === 'ACTIVE') {
    return 'chip chip-success';
  }
  if (status === 'DRAFT') {
    return 'chip chip-warn';
  }
  return 'chip chip-danger';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function VendorProductsPage() {
  const { ready, accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [search, setSearch] = useState('');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);

  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantProductId, setVariantProductId] = useState<string | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormState>(EMPTY_VARIANT_FORM);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProductId, setUploadProductId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadDraft[]>([]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return products;
    }
    return products.filter((product) => {
      return (
        product.title.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        (categoryMap.get(product.categoryId)?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [categoryMap, products, search]);

  const currentVariantProduct = useMemo(() => {
    if (!variantProductId) {
      return null;
    }
    return products.find((item) => item.id === variantProductId) ?? null;
  }, [products, variantProductId]);

  const currentUploadProduct = useMemo(() => {
    if (!uploadProductId) {
      return null;
    }
    return products.find((item) => item.id === uploadProductId) ?? null;
  }, [products, uploadProductId]);

  async function loadData(token: string) {
    const [productsRes, categoriesRes, tagsRes] = await Promise.all([
      vendorListProducts(token),
      listCategories(),
      listTags()
    ]);

    setProducts(productsRes.items);
    setCategories(categoriesRes.items);
    setTags(tagsRes.items);
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

    let active = true;
    setLoading(true);
    loadData(accessToken)
      .then(() => {
        if (!active) {
          return;
        }
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(getApiErrorMessage(err, 'Failed to load vendor catalog.'));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [ready, accessToken]);

  function resetProductForm(defaultCategoryId?: string) {
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      categoryId: defaultCategoryId ?? categories[0]?.id ?? ''
    });
  }

  function openCreateProductModal() {
    setEditingProductId(null);
    resetProductForm();
    setProductModalOpen(true);
    setError(null);
  }

  function openEditProductModal(product: ProductItem) {
    setEditingProductId(product.id);
    setProductForm({
      title: product.title,
      description: product.description,
      categoryId: product.categoryId,
      status: product.status,
      tagIds: (product.tags ?? []).map((item) => item.tagId)
    });
    setProductModalOpen(true);
    setError(null);
  }

  function closeProductModal() {
    setProductModalOpen(false);
    setEditingProductId(null);
    resetProductForm();
  }

  function openCreateVariantModal(product: ProductItem) {
    const defaultCurrency = (product.variants[0]?.currency as 'USD' | 'MMK' | undefined) ?? 'USD';
    setVariantProductId(product.id);
    setEditingVariantId(null);
    setVariantForm({
      ...EMPTY_VARIANT_FORM,
      currency: defaultCurrency
    });
    setVariantModalOpen(true);
    setError(null);
  }

  function openEditVariantModal(product: ProductItem, variant: ProductVariant) {
    const mappedOptions = (variant.options ?? []).map((item) => ({
      key: createLocalKey(),
      name: item.name,
      value: item.value
    }));

    setVariantProductId(product.id);
    setEditingVariantId(variant.id);
    setVariantForm({
      sku: variant.sku,
      options:
        mappedOptions.length > 0
          ? mappedOptions
          : [{ key: createLocalKey(), name: 'Size', value: '' }],
      price: String(variant.price),
      currency: (variant.currency as 'USD' | 'MMK' | undefined) ?? 'USD',
      stockQty: String(variant.stockQty),
      weightG: variant.weightG == null ? '' : String(variant.weightG)
    });
    setVariantModalOpen(true);
    setError(null);
  }

  function closeVariantModal() {
    setVariantModalOpen(false);
    setVariantProductId(null);
    setEditingVariantId(null);
    setVariantForm(EMPTY_VARIANT_FORM);
  }

  function openUploadModal(product: ProductItem) {
    setUploads([]);
    setUploadProductId(product.id);
    setUploadModalOpen(true);
    setError(null);
    setMessage(`Attach images for "${product.title}".`);
  }

  function closeUploadModal() {
    setUploadModalOpen(false);
    setUploadProductId(null);
    setUploads([]);
  }

  function toggleTag(tagId: string) {
    setProductForm((prev) => {
      const hasTag = prev.tagIds.includes(tagId);
      return {
        ...prev,
        tagIds: hasTag ? prev.tagIds.filter((id) => id !== tagId) : [...prev.tagIds, tagId]
      };
    });
  }

  function addOptionRow() {
    setVariantForm((prev) => ({
      ...prev,
      options: [...prev.options, { key: createLocalKey(), name: '', value: '' }]
    }));
  }

  function updateOptionRow(key: string, field: 'name' | 'value', value: string) {
    setVariantForm((prev) => ({
      ...prev,
      options: prev.options.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    }));
  }

  function removeOptionRow(key: string) {
    setVariantForm((prev) => {
      if (prev.options.length <= 1) {
        return prev;
      }
      return { ...prev, options: prev.options.filter((item) => item.key !== key) };
    });
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    if (!productForm.categoryId) {
      setError('Category is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingProductId) {
        await vendorUpdateProduct(
          editingProductId,
          {
            title: productForm.title.trim(),
            description: productForm.description.trim(),
            categoryId: productForm.categoryId,
            status: productForm.status,
            tagIds: productForm.tagIds
          },
          accessToken
        );
        setMessage('Product updated.');
      } else {
        await vendorCreateProduct(
          {
            title: productForm.title.trim(),
            description: productForm.description.trim(),
            categoryId: productForm.categoryId,
            tagIds: productForm.tagIds
          },
          accessToken
        );
        setMessage('Product created.');
      }

      await loadData(accessToken);
      closeProductModal();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save product.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!accessToken) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await vendorDeleteProduct(productId, accessToken);
      await loadData(accessToken);
      if (result.mode === 'DELETED') {
        setMessage('Product deleted.');
      } else {
        setMessage('Product has orders, so it was archived instead.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete product.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariant(productId: string, variantId: string, reservedQty: number) {
    if (!accessToken) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await vendorDeleteVariant(productId, variantId, accessToken);
      await loadData(accessToken);
      if (result.mode === 'DISABLED') {
        setMessage('Variant is linked to orders, so stock was set to reserved quantity (disabled for new sales).');
      } else {
        setMessage('Variant deleted.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        try {
          await vendorUpdateVariant(
            productId,
            variantId,
            {
              stockQty: reservedQty
            },
            accessToken
          );
          await loadData(accessToken);
          setMessage('Variant is linked to orders. It was disabled by setting stock to reserved quantity.');
        } catch (fallbackErr) {
          setError(
            getApiErrorMessage(
              fallbackErr,
              'This variant is already used by orders, so it cannot be deleted.'
            )
          );
        }
      } else {
        setError(getApiErrorMessage(err, 'Failed to delete variant.'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function setProductStatus(productId: string, status: ProductStatus) {
    if (!accessToken) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await vendorUpdateProduct(productId, { status }, accessToken);
      await loadData(accessToken);
      setMessage(`Product marked ${status}.`);
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to mark product ${status}.`));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !variantProductId) {
      return;
    }

    const parsedPrice = Number(variantForm.price);
    const parsedStock = Number(variantForm.stockQty);
    const parsedWeight = variantForm.weightG.trim() ? Number(variantForm.weightG) : undefined;

    if (!variantForm.sku.trim()) {
      setError('SKU is required.');
      return;
    }
    if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
      setError('Price must be a non-negative integer (smallest unit).');
      return;
    }
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError('Stock must be a non-negative integer.');
      return;
    }
    if (parsedWeight != null && (!Number.isInteger(parsedWeight) || parsedWeight < 0)) {
      setError('Weight must be a non-negative integer.');
      return;
    }

    const options = variantForm.options
      .map((item) => ({
        name: item.name.trim(),
        value: item.value.trim()
      }))
      .filter((item) => item.name && item.value);

    if (options.length === 0) {
      setError('At least one variant option is required (e.g. Size, Color).');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (editingVariantId) {
        await vendorUpdateVariant(
          variantProductId,
          editingVariantId,
          {
            sku: variantForm.sku.trim(),
            options,
            price: parsedPrice,
            stockQty: parsedStock,
            weightG: parsedWeight
          },
          accessToken
        );
        setMessage('Variant updated.');
      } else {
        await vendorCreateVariant(
          variantProductId,
          {
            sku: variantForm.sku.trim(),
            options,
            price: parsedPrice,
            currency: variantForm.currency,
            stockQty: parsedStock,
            weightG: parsedWeight
          },
          accessToken
        );
        setMessage('Variant created.');
      }

      await loadData(accessToken);
      closeVariantModal();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save variant.'));
    } finally {
      setSaving(false);
    }
  }

  function onSelectUploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    if (!fileList || !currentUploadProduct) {
      return;
    }

    const baseSortOrder = currentUploadProduct.images.length + uploads.length;
    const selected = Array.from(fileList).map((file, index) => ({
      key: createLocalKey(),
      file,
      altText: '',
      sortOrder: baseSortOrder + index
    }));

    setUploads((prev) => [...prev, ...selected]);
    event.target.value = '';
  }

  function updateUploadDraft(key: string, field: 'altText' | 'sortOrder', value: string) {
    setUploads((prev) =>
      prev.map((item) => {
        if (item.key !== key) {
          return item;
        }
        if (field === 'sortOrder') {
          const nextSortOrder = Number(value);
          return {
            ...item,
            sortOrder: Number.isInteger(nextSortOrder) && nextSortOrder >= 0 ? nextSortOrder : item.sortOrder
          };
        }
        return { ...item, altText: value };
      })
    );
  }

  function removeUploadDraft(key: string) {
    setUploads((prev) => prev.filter((item) => item.key !== key));
  }

  async function handleUploadImages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !uploadProductId) {
      return;
    }
    if (uploads.length === 0) {
      setError('Select at least one image file.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Array<{ url: string; altText?: string; sortOrder?: number }> = [];
      let usedFallback = false;

      for (const upload of uploads) {
        const contentType = upload.file.type || 'image/jpeg';
        try {
          const presigned = await presignUpload(
            {
              filename: upload.file.name,
              contentType,
              size: upload.file.size
            },
            accessToken
          );

          const uploadRes = await fetch(presigned.url, {
            method: 'PUT',
            headers: {
              'Content-Type': contentType
            },
            body: upload.file
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed for ${upload.file.name}`);
          }

          payload.push({
            url: presigned.publicUrl ?? presigned.url.split('?')[0] ?? presigned.url,
            altText: upload.altText.trim() || undefined,
            sortOrder: upload.sortOrder
          });
        } catch {
          if (upload.file.size > 200 * 1024) {
            throw new Error(
              `S3 upload unavailable and fallback supports files up to 200KB only (${upload.file.name}).`
            );
          }
          const inlineDataUrl = await fileToDataUrl(upload.file);
          payload.push({
            url: inlineDataUrl,
            altText: upload.altText.trim() || undefined,
            sortOrder: upload.sortOrder
          });
          usedFallback = true;
        }
      }

      await vendorAddProductImages(
        uploadProductId,
        {
          images: payload
        },
        accessToken
      );

      await loadData(accessToken);
      closeUploadModal();
      if (usedFallback) {
        setMessage('Images attached with local fallback. Configure S3/MinIO to use object storage upload.');
      } else {
        setMessage('Images uploaded and attached to product.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Image upload failed.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="space-y-4">
        <div className="surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#181f46]">Vendor Products</h2>
              <p className="mt-1 text-sm text-[#5d6486]">
                Full product CRUD, variant management and image attachment from backend APIs.
              </p>
            </div>
            <button
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
              onClick={openCreateProductModal}
              type="button"
            >
              Create Product
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="min-w-[260px] flex-1 rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
              placeholder="Search title, category or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              className="rounded-xl border border-[#c7d4ff] bg-white px-3 py-2 text-sm font-semibold text-[#3349ad]"
              onClick={() => accessToken && loadData(accessToken)}
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

        {loading ? (
          <div className="surface p-4 text-sm text-[#5d6486]">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="surface p-4 text-sm text-[#5d6486]">No products found.</div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => {
              const firstImage = product.images[0];
              const categoryName = categoryMap.get(product.categoryId)?.name ?? product.categoryId;
              return (
                <article key={product.id} className="surface overflow-hidden">
                  <div className="border-b border-[#e2e8ff] bg-[#f8faff] px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {firstImage?.url ? (
                          <img
                            src={firstImage.url}
                            alt={firstImage.altText ?? product.title}
                            className="h-14 w-14 rounded-xl border border-[#d6defb] object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#d6defb] bg-white text-xs text-[#7a84b3]">
                            No image
                          </div>
                        )}
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] text-[#6874a3]">
                            {categoryName}
                          </p>
                          <h3 className="mt-0.5 text-lg font-semibold text-[#18204d]">{product.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={statusClass(product.status)}>{product.status}</span>
                            <span className="text-xs text-[#6d76a2]">
                              Variants: {product.variants.length} • Images: {product.images.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border border-[#bcd1ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3550c0]"
                          onClick={() => openEditProductModal(product)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg border border-[#bcd1ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3550c0]"
                          onClick={() => openCreateVariantModal(product)}
                          type="button"
                        >
                          Add Variant
                        </button>
                        <button
                          className="rounded-lg border border-[#bcd1ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3550c0]"
                          onClick={() => openUploadModal(product)}
                          type="button"
                        >
                          Attach Image
                        </button>
                        {product.status !== 'ARCHIVED' ? (
                          <button
                            className="rounded-lg border border-[#ffc2cd] bg-white px-3 py-1.5 text-xs font-semibold text-[#c33f53] disabled:opacity-60"
                            onClick={() => deleteProduct(product.id)}
                            type="button"
                            disabled={saving}
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            className="rounded-lg border border-[#bcd1ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#3550c0] disabled:opacity-60"
                            onClick={() => setProductStatus(product.id, 'ACTIVE')}
                            type="button"
                            disabled={saving}
                          >
                            Restore ACTIVE
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <p className="text-sm text-[#2d396d]">{product.description}</p>

                    <div className="flex flex-wrap gap-1.5">
                      {(product.tags ?? []).length === 0 ? (
                        <span className="text-xs text-[#6f78a4]">No tags</span>
                      ) : (
                        (product.tags ?? []).map((entry) => (
                          <span key={entry.id} className="rounded-full bg-[#eef3ff] px-2 py-1 text-xs text-[#3352ba]">
                            {entry.tag?.name ?? entry.tagId}
                          </span>
                        ))
                      )}
                    </div>

                    <section className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[#1f2858]">Variants</h4>
                        <span className="text-xs text-[#6c76a5]">{product.variants.length} items</span>
                      </div>

                      {product.variants.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#d9e1ff] bg-[#fbfcff] px-3 py-3 text-xs text-[#7181b7]">
                          No variants yet. Add variant to enable cart selection.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-[#d9e1ff]">
                          <table className="w-full min-w-[760px] border-collapse">
                            <thead className="bg-[#f8faff]">
                              <tr className="text-left text-xs uppercase tracking-wide text-[#6a739c]">
                                <th className="px-2 py-2">SKU</th>
                                <th className="px-2 py-2">Options</th>
                                <th className="px-2 py-2">Price</th>
                                <th className="px-2 py-2">Stock</th>
                                <th className="px-2 py-2">Reserved</th>
                                <th className="px-2 py-2">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {product.variants.map((variant) => (
                                <tr key={variant.id} className="border-t border-[#edf1ff] text-sm text-[#334172]">
                                  <td className="px-2 py-2">{variant.sku}</td>
                                  <td className="px-2 py-2">
                                    {(variant.options ?? [])
                                      .map((item) => `${item.name}: ${item.value}`)
                                      .join(' • ') || '-'}
                                  </td>
                                  <td className="px-2 py-2">{formatMoney(variant.price, variant.currency)}</td>
                                  <td className="px-2 py-2">{variant.stockQty}</td>
                                  <td className="px-2 py-2">{variant.reservedQty}</td>
                                  <td className="px-2 py-2">
                                    <div className="flex gap-2">
                                      <button
                                        className="rounded-lg border border-[#bcd1ff] bg-white px-2 py-1 text-xs font-semibold text-[#3550c0]"
                                        onClick={() => openEditVariantModal(product, variant)}
                                        type="button"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="rounded-lg border border-[#ffc2cd] bg-white px-2 py-1 text-xs font-semibold text-[#c33f53] disabled:opacity-60"
                                        onClick={() => deleteVariant(product.id, variant.id, variant.reservedQty)}
                                        type="button"
                                        disabled={saving}
                                      >
                                        Delete
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

                    <section className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[#1f2858]">Attached Images</h4>
                        <span className="text-xs text-[#6c76a5]">{product.images.length} files</span>
                      </div>
                      {product.images.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#d9e1ff] bg-[#fbfcff] px-3 py-3 text-xs text-[#7181b7]">
                          No images attached.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {product.images.map((image) => (
                            <figure
                              key={image.id}
                              className="w-[108px] overflow-hidden rounded-xl border border-[#d7dffd] bg-white"
                            >
                              <img
                                src={image.url}
                                alt={image.altText ?? product.title}
                                className="h-20 w-full object-cover"
                              />
                              <figcaption className="px-2 py-1 text-[11px] text-[#65709f]">
                                #{image.sortOrder}
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <AdminModal
        open={productModalOpen}
        title={editingProductId ? 'Update Product' : 'Create Product'}
        onClose={closeProductModal}
      >
        <form className="space-y-3" onSubmit={handleSaveProduct}>
          <label className="block text-sm font-semibold text-[#2b376b]">
            Title
            <input
              className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
              value={productForm.title}
              onChange={(event) => setProductForm((prev) => ({ ...prev, title: event.target.value }))}
              minLength={2}
              maxLength={120}
              required
            />
          </label>

          <label className="block text-sm font-semibold text-[#2b376b]">
            Description
            <textarea
              className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
              value={productForm.description}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, description: event.target.value }))
              }
              minLength={10}
              rows={5}
              required
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[#2b376b]">
              Category
              <select
                className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                value={productForm.categoryId}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))
                }
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-[#2b376b]">
              Status
              <select
                className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                value={productForm.status}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, status: event.target.value as ProductStatus }))
                }
                disabled={!editingProductId}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
              {!editingProductId ? (
                <p className="mt-1 text-xs text-[#6f78a7]">New product defaults to ACTIVE by backend logic.</p>
              ) : null}
            </label>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#2b376b]">Sustainability Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => {
                const checked = productForm.tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      checked
                        ? 'border-[#3550be] bg-[#3550be] text-white'
                        : 'border-[#cad6ff] bg-white text-[#334278]'
                    }`}
                    onClick={() => toggleTag(tag.id)}
                    type="button"
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-[#cad6ff] px-4 py-2 text-sm font-semibold text-[#3349ad]"
              type="button"
              onClick={closeProductModal}
            >
              Cancel
            </button>
            <button
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={variantModalOpen}
        title={editingVariantId ? 'Update Variant' : 'Create Variant'}
        onClose={closeVariantModal}
      >
        <form className="space-y-3" onSubmit={handleSaveVariant}>
          <p className="text-xs text-[#6f78a7]">
            Product: <span className="font-semibold text-[#2a3564]">{currentVariantProduct?.title ?? '-'}</span>
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[#2b376b]">
              SKU
              <input
                className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                value={variantForm.sku}
                onChange={(event) => setVariantForm((prev) => ({ ...prev, sku: event.target.value }))}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[#2b376b]">
              Currency
              <select
                className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                value={variantForm.currency}
                onChange={(event) =>
                  setVariantForm((prev) => ({
                    ...prev,
                    currency: event.target.value as 'USD' | 'MMK'
                  }))
                }
              >
                <option value="USD">USD</option>
                <option value="MMK">MMK</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-[#2b376b]">
              Price (smallest unit)
              <input
                className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                type="number"
                min={0}
                value={variantForm.price}
                onChange={(event) => setVariantForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[#2b376b]">
              Stock Qty
              <input
                className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                type="number"
                min={0}
                value={variantForm.stockQty}
                onChange={(event) => setVariantForm((prev) => ({ ...prev, stockQty: event.target.value }))}
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[#2b376b] md:col-span-2">
              Weight (grams, optional)
              <input
                className="mt-1 w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
                type="number"
                min={0}
                value={variantForm.weightG}
                onChange={(event) => setVariantForm((prev) => ({ ...prev, weightG: event.target.value }))}
              />
            </label>
          </div>

          <div className="rounded-xl border border-[#dbe2ff] bg-[#f9fbff] p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#2b376b]">Variant Options</p>
              <button
                className="rounded-lg border border-[#bcd1ff] bg-white px-2 py-1 text-xs font-semibold text-[#3550c0]"
                onClick={addOptionRow}
                type="button"
              >
                Add Option
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {variantForm.options.map((option) => (
                <div key={option.key} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="rounded-lg border border-[#cfd9ff] px-3 py-2 text-sm"
                    placeholder="Option name (e.g. Size)"
                    value={option.name}
                    onChange={(event) => updateOptionRow(option.key, 'name', event.target.value)}
                    required
                  />
                  <input
                    className="rounded-lg border border-[#cfd9ff] px-3 py-2 text-sm"
                    placeholder="Value (e.g. M)"
                    value={option.value}
                    onChange={(event) => updateOptionRow(option.key, 'value', event.target.value)}
                    required
                  />
                  <button
                    className="rounded-lg border border-[#ffc2cd] bg-white px-3 py-2 text-xs font-semibold text-[#c33f53]"
                    onClick={() => removeOptionRow(option.key)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-[#cad6ff] px-4 py-2 text-sm font-semibold text-[#3349ad]"
              type="button"
              onClick={closeVariantModal}
            >
              Cancel
            </button>
            <button
              className="btn-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingVariantId ? 'Update Variant' : 'Create Variant'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={uploadModalOpen} title="Attach Product Images" onClose={closeUploadModal}>
        <form className="space-y-3" onSubmit={handleUploadImages}>
          <p className="text-xs text-[#6f78a7]">
            Product: <span className="font-semibold text-[#2a3564]">{currentUploadProduct?.title ?? '-'}</span>
          </p>

          <label className="block text-sm font-semibold text-[#2b376b]">
            Select files
            <input
              className="mt-1 block w-full rounded-xl border border-[#cfd9ff] px-3 py-2 text-sm"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={onSelectUploadFiles}
            />
          </label>

          {uploads.length === 0 ? (
            <p className="text-xs text-[#6f78a7]">No files selected.</p>
          ) : (
            <div className="space-y-2">
              {uploads.map((upload) => (
                <div key={upload.key} className="rounded-xl border border-[#d9e1ff] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#223065]">{upload.file.name}</p>
                      <p className="text-xs text-[#6f78a7]">
                        {(upload.file.size / 1024).toFixed(1)} KB • {upload.file.type || 'unknown'}
                      </p>
                    </div>
                    <button
                      className="rounded-lg border border-[#ffc2cd] bg-white px-2 py-1 text-xs font-semibold text-[#c33f53]"
                      onClick={() => removeUploadDraft(upload.key)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_140px]">
                    <input
                      className="rounded-lg border border-[#cfd9ff] px-3 py-2 text-sm"
                      placeholder="Alt text (optional)"
                      value={upload.altText}
                      onChange={(event) => updateUploadDraft(upload.key, 'altText', event.target.value)}
                    />
                    <input
                      className="rounded-lg border border-[#cfd9ff] px-3 py-2 text-sm"
                      type="number"
                      min={0}
                      value={upload.sortOrder}
                      onChange={(event) =>
                        updateUploadDraft(upload.key, 'sortOrder', event.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-[#cad6ff] px-4 py-2 text-sm font-semibold text-[#3349ad]"
              type="button"
              onClick={closeUploadModal}
            >
              Cancel
            </button>
            <button
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              type="submit"
              disabled={saving || uploads.length === 0}
            >
              {saving ? 'Uploading...' : 'Upload & Attach'}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
