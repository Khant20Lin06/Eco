'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  addCartItem,
  addWishlistItem,
  CategoryItem,
  listCategories,
  listProducts,
  listTags,
  listWishlist,
  ProductItem,
  removeWishlistItem,
  TagItem,
} from '../../../lib/api';
import VariantPickerModal from '../../../components/product/VariantPickerModal';
import { useAuthSession } from '../../../lib/hooks/use-auth-session';
import { notifyHeaderCountsRefresh } from '../../../lib/ui-events';
import {
  AppCurrency,
  CURRENCY_PREFERENCE_CHANGED_EVENT,
  getClientCurrencyPreference,
  normalizeCurrencyCode,
} from '../../../lib/preferences';

type ProductsPageProps = {
  params: { locale: string };
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24">
      <path
        d="m20.84 4.61-.01-.01a5.5 5.5 0 0 0-7.78 0L12 5.65l-1.05-1.04a5.5 5.5 0 0 0-7.78 7.78l1.05 1.04L12 21l7.78-7.57 1.05-1.04a5.5 5.5 0 0 0 .01-7.78z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function priceLabel(value: number, currency: string) {
  const amount = value / (currency === 'USD' ? 100 : 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2
  }).format(amount);
}

export default function ProductsPage({ params: { locale } }: ProductsPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get('categoryId') ?? '';
  const queryParam = searchParams.get('q') ?? '';
  const { accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [wishlistProductIds, setWishlistProductIds] = useState<string[]>([]);
  const [pickerProduct, setPickerProduct] = useState<ProductItem | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<AppCurrency>(
    getClientCurrencyPreference()
  );

  const [q, setQ] = useState(queryParam);
  const [categoryId, setCategoryId] = useState(categoryParam);
  const [tagId, setTagId] = useState('');

  useEffect(() => {
    setCategoryId(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    setQ(queryParam);
  }, [queryParam]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      listProducts({ limit: 30, locale }),
      listCategories({ locale }),
      listTags({ locale })
    ])
      .then(([productRes, categoryRes, tagRes]) => {
        if (!alive) {
          return;
        }
        setProducts(productRes.items);
        setCategories(categoryRes.items);
        setTags(tagRes.items);
        setError(null);
      })
      .catch(() => {
        if (alive) {
          setError('Failed to load products');
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

  useEffect(() => {
    if (!accessToken) {
      setWishlistProductIds([]);
      return;
    }

    let alive = true;
    listWishlist(accessToken)
      .then((res) => {
        if (!alive) {
          return;
        }
        setWishlistProductIds(res.items.map((item) => item.productId));
      })
      .catch(() => {
        if (alive) {
          setWishlistProductIds([]);
        }
      });

    return () => {
      alive = false;
    };
  }, [accessToken]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AppCurrency>).detail;
      setSelectedCurrency(normalizeCurrencyCode(detail));
    };

    window.addEventListener(CURRENCY_PREFERENCE_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(CURRENCY_PREFERENCE_CHANGED_EVENT, handler);
    };
  }, []);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchQ = !q || `${product.title} ${product.description}`.toLowerCase().includes(q.toLowerCase());
      const matchCategory = !categoryId || product.categoryId === categoryId;
      const matchTag = !tagId || (product.tags ?? []).some((row) => row.tagId === tagId);
      const currency = normalizeCurrencyCode(product.variants[0]?.currency);
      const matchCurrency = currency === selectedCurrency;
      return matchQ && matchCategory && matchTag && matchCurrency;
    });
  }, [products, q, categoryId, tagId, selectedCurrency]);

  function onAddToCart(product: ProductItem) {
    if (!accessToken) {
      setMessage('Please login as customer/vendor first.');
      router.push(`/${locale}/login`);
      return;
    }
    if (product.variants.length === 0) {
      setMessage('No purchasable variant.');
      return;
    }
    setPickerProduct(product);
  }

  async function onConfirmAddToCart(input: { variantId: string; qty: number }) {
    if (!pickerProduct || !accessToken) {
      return;
    }

    try {
      await addCartItem(input, accessToken);
      notifyHeaderCountsRefresh();
      setMessage(`Added "${pickerProduct.title}" to cart`);
      setPickerProduct(null);
      router.push(`/${locale}/cart`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setMessage('Single-vendor cart only. Clear cart first.');
        setPickerProduct(null);
        router.push(`/${locale}/cart`);
      } else {
        setMessage('Failed to add item');
      }
    }
  }

  async function onToggleWishlist(product: ProductItem) {
    if (!accessToken) {
      setMessage('Please login first.');
      router.push(`/${locale}/login`);
      return;
    }

    const saved = wishlistProductIds.includes(product.id);
    try {
      if (saved) {
        await removeWishlistItem(product.id, accessToken);
        setWishlistProductIds((prev) => prev.filter((id) => id !== product.id));
        notifyHeaderCountsRefresh();
        setMessage('Removed from wishlist');
      } else {
        await addWishlistItem(product.id, accessToken);
        setWishlistProductIds((prev) => [...prev, product.id]);
        notifyHeaderCountsRefresh();
        setMessage('Saved to wishlist');
      }
    } catch {
      setMessage('Failed to update wishlist');
    }
  }

  return (
    <section className="space-y-4">
      <div className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#181f46]">Discover Sustainable Products</h1>
            <p className="mt-1 text-sm text-[#5d6486]">Search by keyword, category and sustainability tags.</p>
          </div>
          <Link className="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold" href={`/${locale}/cart`}>
            Go To Cart
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-lg border border-[#d3dcff] bg-white px-3 py-2 text-sm"
            placeholder="Search product name or detail"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <select
            className="rounded-lg border border-[#d3dcff] bg-white px-3 py-2 text-sm"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-[#d3dcff] bg-white px-3 py-2 text-sm"
            value={tagId}
            onChange={(event) => setTagId(event.target.value)}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <div className="rounded-lg border border-[#d3dcff] bg-[#f9fbff] px-3 py-2 text-sm text-[#42538f]">
            {filtered.length} product(s) - {selectedCurrency}
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-2 text-sm text-[#24316a]">{message}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {filtered.map((product) => {
          const variant = product.variants[0];
          const image = product.images[0]?.url;
          const saved = wishlistProductIds.includes(product.id);
          return (
            <article key={product.id} className="surface overflow-hidden">
              <div className="relative h-44 w-full bg-gradient-to-br from-[#ffe7ed] to-[#e7ecff]">
                <button
                  aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                  className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur ${
                    saved
                      ? 'border-[#ffb0be] bg-[#fff2f5] text-[#d93a54]'
                      : 'border-white/70 bg-white/85 text-[#33417b]'
                  }`}
                  onClick={() => onToggleWishlist(product)}
                  type="button"
                >
                  <HeartIcon filled={saved} />
                </button>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={product.title} className="h-full w-full object-cover" src={image} />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-[#6b749c]">No image</div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h2 className="line-clamp-1 text-base font-semibold text-[#1b2148]">{product.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-[#5d6486]">{product.description}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(product.tags ?? []).slice(0, 3).map((row) => (
                    <span key={row.id} className="chip bg-[#f1f5ff] text-[#455599]">
                      {row.tag?.name ?? 'tag'}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#19235f]">
                    {variant ? priceLabel(variant.price, variant.currency) : '-'}
                  </p>
                  <span className="text-xs text-[#5d6486]">Stock {variant?.stockQty ?? 0}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    className="rounded-lg border border-[#c9d6ff] px-3 py-2 text-center text-sm font-medium text-[#3d4d95]"
                    href={`/${locale}/product/${product.id}`}
                  >
                    Detail
                  </Link>
                  <button
                    className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold"
                    onClick={() => onAddToCart(product)}
                    type="button"
                  >
                    Add Cart
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-[#5d6486]">No products found.</div>
      ) : null}

      <VariantPickerModal
        locale={locale}
        onClose={() => setPickerProduct(null)}
        onConfirm={onConfirmAddToCart}
        open={Boolean(pickerProduct)}
        title={pickerProduct?.title ?? ''}
        variants={pickerProduct?.variants ?? []}
      />
    </section>
  );
}
