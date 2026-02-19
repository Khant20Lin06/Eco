'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addCartItem,
  addWishlistItem,
  listCategories,
  listProducts,
  listWishlist,
  type ProductVariant,
  removeWishlistItem,
  type ProductItem
} from '../../lib/api';
import VariantPickerModal from '../product/VariantPickerModal';
import { useAuthSession } from '../../lib/hooks/use-auth-session';
import { notifyHeaderCountsRefresh } from '../../lib/ui-events';
import {
  AppCurrency,
  CURRENCY_PREFERENCE_CHANGED_EVENT,
  getClientCurrencyPreference,
  normalizeCurrencyCode
} from '../../lib/preferences';

type HomeCategory = {
  id: string;
  name: string;
  slug: string;
};

type HomeProduct = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  imageUrl?: string | null;
  price: number | null;
  currency: string | null;
  variants: ProductVariant[];
};

type HomeCatalogSectionProps = {
  locale: string;
  categories: HomeCategory[];
  initialProducts: HomeProduct[];
  initialCurrency: AppCurrency;
  limit?: number;
};

const ALL_CATEGORY_ID = 'all';

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

function formatMoney(value: number, currency: string, locale: string) {
  const normalizedLocale = locale === 'my' ? 'my-MM' : 'en-US';
  const amount = currency === 'USD' ? value / 100 : value;
  return new Intl.NumberFormat(normalizedLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount);
}

function mapProduct(item: ProductItem): HomeProduct {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    categoryId: item.categoryId,
    imageUrl: item.images[0]?.url ?? null,
    price: item.variants[0]?.price ?? null,
    currency: item.variants[0]?.currency ?? null,
    variants: item.variants
  };
}

