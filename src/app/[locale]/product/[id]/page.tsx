'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  addCartItem,
  addWishlistItem,
  getProduct,
  listWishlist,
  ProductVariant,
  removeWishlistItem,
} from '../../../../lib/api';
import { useAuthSession } from '../../../../lib/hooks/use-auth-session';
import { notifyHeaderCountsRefresh } from '../../../../lib/ui-events';

type ProductDetailPageProps = {
  params: { locale: string; id: string };
};

function formatMoney(amount: number, currency: string) {
  const value = amount / (currency === 'USD' ? 100 : 1);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MMK' ? 'MMK' : 'USD',
    maximumFractionDigits: currency === 'MMK' ? 0 : 2,
  }).format(value);
}

function variantLabel(variant: ProductVariant) {
  if (!variant.options || variant.options.length === 0) {
    return variant.sku;
  }
  return `${variant.options.map((item) => `${item.name}: ${item.value}`).join(' / ')} (${variant.sku})`;
}

export default function ProductDetailPage({ params: { locale, id } }: ProductDetailPageProps) {
  const router = useRouter();
  const { accessToken } = useAuthSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [product, setProduct] = useState<Awaited<ReturnType<typeof getProduct>> | null>(null);
  const [variantId, setVariantId] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProduct(id, { locale })
      .then((res) => {
        if (!alive) {
          return;
        }
        setProduct(res);
        setVariantId(res.variants[0]?.id ?? '');
        setError(null);
      })
      .catch(() => {
        if (alive) {
          setError('Product not found or unavailable.');
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
  }, [id, locale]);

  useEffect(() => {
    if (!accessToken || !product) {
      setSaved(false);
      return;
    }

    let alive = true;
    listWishlist(accessToken)
      .then((res) => {
        if (!alive) {
          return;
        }
        setSaved(res.items.some((item) => item.productId === product.id));
      })
      .catch(() => {
        if (alive) {
          setSaved(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [accessToken, product]);

  const selectedVariant = useMemo(
    () => product?.variants.find((item) => item.id === variantId) ?? product?.variants[0],
    [product, variantId],
  );

  async function onAddToCart() {
    if (!selectedVariant) {
      setMessage('No purchasable variant.');
      return;
    }
    if (!accessToken) {
      setMessage('Please login before adding to cart.');
      router.push(`/${locale}/login`);
      return;
    }
    if (qty < 1) {
      setMessage('Quantity must be at least 1.');
      return;
    }
    try {
      await addCartItem({ variantId: selectedVariant.id, qty }, accessToken);
      notifyHeaderCountsRefresh();
      setMessage('Added to cart.');
      setError(null);
      router.push(`/${locale}/cart`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('409')) {
        setMessage('Single-vendor cart only. Remove current cart items first.');
        router.push(`/${locale}/cart`);
      } else {
        setMessage('Failed to add to cart.');
      }
    }
  }

  async function onToggleSaved() {
    if (!product) {
      return;
    }
    if (!accessToken) {
      setMessage('Please login first.');
      router.push(`/${locale}/login`);
      return;
    }
    try {
      if (saved) {
        await removeWishlistItem(product.id, accessToken);
        setSaved(false);
        notifyHeaderCountsRefresh();
        setMessage('Removed from wishlist.');
      } else {
        await addWishlistItem(product.id, accessToken);
        setSaved(true);
        notifyHeaderCountsRefresh();
        setMessage('Saved to wishlist.');
      }
    } catch {
      setMessage('Failed to update wishlist.');
    }
  }

  if (loading) {
    return <section className="surface p-6 text-sm text-[#58608a]">Loading product...</section>;
  }

  if (!product || error) {
    return (
      <section className="surface p-6">
        <p className="text-sm text-[#b12f43]">{error ?? 'Product unavailable.'}</p>
        <Link className="mt-4 inline-flex text-sm font-semibold text-[#3550c0] underline" href={`/${locale}/products`}>
          Back to products
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="surface overflow-hidden p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-[#d8e1ff] bg-[#f2f6ff]">
              {product.images[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={product.title} className="h-[320px] w-full object-cover" src={product.images[0].url} />
              ) : (
                <div className="grid h-[320px] place-items-center text-sm text-[#69729b]">No image</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 4).map((image) => (
                <div key={image.id} className="overflow-hidden rounded-xl border border-[#d9e2ff] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={image.altText ?? product.title} className="h-20 w-full object-cover" src={image.url} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#6270a6]">{product.category?.name ?? 'Catalog'}</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#171e44]">{product.title}</h1>
              <p className="mt-2 text-sm leading-6 text-[#596389]">{product.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(product.tags ?? []).map((tag) => (
                <span key={tag.id} className="chip bg-[#eef3ff] text-[#44539a]">
                  {tag.tag?.name ?? tag.tagId}
                </span>
              ))}
            </div>

            <div className="rounded-2xl border border-[#d7e0ff] bg-[#f8faff] p-4">
              <label className="block text-sm font-medium text-[#334177]">
                Variant
                <select
                  className="mt-2 w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm text-[#1d2551]"
                  value={selectedVariant?.id ?? ''}
                  onChange={(event) => setVariantId(event.target.value)}
                >
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variantLabel(variant)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="block text-sm font-medium text-[#334177]">
                  Quantity
                  <input
                    className="mt-2 w-full rounded-xl border border-[#cfd9ff] bg-white px-3 py-2 text-sm text-[#1d2551]"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(event) => setQty(Number(event.target.value))}
                  />
                </label>
                <div className="rounded-xl border border-[#d3dcff] bg-white px-4 py-3 text-right">
                  <p className="text-xs text-[#60709e]">Price</p>
                  <p className="text-lg font-semibold text-[#17204d]">
                    {selectedVariant
                      ? formatMoney(selectedVariant.price, selectedVariant.currency)
                      : '-'}
                  </p>
                  <p className="text-xs text-[#60709e]">Stock {selectedVariant?.stockQty ?? 0}</p>
                </div>
              </div>
            </div>

            {message ? <p className="text-sm text-[#2a4ea0]">{message}</p> : null}

            <div className="grid gap-2 sm:grid-cols-3">
              <button className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold" onClick={onAddToCart} type="button">
                Add to cart
              </button>
              <button
                className={
                  saved
                    ? 'rounded-xl border border-[#f3b4c0] bg-[#fff0f3] px-4 py-2 text-sm font-semibold text-[#b73249]'
                    : 'rounded-xl border border-[#c7d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#3349ad]'
                }
                onClick={onToggleSaved}
                type="button"
              >
                {saved ? 'Saved' : 'Save'}
              </button>
              <Link
                className="rounded-xl border border-[#c7d4ff] bg-white px-4 py-2 text-center text-sm font-semibold text-[#3349ad]"
                href={`/${locale}/cart`}
              >
                Go to cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