export default function HomeCatalogSection({
  locale,
  categories,
  initialProducts,
  initialCurrency,
  limit = 12
}: HomeCatalogSectionProps) {
  const { accessToken } = useAuthSession();
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORY_ID);
  const [categoryOptions, setCategoryOptions] = useState<HomeCategory[]>(categories);
  const [products, setProducts] = useState<HomeProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wishlistProductIds, setWishlistProductIds] = useState<string[]>([]);
  const [pickerProduct, setPickerProduct] = useState<HomeProduct | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<AppCurrency>(
    normalizeCurrencyCode(initialCurrency)
  );
  const requestSeqRef = useRef(0);
  const cacheRef = useRef<Map<string, HomeProduct[]>>(
    initialProducts.length > 0 ? new Map([[ALL_CATEGORY_ID, initialProducts]]) : new Map()
  );
  const loadedCategoryKeysRef = useRef<Set<string>>(
    initialProducts.length > 0 ? new Set([ALL_CATEGORY_ID]) : new Set()
  );

  useEffect(() => {
    if (initialProducts.length > 0) {
      cacheRef.current.set(ALL_CATEGORY_ID, initialProducts);
      loadedCategoryKeysRef.current.add(ALL_CATEGORY_ID);
    } else {
      cacheRef.current.delete(ALL_CATEGORY_ID);
      loadedCategoryKeysRef.current.delete(ALL_CATEGORY_ID);
    }
    if (selectedCategoryId === ALL_CATEGORY_ID) {
      setProducts(initialProducts);
    }
  }, [initialProducts, selectedCategoryId]);

  useEffect(() => {
    if (categories.length > 0) {
      setCategoryOptions(categories);
      return;
    }

    let alive = true;
    listCategories({ locale })
      .then((response) => {
        if (!alive) {
          return;
        }
        setCategoryOptions(
          response.items.map((item) => ({
            id: item.id,
            slug: item.slug,
            name: item.name || item.en_name || item.mm_name || 'Category'
          }))
        );
      })
      .catch(() => {
        if (alive) {
          setCategoryOptions([]);
        }
      });

    return () => {
      alive = false;
    };
  }, [categories, locale]);

  useEffect(() => {
    const syncFromCookie = () => {
      setSelectedCurrency(getClientCurrencyPreference());
    };

    syncFromCookie();

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AppCurrency>).detail;
      setSelectedCurrency(normalizeCurrencyCode(detail));
    };

    window.addEventListener(CURRENCY_PREFERENCE_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(CURRENCY_PREFERENCE_CHANGED_EVENT, handler);
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
    let alive = true;
    const categoryKey = selectedCategoryId || ALL_CATEGORY_ID;
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    const hasLoaded = loadedCategoryKeysRef.current.has(categoryKey);
    const cached = cacheRef.current.get(categoryKey);

    if (hasLoaded) {
      setProducts(cached ?? []);
      setError(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    listProducts({
      categoryId: categoryKey === ALL_CATEGORY_ID ? undefined : categoryKey,
      limit,
      locale
    })
      .then((response) => {
        if (!alive || requestSeqRef.current !== seq) {
          return;
        }
        const activeItems = response.items
          .filter((item) => item.status === 'ACTIVE')
          .map(mapProduct);
        cacheRef.current.set(categoryKey, activeItems);
        loadedCategoryKeysRef.current.add(categoryKey);
        setProducts(activeItems);
      })
      .catch(() => {
        if (!alive || requestSeqRef.current !== seq) {
          return;
        }
        setError('Failed to load products for this category.');
      })
      .finally(() => {
        if (alive && requestSeqRef.current === seq) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [selectedCategoryId, limit, locale, reloadToken]);

  function onAddToCart(product: HomeProduct) {
    if (product.variants.length === 0) {
      setNotice('This product is not purchasable right now.');
      return;
    }

    if (!accessToken) {
      setNotice('Please login first to add products to cart.');
      router.push(`/${locale}/login`);
      return;
    }

    setPickerProduct(product);
  }

  async function onConfirmAddToCart(input: { variantId: string; qty: number }) {
    if (!accessToken || !pickerProduct) {
      return;
    }

    try {
      await addCartItem(input, accessToken);
      notifyHeaderCountsRefresh();
      setNotice(`Added "${pickerProduct.title}" to cart.`);
      setPickerProduct(null);
      router.push(`/${locale}/cart`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setNotice('Single-vendor cart only. Clear cart before adding another vendor product.');
        setPickerProduct(null);
        router.push(`/${locale}/cart`);
      } else {
        setNotice('Failed to add product to cart.');
      }
    }
  }

  async function onToggleWishlist(product: HomeProduct) {
    if (!accessToken) {
      setNotice('Please login first to save product.');
      router.push(`/${locale}/login`);
      return;
    }

    const saved = wishlistProductIds.includes(product.id);
    try {
      if (saved) {
        await removeWishlistItem(product.id, accessToken);
        setWishlistProductIds((prev) => prev.filter((id) => id !== product.id));
        notifyHeaderCountsRefresh();
        setNotice('Removed from wishlist.');
      } else {
        await addWishlistItem(product.id, accessToken);
        setWishlistProductIds((prev) => [...prev, product.id]);
        notifyHeaderCountsRefresh();
        setNotice('Saved to wishlist.');
      }
    } catch {
      setNotice('Failed to update wishlist.');
    }
  }

  const selectedCategoryName =
    selectedCategoryId === ALL_CATEGORY_ID
      ? 'All Categories'
      : categoryOptions.find((category) => category.id === selectedCategoryId)?.name ?? 'Category';

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const productCurrency = normalizeCurrencyCode(
          product.currency ?? product.variants[0]?.currency
        );
        return productCurrency === selectedCurrency;
      }),
    [products, selectedCurrency]
  );
  const productsToRender = visibleProducts.length > 0 ? visibleProducts : products;
  const showingCurrencyFallback = visibleProducts.length === 0 && products.length > 0;

  return (
    <section className="space-y-5">
      <div id="categories" className="sticky top-[70px] z-20 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dbe2ff]/80 bg-white/90 px-4 py-3 backdrop-blur">
          <h2 className="text-2xl font-semibold text-[#181f46]">Category</h2>
          <p className="text-sm font-medium text-[#566092]">
            {selectedCategoryName} · {selectedCurrency}
          </p>
        </div>

        <div className="overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max items-center gap-2 pr-2">
            <button
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedCategoryId === ALL_CATEGORY_ID
                  ? 'border-[#3654c5] bg-[#3654c5] text-white shadow-sm'
                  : 'border-[#d9e2ff] bg-white text-[#25315f] hover:border-[#adc0ff] hover:bg-[#f7f9ff]'
              }`}
              onClick={() => setSelectedCategoryId(ALL_CATEGORY_ID)}
              type="button"
            >
              All
            </button>
            {categoryOptions.map((category) => (
              <button
                key={category.id}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedCategoryId === category.id
                    ? 'border-[#3654c5] bg-[#3654c5] text-white shadow-sm'
                    : 'border-[#d9e2ff] bg-white text-[#25315f] hover:border-[#adc0ff] hover:bg-[#f7f9ff]'
                }`}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="products" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-[#181f46]">Products</h2>
          <div className="flex items-center gap-3">
            {loading ? <span className="text-xs font-medium text-[#5a6ba5]">Loading...</span> : null}
            <Link className="text-sm font-semibold text-[#3550be] hover:underline" href={`/${locale}/products`}>
              Browse full catalog
            </Link>
          </div>
        </div>

        {notice ? <p className="text-sm text-[#3956b8]">{notice}</p> : null}
        {showingCurrencyFallback ? (
          <p className="text-sm text-[#5b6796]">
            No products in {selectedCurrency} for this category. Showing all currencies.
          </p>
        ) : null}

        {error ? (
          <div className="surface flex items-center justify-between gap-3 p-4 text-sm text-[#c23046]">
            <span>{error}</span>
            <button
              className="rounded-lg border border-[#f0b8c2] bg-white px-3 py-1.5 text-xs font-semibold text-[#a51f34]"
              onClick={() => {
                const key = selectedCategoryId || ALL_CATEGORY_ID;
                cacheRef.current.delete(key);
                loadedCategoryKeysRef.current.delete(key);
                setReloadToken((value) => value + 1);
              }}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : null}

        {loading && productsToRender.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`skeleton-${index + 1}`} className="surface animate-pulse overflow-hidden">
                <div className="h-40 bg-[#e9efff]" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-[#e3e9ff]" />
                  <div className="h-3 w-full rounded bg-[#edf1ff]" />
                  <div className="h-3 w-5/6 rounded bg-[#edf1ff]" />
                  <div className="h-4 w-1/3 rounded bg-[#e3e9ff]" />
                </div>
              </div>
            ))}
          </div>
        ) : productsToRender.length > 0 ? (
          <div className={`grid gap-4 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-70' : 'opacity-100'}`}>
            {productsToRender.map((product) => (
              <article
                key={product.id}
                className="surface group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(34,52,122,0.12)]"
              >
                <div className="relative h-40 bg-gradient-to-br from-[#cbf3dc] via-[#d9ebff] to-[#f2ddff]">
                  <button
                    aria-label={wishlistProductIds.includes(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                    className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur ${
                      wishlistProductIds.includes(product.id)
                        ? 'border-[#ffb0be] bg-[#fff2f5] text-[#d93a54]'
                        : 'border-white/70 bg-white/85 text-[#33417b]'
                    }`}
                    onClick={() => onToggleWishlist(product)}
                    type="button"
                  >
                    <HeartIcon filled={wishlistProductIds.includes(product.id)} />
                  </button>
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      src={product.imageUrl}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm font-semibold text-[#375a8f]">Eco Product</div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-1 text-base font-semibold text-[#171d44]">{product.title}</h3>
                  <p className="line-clamp-2 text-sm text-[#5d6486]">{product.description}</p>
                  {product.price !== null && product.currency ? (
                    <p className="text-sm font-semibold text-[#1f7a4c]">
                      {formatMoney(product.price, product.currency, locale)}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-[#b26d00]">Contact for price</p>
                  )}
                  <Link
                    className="inline-flex rounded-lg border border-[#cad8ff] px-3 py-1.5 text-xs font-semibold text-[#3654c5]"
                    href={`/${locale}/product/${product.id}`}
                  >
                    View Detail
                  </Link>
                  <button
                    className="ml-2 inline-flex rounded-lg bg-[#3654c5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2f4cb5]"
                    onClick={() => onAddToCart(product)}
                    type="button"
                  >
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="surface p-6 text-sm text-[#5d6486]">
            No products found for this category and currency.
          </div>
        )}
      </div>

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
